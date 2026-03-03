// Package metrics provides lightweight, lock-free atomic counters for
// real-time DNS server statistics.  Counters are safe for concurrent use
// from multiple goroutines (DNS handler + HTTP API).
//
// A background sampler runs every second, storing per-second deltas in an
// in-memory ring buffer (default 300 slots = 5 minutes).  The ring buffer
// is lock-free for the single writer (sampler goroutine) and uses a
// read-lock for concurrent readers (WebSocket broadcast).
//
// No disk I/O, no DB writes — zero overhead for DNS serving.
package metrics

import (
	"encoding/json"
	"sync"
	"sync/atomic"
	"time"
)

// ── Atomic counters ──────────────────────────────────────────────────────────

var (
	totalQueries   atomic.Uint64
	blockedCount   atomic.Uint64
	forwardedCount atomic.Uint64
	cacheL1Hits    atomic.Uint64
	cacheL2Hits    atomic.Uint64
	cacheMisses    atomic.Uint64
	interceptCount atomic.Uint64
	latencySumUs   atomic.Uint64 // cumulative latency in microseconds
	latencyCount   atomic.Uint64 // number of latency samples
	latencyMaxUs   atomic.Uint64 // max latency within current sample window
	startedAt      = time.Now()
)

// ── Increment helpers ────────────────────────────────────────────────────────

func IncTotalQueries()  { totalQueries.Add(1) }
func IncBlocked()       { blockedCount.Add(1) }
func IncForwarded()     { forwardedCount.Add(1) }
func IncCacheL1Hit()    { cacheL1Hits.Add(1) }
func IncCacheL2Hit()    { cacheL2Hits.Add(1) }
func IncCacheMiss()     { cacheMisses.Add(1) }
func IncIntercept()     { interceptCount.Add(1) }

// RecordLatency records a query latency in microseconds. Lock-free.
func RecordLatency(us int64) {
	if us < 0 {
		us = 0
	}
	latencySumUs.Add(uint64(us))
	latencyCount.Add(1)
	// CAS loop for max
	for {
		cur := latencyMaxUs.Load()
		if uint64(us) <= cur {
			break
		}
		if latencyMaxUs.CompareAndSwap(cur, uint64(us)) {
			break
		}
	}
}

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
	AvgLatencyMs   float64 `json:"avg_latency_ms"`
}

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

	lSum := latencySumUs.Load()
	lCnt := latencyCount.Load()
	var avgMs float64
	if lCnt > 0 {
		avgMs = float64(lSum) / float64(lCnt) / 1000.0
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
		AvgLatencyMs:   avgMs,
	}
}

// ── Time-series ring buffer ──────────────────────────────────────────────────
// Stores per-second deltas for the last N seconds (default 300 = 5 min).
// Single writer (sampler goroutine), multiple readers (WebSocket broadcast).

const RingSize = 300 // 5 minutes of 1-second samples

// Sample represents one second of metric deltas.
type Sample struct {
	Ts          int64   `json:"ts"` // unix timestamp
	QPS         uint64  `json:"qps"`
	BlockedPS   uint64  `json:"block_ps"`
	ForwardedPS uint64  `json:"fps"`
	CacheL1PS   uint64  `json:"l1ps"`
	CacheL2PS   uint64  `json:"l2ps"`
	MissPS      uint64  `json:"mps"`
	InterceptPS uint64  `json:"ips"`
	HitRate     float64 `json:"hr"`
	AvgMs       float64 `json:"avg_ms"` // avg response time (ms) this second
	MaxMs       float64 `json:"max_ms"` // max response time (ms) this second
}

// WsPayload is sent to WebSocket clients every tick.
type WsPayload struct {
	Stats  Stats      `json:"stats"`
	Series []Sample   `json:"series"`
	Logs   []QueryLog `json:"logs"`
}

// ── Recent query log (in-memory ring) ────────────────────────────────────────
// Non-blocking: DNS handler writes to a buffered channel, background goroutine
// stores in a small ring (200 entries).  If the channel is full the log entry
// is silently dropped — DNS latency is never affected.

