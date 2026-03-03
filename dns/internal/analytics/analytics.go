// Package analytics persists DNS query logs to SQLite for historical
// analytics (top-blocked domains, query history charts).
//
// It reads from the metrics.LogQuery channel via a secondary subscription
// and batch-inserts every 5 seconds.  A daily purge removes entries older
// than the configured retention period.
package analytics

import (
	"log"
	"sync"
	"time"

	"github.com/truspositif/dns/internal/metrics"
	"github.com/truspositif/dns/internal/models"
	"gorm.io/gorm"
)

var (
	database      *gorm.DB
	retentionDays = 7
	buf           []models.QueryLogEntry
	bufMu         sync.Mutex
)

// Start begins the analytics background goroutines:
//   - logDrain: reads from metrics query-log channel and buffers entries
//   - flusher:  batch-inserts buffered entries every 5 seconds
//   - purger:   deletes old entries on startup and once per day
func Start(db *gorm.DB) {
	database = db

	// Purge old entries on startup
	purgeOld()

	// Subscribe to metrics query log
	ch := metrics.SubscribeQueryLog()

	go logDrain(ch)
	go flusher()
	go purger()

	log.Printf("analytics: started (retention=%dd)", retentionDays)
}

// logDrain reads QueryLog entries from metrics and buffers them.
func logDrain(ch <-chan metrics.QueryLog) {
	for ql := range ch {
		entry := models.QueryLogEntry{
			Domain:    ql.Domain,
			QType:     ql.QType,
			Action:    ql.Action,
			Client:    ql.Client,
			LatencyUs: ql.LatencyUs,
			CreatedAt: time.UnixMilli(ql.Ts),
		}
		bufMu.Lock()
		buf = append(buf, entry)
		bufMu.Unlock()
	}
}

// flusher periodically writes buffered entries to SQLite.
func flusher() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		flush()
	}
}

func flush() {
	bufMu.Lock()
	if len(buf) == 0 {
		bufMu.Unlock()
		return
	}
	batch := buf
	buf = nil
	bufMu.Unlock()

	if err := database.CreateInBatches(batch, 500).Error; err != nil {
		log.Printf("analytics: flush error: %v", err)
	}
}

// purger runs daily cleanup.
func purger() {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		purgeOld()
	}
}

func purgeOld() {
	cutoff := time.Now().Add(-time.Duration(retentionDays) * 24 * time.Hour)
	result := database.Where("created_at < ?", cutoff).Delete(&models.QueryLogEntry{})
	if result.RowsAffected > 0 {
		log.Printf("analytics: purged %d entries older than %dd", result.RowsAffected, retentionDays)
	}
}

// ── Query functions for API ──────────────────────────────────────────────────

// TopEntry is a single row in a "top N" result.
type TopEntry struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// TopBlocked returns the top N blocked domains within a time period.
func TopBlocked(limit int, since time.Time) []TopEntry {
	var results []TopEntry
	database.Model(&models.QueryLogEntry{}).
		Select("domain as name, count(*) as count").
		Where("action = ? AND created_at >= ?", "blocked", since).
		Group("domain").Order("count desc").Limit(limit).
		Scan(&results)
	return results
}

// TopClients returns the top N querying client IPs within a time period.
func TopClients(limit int, since time.Time) []TopEntry {
	var results []TopEntry
	database.Model(&models.QueryLogEntry{}).
		Select("client as name, count(*) as count").
		Where("created_at >= ? AND client != ''", since).
		Group("client").Order("count desc").Limit(limit).
		Scan(&results)
	return results
}

// HistoryBucket is one time bucket for the history chart.
type HistoryBucket struct {
	Ts      int64 `json:"ts"`      // unix timestamp (start of bucket)
	Total   int64 `json:"total"`
	Blocked int64 `json:"blocked"`
}

