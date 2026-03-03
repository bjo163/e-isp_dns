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
	// Resolve client IP for logging + ACL
	clientIP := ""
	if addr := w.RemoteAddr(); addr != nil {
		if host, _, err := net.SplitHostPort(addr.String()); err == nil {
			clientIP = host
		}
	}

	resp := s.Resolve(r, clientIP)
	w.WriteMsg(resp)
}

// Resolve processes a DNS query and returns a response, suitable for DoH or standard DNS.
func (s *Server) Resolve(r *dns.Msg, clientIP string) *dns.Msg {
	start := time.Now()
	metrics.IncTotalQueries()

	msg := new(dns.Msg)
	msg.SetReply(r)
	msg.Authoritative = false

	for _, q := range r.Question {
		qtype := dns.TypeToString[q.Qtype]
		if qtype == "" {
			qtype = "OTHER"
		}
		domain := trimDot(q.Name)

		// ── 1. Custom DNS records
		if recs := cache.LookupRecords(domain, qtype); len(recs) > 0 {
			msg.Authoritative = true
			for _, rec := range recs {
				if rr := buildRR(q.Name, qtype, rec); rr != nil {
					msg.Answer = append(msg.Answer, rr)
				}
			}
			latUs := time.Since(start).Microseconds()
			metrics.RecordLatency(latUs)
			metrics.LogQuery(metrics.QueryLog{
				Ts: time.Now().UnixMilli(), Domain: domain, QType: qtype,
				Action: "custom", LatencyUs: latUs, Client: clientIP,
			})
			return msg
		}

		// ── 2. Only check blocking for A/AAAA queries
		if q.Qtype != dns.TypeA && q.Qtype != dns.TypeAAAA {
			metrics.IncForwarded()
			return s.proxyAndRecord(r, start, domain, qtype, clientIP)
		}
		qtypeN := q.Qtype

		// ── 3. Whitelist check
		if cache.IsWhitelisted(domain) {
			metrics.IncForwarded()
			return s.proxyAndRecord(r, start, domain, qtype, clientIP)
		}

		// ── 4. ACL check
		acl, aclFound := cache.GetClientACL(clientIP)
		if aclFound {
			if acl.Action == "allow" {
				metrics.IncForwarded()
				return s.proxyAndRecord(r, start, domain, qtype, clientIP)
			}
			if len(acl.BlockedCategories) == 0 {
				metrics.IncBlocked()
				return s.buildBlockedResponse(msg, q.Name, qtypeN, start, domain, qtype, clientIP, "acl_blocked")
			}
			if s.isBlocked(domain) {
				_, cat := cache.Lookup(domain)
				if s.categoryMatch(cat, acl.BlockedCategories) {
					metrics.IncBlocked()
					return s.buildBlockedResponse(msg, q.Name, qtypeN, start, domain, qtype, clientIP, "blocked")
				}
			}
			metrics.IncForwarded()
			return s.proxyAndRecord(r, start, domain, qtype, clientIP)
		}

		// No ACL entry — apply default policy
		if !cache.GetACLDefault() {
			metrics.IncBlocked()
			return s.buildBlockedResponse(msg, q.Name, qtypeN, start, domain, qtype, clientIP, "acl_blocked")
		}

		// ── 5. Domain blocklist check
		if s.isBlocked(domain) {
			metrics.IncBlocked()
			return s.buildBlockedResponse(msg, q.Name, qtypeN, start, domain, qtype, clientIP, "blocked")
		}
	}

	// Not blocked — forward upstream
	metrics.IncForwarded()
	qDomain := ""
	qType := "A"
	if len(r.Question) > 0 {
		qDomain = trimDot(r.Question[0].Name)
		if t := dns.TypeToString[r.Question[0].Qtype]; t != "" {
			qType = t
		}
	}
	return s.proxyAndRecord(r, start, qDomain, qType, clientIP)
}

func (s *Server) proxyAndRecord(r *dns.Msg, start time.Time, domain, qtype, clientIP string) *dns.Msg {
	resp := s.proxy(r)
	latUs := time.Since(start).Microseconds()
	metrics.RecordLatency(latUs)
	metrics.LogQuery(metrics.QueryLog{
		Ts: time.Now().UnixMilli(), Domain: domain, QType: qtype,
		Action: "forwarded", LatencyUs: latUs, Client: clientIP,
	})
	return resp
}

func (s *Server) buildBlockedResponse(msg *dns.Msg, qname string, qtype uint16, start time.Time, domain, qtypeStr, clientIP, action string) *dns.Msg {
	if qtype == dns.TypeAAAA {
		msg.Authoritative = true
	} else {
		rr := &dns.A{
			Hdr: dns.RR_Header{Name: qname, Rrtype: dns.TypeA, Class: dns.ClassINET, Ttl: 60},
			A:   net.ParseIP(s.redirectIP).To4(),
		}
		msg.Answer = append(msg.Answer, rr)
	}
	latUs := time.Since(start).Microseconds()
	metrics.RecordLatency(latUs)
	metrics.LogQuery(metrics.QueryLog{
		Ts: time.Now().UnixMilli(), Domain: domain, QType: qtypeStr,
		Action: action, LatencyUs: latUs, Client: clientIP,
	})
	return msg
}

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

func (s *Server) isBlocked(domain string) bool {
	return cache.IsBlocked(domain)
}

var upstreamClient = &dns.Client{Timeout: 5 * time.Second}

func (s *Server) proxy(r *dns.Msg) *dns.Msg {
	resp, _, err := upstreamClient.Exchange(r, s.upstreamDNS)
	if err != nil {
		m := new(dns.Msg)
		m.SetRcode(r, dns.RcodeServerFailure)
		return m
	}
	return resp
}

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