const QueryLogSize = 200

// QueryLog represents a single DNS query for the admin live feed.
type QueryLog struct {
	Ts       int64  `json:"ts"`       // unix millis
	Domain   string `json:"domain"`
	QType    string `json:"qtype"`    // "A", "AAAA", etc.
	Action   string `json:"action"`   // "blocked", "forwarded"
	LatencyUs int64 `json:"latency_us"` // microseconds
	Client   string `json:"client"`   // client IP
}

var (
	qlog     [QueryLogSize]QueryLog
	qlogIdx  int
	qlogLen  int
	qlogMu   sync.RWMutex
	qlogCh   = make(chan QueryLog, 512) // buffered — DNS handler never blocks

	// Subscribers get a copy of every query log entry (for analytics persistence).
	subsMu   sync.Mutex
	subs     []chan QueryLog
)

// SubscribeQueryLog returns a channel that receives a copy of every QueryLog.
// The channel is buffered (1024) — if the subscriber is slow, entries are dropped.
func SubscribeQueryLog() <-chan QueryLog {
	ch := make(chan QueryLog, 1024)
	subsMu.Lock()
	subs = append(subs, ch)
	subsMu.Unlock()
	return ch
}

// LogQuery submits a query log entry. Non-blocking: if buffer is full the
// entry is silently discarded.  Call from the DNS handler hot path.
func LogQuery(ql QueryLog) {
	select {
	case qlogCh <- ql:
	default: // drop — never block the DNS handler
	}
}

// drainQueryLog runs in a background goroutine, reading from the channel
// and writing into the ring buffer.  Also fans out to analytics subscribers.
func drainQueryLog() {
	for ql := range qlogCh {
		qlogMu.Lock()
		qlog[qlogIdx] = ql
		qlogIdx = (qlogIdx + 1) % QueryLogSize
		if qlogLen < QueryLogSize {
			qlogLen++
		}
		qlogMu.Unlock()

		// Fan out to subscribers (analytics, etc.)
		subsMu.Lock()
		for _, ch := range subs {
			select {
			case ch <- ql:
			default: // slow subscriber — drop
			}
		}
		subsMu.Unlock()
	}
}

// RecentQueries returns the last N query log entries (newest-first).
func RecentQueries(n int) []QueryLog {
	qlogMu.RLock()
	defer qlogMu.RUnlock()

	if n > qlogLen {
		n = qlogLen
	}
	out := make([]QueryLog, n)
	for i := 0; i < n; i++ {
		// walk backwards from newest
		idx := (qlogIdx - 1 - i + QueryLogSize) % QueryLogSize
		out[i] = qlog[idx]
	}
	return out
}

var (
	ring    [RingSize]Sample
	ringIdx int
	ringLen int // how many slots have been written (max RingSize)
	ringMu  sync.RWMutex

	// previous counter values for delta computation
	prevTQ, prevBL, prevFW     uint64
	prevL1, prevL2, prevMS     uint64
	prevIC                     uint64
	prevLatSum, prevLatCnt     uint64
)

// Series returns a copy of the ring buffer contents (oldest-first).
func Series() []Sample {
	ringMu.RLock()
	defer ringMu.RUnlock()

	out := make([]Sample, 0, ringLen)
	if ringLen < RingSize {
		// buffer hasn't wrapped yet
		for i := 0; i < ringLen; i++ {
			out = append(out, ring[i])
		}
	} else {
		// wrapped — read from ringIdx (oldest) to ringIdx-1 (newest)
		for i := 0; i < RingSize; i++ {
			out = append(out, ring[(ringIdx+i)%RingSize])
		}
	}
	return out
}

// StartSampler begins the background 1-second sampler goroutine and the
// query-log drain goroutine.  Call once from main.go.
func StartSampler() {
	// seed previous values so the first delta is zero
	prevTQ = totalQueries.Load()
	prevBL = blockedCount.Load()
	prevFW = forwardedCount.Load()
	prevL1 = cacheL1Hits.Load()
	prevL2 = cacheL2Hits.Load()
	prevMS = cacheMisses.Load()
	prevIC = interceptCount.Load()
	prevLatSum = latencySumUs.Load()
	prevLatCnt = latencyCount.Load()

	// query-log channel → ring buffer
	go drainQueryLog()

	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			sample()
		}
	}()
}

