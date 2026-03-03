package dns

import (
	"log"
	"net"

	"github.com/miekg/dns"
	"github.com/truspositif/dns/internal/cache"
	"github.com/truspositif/dns/internal/metrics"
)

// Server wraps a miekg/dns server instance.
type Server struct {
	listenAddr  string
	upstreamDNS string
	redirectIP  string
}

func New(listenAddr, upstreamDNS, redirectIP string) *Server {
	return &Server{
		listenAddr:  listenAddr,
		upstreamDNS: upstreamDNS,
		redirectIP:  redirectIP,
	}
}

// Start launches the DNS server (UDP + TCP) and blocks.
func (s *Server) Start() {
	mux := dns.NewServeMux()
	mux.HandleFunc(".", s.handleQuery)

	// UDP
	go func() {
		srv := &dns.Server{Addr: s.listenAddr, Net: "udp", Handler: mux}
		log.Printf("dns: UDP listening on %s", s.listenAddr)
		if err := srv.ListenAndServe(); err != nil {
			log.Fatalf("dns: UDP server error: %v", err)
		}
	}()

	// TCP
	srv := &dns.Server{Addr: s.listenAddr, Net: "tcp", Handler: mux}
	log.Printf("dns: TCP listening on %s", s.listenAddr)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("dns: TCP server error: %v", err)
	}
}

func (s *Server) handleQuery(w dns.ResponseWriter, r *dns.Msg) {
	metrics.IncTotalQueries()

	msg := new(dns.Msg)
	msg.SetReply(r)
	msg.Authoritative = false

	for _, q := range r.Question {
		if q.Qtype != dns.TypeA && q.Qtype != dns.TypeAAAA {
			// Pass non-A/AAAA queries upstream
			metrics.IncForwarded()
			s.proxy(w, r)
			return
		}

		domain := trimDot(q.Name)
		if s.isBlocked(domain) {
			metrics.IncBlocked()
			log.Printf("dns: BLOCKED %s → %s", domain, s.redirectIP)
			rr := &dns.A{
				Hdr: dns.RR_Header{
					Name:   q.Name,
					Rrtype: dns.TypeA,
					Class:  dns.ClassINET,
					Ttl:    60,
				},
				A: net.ParseIP(s.redirectIP).To4(),
			}
			msg.Answer = append(msg.Answer, rr)
			w.WriteMsg(msg)
			return
		}
	}

	// Not blocked — forward upstream
	metrics.IncForwarded()
	s.proxy(w, r)
}

// isBlocked checks the two-layer cache (L1 sync.Map → L2 Redis).
// No DB hit on the hot path — keeps DNS answer latency <1 ms at ISP scale.
func (s *Server) isBlocked(domain string) bool {
	return cache.IsBlocked(domain)
}

// proxy forwards the query to the upstream DNS resolver.
func (s *Server) proxy(w dns.ResponseWriter, r *dns.Msg) {
	c := new(dns.Client)
	resp, _, err := c.Exchange(r, s.upstreamDNS)
	if err != nil {
		dns.HandleFailed(w, r)
		return
	}
	w.WriteMsg(resp)
}

func trimDot(s string) string {
	if len(s) > 0 && s[len(s)-1] == '.' {
		return s[:len(s)-1]
	}
	return s
}
