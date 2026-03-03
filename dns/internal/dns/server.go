package dns

import (
	"fmt"
	"log"
	"net"
	"strings"
	"time"

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
	start := time.Now()
	metrics.IncTotalQueries()

	msg := new(dns.Msg)
	msg.SetReply(r)
	msg.Authoritative = false

	// Resolve client IP for logging + ACL
	clientIP := ""
	if addr := w.RemoteAddr(); addr != nil {
		if host, _, err := net.SplitHostPort(addr.String()); err == nil {
			clientIP = host
		}
	}

	for _, q := range r.Question {
		qtype := dns.TypeToString[q.Qtype]
		if qtype == "" {
			qtype = "OTHER"
		}
		domain := trimDot(q.Name)

		// ── 1. Custom DNS records (highest priority — like HestiaCP zone editor)
		if recs := cache.LookupRecords(domain, qtype); len(recs) > 0 {
			msg.Authoritative = true
			for _, rec := range recs {
				if rr := buildRR(q.Name, qtype, rec); rr != nil {
					msg.Answer = append(msg.Answer, rr)
				}
			}
			latUs := time.Since(start).Microseconds()
			metrics.RecordLatency(latUs)
			w.WriteMsg(msg)
			metrics.LogQuery(metrics.QueryLog{
				Ts: time.Now().UnixMilli(), Domain: domain, QType: qtype,
				Action: "custom", LatencyUs: latUs, Client: clientIP,
			})
			return
		}

		// ── 2. Only check blocking for A/AAAA queries
		if q.Qtype != dns.TypeA && q.Qtype != dns.TypeAAAA {
			metrics.IncForwarded()
			s.proxyAndRecord(w, r, start, domain, qtype, clientIP)
			return
		}

		// ── 3. ACL check — category-aware blocking
		acl, aclFound := cache.GetClientACL(clientIP)
		if aclFound {
			if acl.Action == "allow" {
				// Explicitly allowed client — bypass all blocking, forward upstream
				metrics.IncForwarded()
				s.proxyAndRecord(w, r, start, domain, qtype, clientIP)
				return
			}
			// action == "block"
			if len(acl.BlockedCategories) == 0 {
				// No categories → block ALL DNS
				metrics.IncBlocked()
				s.respondBlocked(w, msg, q.Name, start, domain, qtype, clientIP, "acl_blocked")
				return
			}
			// Has categories → only block matching domains
			if s.isBlocked(domain) {
				_, cat := cache.Lookup(domain)
				if s.categoryMatch(cat, acl.BlockedCategories) {
					metrics.IncBlocked()
					s.respondBlocked(w, msg, q.Name, start, domain, qtype, clientIP, "blocked")
					return
				}
			}
			// Domain not in blocked list or category not matched → forward
			metrics.IncForwarded()
			s.proxyAndRecord(w, r, start, domain, qtype, clientIP)
			return
		}

		// No ACL entry — apply default policy
		if !cache.GetACLDefault() {
			// Default-deny — block all unknown clients
			metrics.IncBlocked()
			s.respondBlocked(w, msg, q.Name, start, domain, qtype, clientIP, "acl_blocked")
			return
		}

		// ── 4. Domain blocklist check (default-allow + no ACL entry)
		if s.isBlocked(domain) {
			metrics.IncBlocked()
			s.respondBlocked(w, msg, q.Name, start, domain, qtype, clientIP, "blocked")
			return
		}
	}

	// Not blocked — forward upstream
	metrics.IncForwarded()
	domain := ""
	qtype := "A"
	if len(r.Question) > 0 {
		domain = trimDot(r.Question[0].Name)
		if t := dns.TypeToString[r.Question[0].Qtype]; t != "" {
			qtype = t
		}
	}
	s.proxyAndRecord(w, r, start, domain, qtype, clientIP)
}