func sample() {
	tq := totalQueries.Load()
	bl := blockedCount.Load()
	fw := forwardedCount.Load()
	l1 := cacheL1Hits.Load()
	l2 := cacheL2Hits.Load()
	ms := cacheMisses.Load()
	ic := interceptCount.Load()
	lSum := latencySumUs.Load()
	lCnt := latencyCount.Load()
	lMax := latencyMaxUs.Swap(0) // reset max for next window

	dL1 := l1 - prevL1
	dL2 := l2 - prevL2
	dMS := ms - prevMS
	total := dL1 + dL2 + dMS
	var hr float64
	if total > 0 {
		hr = float64(dL1+dL2) / float64(total) * 100
	}

	// Compute per-second average latency
	dLatSum := lSum - prevLatSum
	dLatCnt := lCnt - prevLatCnt
	var avgMs, maxMs float64
	if dLatCnt > 0 {
		avgMs = float64(dLatSum) / float64(dLatCnt) / 1000.0
	}
	maxMs = float64(lMax) / 1000.0

	s := Sample{
		Ts:          time.Now().Unix(),
		QPS:         tq - prevTQ,
		BlockedPS:   bl - prevBL,
		ForwardedPS: fw - prevFW,
		CacheL1PS:   dL1,
		CacheL2PS:   dL2,
		MissPS:      dMS,
		InterceptPS: ic - prevIC,
		HitRate:     hr,
		AvgMs:       avgMs,
		MaxMs:       maxMs,
	}

	prevTQ = tq
	prevBL = bl
	prevFW = fw
	prevL1 = l1
	prevL2 = l2
	prevMS = ms
	prevIC = ic
	prevLatSum = lSum
	prevLatCnt = lCnt

	ringMu.Lock()
	ring[ringIdx] = s
	ringIdx = (ringIdx + 1) % RingSize
	if ringLen < RingSize {
		ringLen++
	}
	ringMu.Unlock()

	// Notify WebSocket hub
	broadcastCh <- struct{}{}
}

// ── WebSocket hub ────────────────────────────────────────────────────────────
// Manages connected admin clients. Each tick sends the latest WsPayload.

type wsClient struct {
	send chan []byte
}

var (
	broadcastCh = make(chan struct{}, 1) // buffered so sampler never blocks
	registerCh  = make(chan *wsClient, 8)
	unregisterCh = make(chan *wsClient, 8)
)

// RunHub starts the WebSocket broadcast hub. Call once from main.go.
func RunHub() {
	go hub()
}

func hub() {
	clients := make(map[*wsClient]bool)
	for {
		select {
		case c := <-registerCh:
			clients[c] = true
		case c := <-unregisterCh:
			delete(clients, c)
			close(c.send)
		case <-broadcastCh:
			if len(clients) == 0 {
				continue // nobody listening — skip serialisation
			}
			payload := BuildPayload()
			for c := range clients {
				select {
				case c.send <- payload:
				default:
					// slow client — drop & disconnect
					delete(clients, c)
					close(c.send)
				}
			}
		}
	}
}

// BuildPayload creates the JSON bytes for a WsPayload.
func BuildPayload() []byte {
	p := WsPayload{
		Stats:  Snapshot(),
		Series: Series(),
		Logs:   RecentQueries(50), // last 50 queries
	}
	b, _ := json.Marshal(p)
	return b
}

// Register / Unregister a WebSocket client
func Register(c *wsClient) *wsClient   { registerCh <- c; return c }
func Unregister(c *wsClient)           { unregisterCh <- c }
func NewClient() *wsClient             { return &wsClient{send: make(chan []byte, 4)} }
func (c *wsClient) Send() <-chan []byte { return c.send }
