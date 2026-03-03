// Package cache provides a two-layer domain blocklist cache for production-grade
// DNS performance.
//
//   L1 — sync.RWMutex + map[string]struct{} (in-process, zero-allocation lookup)
//   L2 — Redis SET  (shared across replicas; ~0.1 ms round-trip)
//   L3 — SQLite     (source of truth, queried only on cold-start & cache miss)
//
// Throughput: a single Go process can answer >100 k DNS queries/sec with L1 alone.
// Redis allows multiple instances (e.g. primary + standby) to share the same
// blocklist without each hitting SQLite.
package cache

import (
	"context"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/truspositif/dns/internal/metrics"
	"gorm.io/gorm"
)

const (
	// Redis key: SET of all active blocked domains.
	rKeySet = "tp:blocked"
	// Redis key prefix for domain metadata: reason + category.
	// e.g. tp:meta:example.com → "Pornografi|Konten Terlarang"
	rKeyMeta = "tp:meta:"
)

var (
	rdb *redis.Client
	ctx = context.Background()

	// L1 in-process hot set — rebuilt from Redis on startup and on every mutation.
	l1   map[string]struct{}
	l1mu sync.RWMutex

	// metaCache caches reason/category for recently blocked domains.
	metaCache   map[string][2]string // domain → [reason, category]
	metaCacheMu sync.RWMutex
)

// Init connects to Redis and warms the L1 cache from the DB.
// redisURL may be empty — in that case only L1 (in-process) is used.
func Init(redisURL string, dbConn *gorm.DB) {
	metaCache = make(map[string][2]string)

	if redisURL != "" {
		opt, err := redis.ParseURL(redisURL)
		if err != nil {
			log.Printf("cache: invalid REDIS_URL, falling back to L1-only: %v", err)
		} else {
			rdb = redis.NewClient(opt)
			if err := rdb.Ping(ctx).Err(); err != nil {
				log.Printf("cache: Redis ping failed (%v), continuing L1-only", err)
				rdb = nil
			} else {
				log.Printf("cache: Redis connected at %s", redisURL)
			}
		}
	} else {
		log.Println("cache: REDIS_URL not set — running L1-only (single instance mode)")
	}

	Reload(dbConn)
}

// InitFromEnv reads REDIS_URL from the environment.
func InitFromEnv(dbConn *gorm.DB) {
	Init(os.Getenv("REDIS_URL"), dbConn)
}

// Reload rebuilds L1 (and optionally L2) from the database.
// Call this after any mutation to the blocked-domains table.
func Reload(dbConn *gorm.DB) {
	type row struct {
		Domain   string
		Reason   string
		Category string
	}
	var rows []row
	dbConn.Raw(
		"SELECT domain, reason, category FROM blocked_domains WHERE active = true",
	).Scan(&rows)

	newL1 := make(map[string]struct{}, len(rows))
	newMeta := make(map[string][2]string, len(rows))
	pipe := (func() redis.Pipeliner {
		if rdb == nil {
			return nil
		}
		return rdb.Pipeline()
	})()

	var redisMems []interface{}
	for _, r := range rows {
		d := strings.ToLower(r.Domain)
		newL1[d] = struct{}{}
		newMeta[d] = [2]string{r.Reason, r.Category}
		if pipe != nil {
			redisMems = append(redisMems, d)
			pipe.Set(ctx, rKeyMeta+d, r.Reason+"|"+r.Category, 24*time.Hour)
		}
	}

	if pipe != nil && len(redisMems) > 0 {
		// Replace the whole set atomically.
		pipe.Del(ctx, rKeySet)
		pipe.SAdd(ctx, rKeySet, redisMems...)
		pipe.Expire(ctx, rKeySet, 24*time.Hour)
		if _, err := pipe.Exec(ctx); err != nil {
			log.Printf("cache: Redis pipeline error: %v", err)
		}
	}

	l1mu.Lock()
	l1 = newL1
	l1mu.Unlock()

	metaCacheMu.Lock()
	metaCache = newMeta
	metaCacheMu.Unlock()

	metrics.SetBlockedDomains(uint64(len(rows)))
	log.Printf("cache: loaded %d active domains", len(rows))
}

// IsBlocked returns true if the domain (or any parent suffix) is in the blocklist.
// Lookup order: L1 → Redis → miss (no DB fallback to keep DNS latency <1 ms).
func IsBlocked(domain string) bool {
	domain = strings.ToLower(domain)
	// Check exact match + parent suffixes (sub.blocked.com → blocked.com → com)
	for d := domain; d != ""; d = nextParent(d) {
		// L1
		l1mu.RLock()
		_, hit := l1[d]
		l1mu.RUnlock()
		if hit {
			metrics.IncCacheL1Hit()
			return true
		}
		// L2 Redis
		if rdb != nil {
			if ok, _ := rdb.SIsMember(ctx, rKeySet, d).Result(); ok {
				metrics.IncCacheL2Hit()
				return true
			}
		}
	}
	metrics.IncCacheMiss()
	return false
}

// Lookup returns the reason and category for a blocked domain.
// Returns empty strings if not found.
func Lookup(domain string) (reason, category string) {
	domain = strings.ToLower(domain)
	for d := domain; d != ""; d = nextParent(d) {
		// L1 meta
		metaCacheMu.RLock()
		m, ok := metaCache[d]
		metaCacheMu.RUnlock()
		if ok {
			return m[0], m[1]
		}
		// L2 Redis
		if rdb != nil {
			if val, err := rdb.Get(ctx, rKeyMeta+d).Result(); err == nil {
				parts := strings.SplitN(val, "|", 2)
				if len(parts) == 2 {
					return parts[0], parts[1]
				}
				return parts[0], ""
			}
		}
	}
	return "", ""
}

// nextParent returns the immediate parent domain (strips leading label).
// "sub.example.com" → "example.com" → "com" → ""
func nextParent(d string) string {
	idx := strings.Index(d, ".")
	if idx < 0 || idx == len(d)-1 {
		return ""
	}
	return d[idx+1:]
}