// proxyAndRecord forwards upstream and records latency + query log.
func (s *Server) proxyAndRecord(w dns.ResponseWriter, r *dns.Msg, start time.Time, domain, qtype, clientIP string) {
	s.proxy(w, r)
	latUs := time.Since(start).Microseconds()
	metrics.RecordLatency(latUs)
	metrics.LogQuery(metrics.QueryLog{
		Ts: time.Now().UnixMilli(), Domain: domain, QType: qtype,
		Action: "forwarded", LatencyUs: latUs, Client: clientIP,
	})
}

// respondBlocked sends a redirect A record and logs the action.
func (s *Server) respondBlocked(w dns.ResponseWriter, msg *dns.Msg, qname string, start time.Time, domain, qtype, clientIP, action string) {
	rr := &dns.A{
		Hdr: dns.RR_Header{Name: qname, Rrtype: dns.TypeA, Class: dns.ClassINET, Ttl: 60},
		A:   net.ParseIP(s.redirectIP).To4(),
	}
	msg.Answer = append(msg.Answer, rr)
	latUs := time.Since(start).Microseconds()
	metrics.RecordLatency(latUs)
	w.WriteMsg(msg)
	metrics.LogQuery(metrics.QueryLog{
		Ts: time.Now().UnixMilli(), Domain: domain, QType: qtype,
		Action: action, LatencyUs: latUs, Client: clientIP,
	})
}

// categoryMatch checks if cat appears in the allowed categories list.
func (s *Server) categoryMatch(cat string, categories []string) bool {
	if cat == "" {
		return false
	}
	for _, c := range categories {
		if strings.EqualFold(c, cat) {
			return true
		}
	}
	return false
}

// isBlocked checks the two-layer cache (L1 sync.Map → L2 Redis).
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

// buildRR creates a dns.RR from a custom record value.
func buildRR(name, qtype string, rec cache.RecordVal) dns.RR {
	hdr := dns.RR_Header{Name: name, Class: dns.ClassINET, Ttl: rec.TTL}
	switch strings.ToUpper(qtype) {
	case "A":
		hdr.Rrtype = dns.TypeA
		ip := net.ParseIP(rec.Value).To4()
		if ip == nil {
			return nil
		}
		return &dns.A{Hdr: hdr, A: ip}
	case "AAAA":
		hdr.Rrtype = dns.TypeAAAA
		ip := net.ParseIP(rec.Value).To16()
		if ip == nil {
			return nil
		}
		return &dns.AAAA{Hdr: hdr, AAAA: ip}
	case "CNAME":
		hdr.Rrtype = dns.TypeCNAME
		return &dns.CNAME{Hdr: hdr, Target: dns.Fqdn(rec.Value)}
	case "MX":
		hdr.Rrtype = dns.TypeMX
		return &dns.MX{Hdr: hdr, Preference: rec.Priority, Mx: dns.Fqdn(rec.Value)}
	case "TXT":
		hdr.Rrtype = dns.TypeTXT
		return &dns.TXT{Hdr: hdr, Txt: []string{rec.Value}}
	case "NS":
		hdr.Rrtype = dns.TypeNS
		return &dns.NS{Hdr: hdr, Ns: dns.Fqdn(rec.Value)}
	case "PTR":
		hdr.Rrtype = dns.TypePTR
		return &dns.PTR{Hdr: hdr, Ptr: dns.Fqdn(rec.Value)}
	case "SRV":
		hdr.Rrtype = dns.TypeSRV
		// Value format: "weight port target", e.g. "10 5060 sip.example.com"
		parts := strings.Fields(rec.Value)
		if len(parts) < 3 {
			return nil
		}
		var weight, port uint16
		fmt.Sscanf(parts[0], "%d", &weight)
		fmt.Sscanf(parts[1], "%d", &port)
		return &dns.SRV{Hdr: hdr, Priority: rec.Priority, Weight: weight, Port: port, Target: dns.Fqdn(parts[2])}
	}
	return nil
}

func trimDot(s string) string {
	if len(s) > 0 && s[len(s)-1] == '.' {
		return s[:len(s)-1]
	}
	return s
}
