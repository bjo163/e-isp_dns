// Package metrics provides lightweight, lock-free atomic counters for
// real-time DNS server statistics.  Counters are safe for concurrent use
// from multiple goroutines (DNS handler + HTTP API).
//
// Usage:
//
//	metrics.IncTotalQueries()
//	metrics.IncBlocked()
//	snap := metrics.Snapshot()   // returns a JSON-friendly struct
package metrics

import (
	"sync/atomic"
	"time"
)

// ── Atomic counters ──────────────────────────────────────────────────────────

var (
	totalQueries  atomic.Uint64
	blockedCount  atomic.Uint64
	forwardedCount atomic.Uint64
	cacheL1Hits   atomic.Uint64
	cacheL2Hits   atomic.Uint64
	cacheMisses   atomic.Uint64
	interceptCount atomic.Uint64
	startedAt     = time.Now()
)

// ── Increment helpers ────────────────────────────────────────────────────────

func IncTotalQueries()  { totalQueries.Add(1) }
func IncBlocked()       { blockedCount.Add(1) }
func IncForwarded()     { forwardedCount.Add(1) }
func IncCacheL1Hit()    { cacheL1Hits.Add(1) }
func IncCacheL2Hit()    { cacheL2Hits.Add(1) }
func IncCacheMiss()     { cacheMisses.Add(1) }
func IncIntercept()     { interceptCount.Add(1) }

// ── Snapshot ─────────────────────────────────────────────────────────────────

// Stats is the JSON response returned by the /metrics endpoint.
type Stats struct {
	TotalQueries   uint64  `json:"total_queries"`
	Blocked        uint64  `json:"blocked"`
	Forwarded      uint64  `json:"forwarded"`
	CacheL1Hits    uint64  `json:"cache_l1_hits"`
	CacheL2Hits    uint64  `json:"cache_l2_hits"`
	CacheMisses    uint64  `json:"cache_misses"`
	CacheHitRate   float64 `json:"cache_hit_rate"`
	Intercepted    uint64  `json:"intercepted"`
	BlockedDomains uint64  `json:"blocked_domains"`
	UptimeSeconds  int64   `json:"uptime_seconds"`
}

// blockedDomainsCounter can be set by cache package after Reload.
var blockedDomainsCount atomic.Uint64

func SetBlockedDomains(n uint64) { blockedDomainsCount.Store(n) }

// Snapshot returns a point-in-time copy of all counters.
func Snapshot() Stats {
	tq := totalQueries.Load()
	bl := blockedCount.Load()
	fw := forwardedCount.Load()
	l1 := cacheL1Hits.Load()
	l2 := cacheL2Hits.Load()
	ms := cacheMisses.Load()

	total := l1 + l2 + ms
	var hitRate float64
	if total > 0 {
		hitRate = float64(l1+l2) / float64(total) * 100
	}

	return Stats{
		TotalQueries:   tq,
		Blocked:        bl,
		Forwarded:      fw,
		CacheL1Hits:    l1,
		CacheL2Hits:    l2,
		CacheMisses:    ms,
		CacheHitRate:   hitRate,
		Intercepted:    interceptCount.Load(),
		BlockedDomains: blockedDomainsCount.Load(),
		UptimeSeconds:  int64(time.Since(startedAt).Seconds()),
	}
}
