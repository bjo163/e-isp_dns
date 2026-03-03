// Package intercept runs a plain-HTTP server on :80 (or any configured port).
// When a user's browser is redirected by DNS to this server, we read the Host
// header to identify the blocked domain, look up its reason/category in the DB,
// then issue a 302 redirect to the configured block-page URL with query params:
//
//	?domain=blocked.com&reason=<reason>&cat=<category>
package intercept

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"strings"

	"github.com/truspositif/dns/internal/cache"
	"github.com/truspositif/dns/internal/metrics"
)

// Server is the HTTP intercept server.
type Server struct {
	// ListenAddr is the address to bind to, e.g. ":80".
	ListenAddr string
	// BlockPageURL is the base URL of the Next.js block page,
	// e.g. "http://192.168.1.1:3000".  Query params are appended automatically.
	BlockPageURL string
}

func New(listenAddr, blockPageURL string) *Server {
	return &Server{ListenAddr: listenAddr, BlockPageURL: blockPageURL}
}

// Start binds the intercept server (blocking).  Call in a goroutine.
func (s *Server) Start() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", s.handle)

	log.Printf("intercept: HTTP listening on %s → redirect to %s", s.ListenAddr, s.BlockPageURL)
	if err := http.ListenAndServe(s.ListenAddr, mux); err != nil {
		log.Fatalf("intercept: %v", err)
	}
}

func (s *Server) handle(w http.ResponseWriter, r *http.Request) {
	metrics.IncIntercept()

	// Extract the bare hostname from the Host header (strip port if present).
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	host = strings.ToLower(strings.TrimPrefix(host, "www."))

	reason, category := s.lookupDomain(host)

	// If block page URL is not configured, serve a minimal HTML fallback.
	if s.BlockPageURL == "" {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprintf(w, "<h1>403 — Akses Diblokir</h1><p>%s</p>", host)
		return
	}

	// Build redirect target with query params.
	params := url.Values{}
	if host != "" {
		params.Set("domain", host)
	}
	if reason != "" {
		params.Set("reason", reason)
	}
	if category != "" {
		params.Set("cat", category)
	}

	target := s.BlockPageURL
	if q := params.Encode(); q != "" {
		target += "/?" + q
	}

	http.Redirect(w, r, target, http.StatusFound)
}

// lookupDomain returns reason and category from the two-layer cache.
func (s *Server) lookupDomain(domain string) (reason, category string) {
	return cache.Lookup(domain)
}