// History returns aggregated query counts grouped by time buckets.
// bucketSec is the bucket size in seconds (e.g. 3600 for hourly).
func History(since time.Time, bucketSec int64) []HistoryBucket {
	var raw []struct {
		Bucket  int64
		Total   int64
		Blocked int64
	}

	database.Model(&models.QueryLogEntry{}).
		Select("(strftime('%s', created_at) / ? * ?) as bucket, count(*) as total, sum(case when action='blocked' then 1 else 0 end) as blocked", bucketSec, bucketSec).
		Where("created_at >= ?", since).
		Group("bucket").Order("bucket asc").
		Scan(&raw)

	out := make([]HistoryBucket, len(raw))
	for i, r := range raw {
		out[i] = HistoryBucket{Ts: r.Bucket, Total: r.Total, Blocked: r.Blocked}
	}
	return out
}

// Summary returns aggregate counts for a time period.
type Summary struct {
	TotalQueries  int64 `json:"total_queries"`
	BlockedCount  int64 `json:"blocked_count"`
	UniqueDomains int64 `json:"unique_domains"`
	UniqueClients int64 `json:"unique_clients"`
}

func GetSummary(since time.Time) Summary {
	var s Summary
	database.Model(&models.QueryLogEntry{}).Where("created_at >= ?", since).Count(&s.TotalQueries)
	database.Model(&models.QueryLogEntry{}).Where("action = ? AND created_at >= ?", "blocked", since).Count(&s.BlockedCount)
	database.Model(&models.QueryLogEntry{}).Where("created_at >= ?", since).Distinct("domain").Count(&s.UniqueDomains)
	database.Model(&models.QueryLogEntry{}).Where("created_at >= ? AND client != ''", since).Distinct("client").Count(&s.UniqueClients)
	return s
}

// ── Per-client stats ─────────────────────────────────────────────────────────

// ClientStat holds full per-client analytics.
type ClientStat struct {
	TotalQueries   int64           `json:"total_queries"`
	BlockedCount   int64           `json:"blocked_count"`
	ForwardedCount int64           `json:"forwarded_count"`
	TopDomains     []TopEntry      `json:"top_domains"`
	TopBlocked     []TopEntry      `json:"top_blocked"`
	History        []HistoryBucket `json:"history"`
}

// ClientStats returns detailed analytics for a specific client IP.
func ClientStats(clientIP string, limit int, since time.Time, bucketSec int64) ClientStat {
	var cs ClientStat

	// Total queries
	database.Model(&models.QueryLogEntry{}).
		Where("client = ? AND created_at >= ?", clientIP, since).
		Count(&cs.TotalQueries)

	// Blocked count
	database.Model(&models.QueryLogEntry{}).
		Where("client = ? AND action IN ? AND created_at >= ?", clientIP, []string{"blocked", "acl_blocked"}, since).
		Count(&cs.BlockedCount)

	// Forwarded count
	database.Model(&models.QueryLogEntry{}).
		Where("client = ? AND action = ? AND created_at >= ?", clientIP, "forwarded", since).
		Count(&cs.ForwardedCount)

	// Top domains (any action)
	database.Model(&models.QueryLogEntry{}).
		Select("domain as name, count(*) as count").
		Where("client = ? AND created_at >= ?", clientIP, since).
		Group("domain").Order("count desc").Limit(limit).
		Scan(&cs.TopDomains)

	// Top blocked domains
	database.Model(&models.QueryLogEntry{}).
		Select("domain as name, count(*) as count").
		Where("client = ? AND action IN ? AND created_at >= ?", clientIP, []string{"blocked", "acl_blocked"}, since).
		Group("domain").Order("count desc").Limit(limit).
		Scan(&cs.TopBlocked)

	// History buckets (reuse same strftime pattern)
	var raw []struct {
		Bucket  int64
		Total   int64
		Blocked int64
	}
	database.Model(&models.QueryLogEntry{}).
		Select("(strftime('%s', created_at) / ? * ?) as bucket, count(*) as total, sum(case when action IN ('blocked','acl_blocked') then 1 else 0 end) as blocked", bucketSec, bucketSec).
		Where("client = ? AND created_at >= ?", clientIP, since).
		Group("bucket").Order("bucket asc").
		Scan(&raw)

	cs.History = make([]HistoryBucket, len(raw))
	for i, r := range raw {
		cs.History[i] = HistoryBucket{Ts: r.Bucket, Total: r.Total, Blocked: r.Blocked}
	}

	return cs
}
