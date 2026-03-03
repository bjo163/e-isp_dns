package models

import "time"

// AdminUser stores hashed credentials for admin dashboard access.
type AdminUser struct {
ID           uint      `gorm:"primaryKey" json:"-"`
Username     string    `gorm:"uniqueIndex;not null" json:"username"`
PasswordHash string    `gorm:"not null" json:"-"`
UpdatedAt    time.Time `json:"updated_at"`
}

// Branding holds all configurable UI/branding values stored in SQLite.
// There is always exactly one row (ID=1); use Upsert to update.
type Branding struct {
ID uint `gorm:"primaryKey" json:"-"`

// Site
SiteName     string `json:"site_name"`
BlockPageURL string `json:"block_page_url"`

// Hero / block page copy
HeroTitle           string `json:"hero_title"`
HeroSubtitle        string `json:"hero_subtitle"`
WarningBadgeText    string `json:"warning_badge_text"`
BlockedURLPlaceholder string `json:"blocked_url_placeholder"`
DefaultReason       string `json:"default_reason"`
NoticeText          string `json:"notice_text"`

// Category section
CategoryTitle    string `json:"category_title"`
CategorySubtitle string `json:"category_subtitle"`

// Appeal section
AppealTitle      string `json:"appeal_title"`
AppealSubtitle   string `json:"appeal_subtitle"`
AppealPortalLabel string `json:"appeal_portal_label"`
AppealProcessDays int    `json:"appeal_process_days"`

// Contact section
ContactTitle    string `json:"contact_title"`
ContactSubtitle string `json:"contact_subtitle"`

// Footer
FooterLegal string `json:"footer_legal"`

// Regulator
AuthorityName       string `json:"authority_name"`
AuthorityShortName  string `json:"authority_short_name"`
AuthorityLogo       string `json:"authority_logo"`
AuthorityAddress    string `json:"authority_address"`
AuthorityPhone      string `json:"authority_phone"`
AuthorityEmail      string `json:"authority_email"`
AuthorityWebsite    string `json:"authority_website"`
TrustpositifURL     string `json:"trustpositif_url"`

// ISP
ISPName      string `json:"isp_name"`
ISPShortName string `json:"isp_short_name"`
ISPLogo      string `json:"isp_logo"`
ISPHelpline  string `json:"isp_helpline"`
ISPEmail     string `json:"isp_email"`
ISPWebsite   string `json:"isp_website"`
ISPAN        string `json:"isp_as_number"`

// Theme
PrimaryColor string `json:"primary_color"`
AccentColor  string `json:"accent_color"`

// Official assets
KomdigiLogo     string `json:"komdigi_logo"`
CyberDrone9Logo string `json:"cyber_drone9_logo"`
AduanKontenLogo string `json:"aduan_konten_logo"`
AduanKontenURL  string `json:"aduan_konten_url"`
CyberDrone9URL  string `json:"cyber_drone9_url"`

UpdatedAt time.Time `json:"updated_at"`
}

// BlockedDomain is a domain entry intercepted by the DNS server.
type BlockedDomain struct {
ID         uint      `gorm:"primaryKey" json:"id"`
Domain     string    `gorm:"uniqueIndex;not null" json:"domain"`
Reason     string    `json:"reason"`
Category   string    `gorm:"index" json:"category"`
Active     bool      `gorm:"default:true;index" json:"active"`
CreatedAt  time.Time `json:"created_at"`
UpdatedAt  time.Time `json:"updated_at"`
}

// Category groups blocked domains by type (pornografi, judi, malware, etc.).
type Category struct {
ID          uint      `gorm:"primaryKey" json:"id"`
Name        string    `gorm:"uniqueIndex;not null" json:"name"`
Description string    `json:"description"`
Color       string    `json:"color"`         // hex, e.g. #ef4444
Icon        string    `json:"icon"`          // lucide icon name
Active      bool      `gorm:"default:true" json:"active"`
DomainCount int64     `gorm:"-" json:"domain_count"` // virtual
CreatedAt   time.Time `json:"created_at"`
UpdatedAt   time.Time `json:"updated_at"`
}

// ACLClient represents a known client (subscriber) identified by IP.
// Default action is "allow" — all clients can browse unless explicitly blocked.
// When action="block" and BlockedCategories is non-empty, only domains matching
// those categories are blocked (comma-separated, e.g. "Pornografi,Judi Online").
// Empty BlockedCategories with action="block" blocks ALL DNS.
type ACLClient struct {
ID                uint      `gorm:"primaryKey" json:"id"`
IP                string    `gorm:"uniqueIndex;not null" json:"ip"` // IPv4 or IPv6
Name              string    `json:"name"`                           // human label
Action            string    `gorm:"default:allow;not null" json:"action"` // "allow" or "block"
BlockedCategories string    `json:"blocked_categories"`            // comma-separated, e.g. "Pornografi,Judi Online"
Notes             string    `json:"notes"`
CreatedAt         time.Time `json:"created_at"`
UpdatedAt         time.Time `json:"updated_at"`
}

// BlocklistPreset is a popular public blocklist URL with metadata.
// NOT stored in DB — hardcoded in Go for the admin UI preset picker.
type BlocklistPreset struct {
Label       string `json:"label"`
URL         string `json:"url"`
Category    string `json:"category"`
Description string `json:"description"`
Format      string `json:"format"` // hosts, domains, adblock
}

// DNSConfig holds DNS server operational settings.
type DNSConfig struct {
ID            uint      `gorm:"primaryKey" json:"-"`
ListenAddr    string    `json:"listen_addr"`
UpstreamDNS   string    `json:"upstream_dns"`
RedirectIP    string    `json:"redirect_ip"`
HTTPPort      string    `json:"http_port"`
// InterceptPort is the plain-HTTP port (:80) the DNS router redirects to.
// It reads the Host header to identify the blocked domain and 302s to the
// block page with ?domain=&reason=&cat= params.
InterceptPort string    `json:"intercept_port"`
// ACLDefaultAllow: if true all unknown clients pass through;
// only IPs explicitly set to "block" are filtered.
ACLDefaultAllow bool   `gorm:"default:true" json:"acl_default_allow"`
UpdatedAt     time.Time `json:"updated_at"`
}

// CustomRecord is a user-defined DNS record (like HestiaCP / BIND zone editor).
// Supports A, AAAA, CNAME, MX, TXT, PTR, NS, SRV record types.
type CustomRecord struct {
ID        uint      `gorm:"primaryKey" json:"id"`
Name      string    `gorm:"index;not null" json:"name"` // FQDN or subdomain, e.g. "mail.example.com"
Type      string    `gorm:"index;not null" json:"type"` // A, AAAA, CNAME, MX, TXT, PTR, NS, SRV
Value     string    `gorm:"not null" json:"value"`      // IP, hostname, text, etc.
TTL       uint32    `gorm:"default:3600" json:"ttl"`    // seconds
Priority  uint16    `gorm:"default:0" json:"priority"` // MX/SRV priority
Active    bool      `gorm:"default:true;index" json:"active"`
Notes     string    `json:"notes"`
CreatedAt time.Time `json:"created_at"`
UpdatedAt time.Time `json:"updated_at"`
}

// QueryLogEntry is a persistent DNS query log entry stored in SQLite.
// Used for analytics (top-blocked, history charts).  In-memory ring buffer
// in metrics package handles real-time WebSocket feed; this is for historical data.
type QueryLogEntry struct {
ID        uint      `gorm:"primaryKey" json:"id"`
Domain    string    `gorm:"index;not null" json:"domain"`
QType     string    `json:"qtype"`
Action    string    `gorm:"not null;index:idx_qle_action_created" json:"action"` // composite index col1
Client    string    `gorm:"index" json:"client"`
LatencyUs int64     `json:"latency_us"`
CreatedAt time.Time `gorm:"not null;index:idx_qle_action_created" json:"created_at"` // composite index col2
}

// BlocklistSubscription is a scheduled blocklist import (auto-cron).
type BlocklistSubscription struct {
ID            uint       `gorm:"primaryKey" json:"id"`
Name          string     `gorm:"not null" json:"name"`
URL           string     `gorm:"not null" json:"url"`
Category      string     `json:"category"`
Reason        string     `json:"reason"`
IntervalHours int        `gorm:"default:24;not null" json:"interval_hours"` // e.g. 24 = daily
Enabled       bool       `gorm:"default:true" json:"enabled"`
LastRunAt     *time.Time `json:"last_run_at"`
LastCount     int64      `json:"last_count"`
LastError     string     `json:"last_error"`
CreatedAt     time.Time  `json:"created_at"`
UpdatedAt     time.Time  `json:"updated_at"`
}

// IPEnrichment caches public IP info for clients (ISP, ASN, country, city, org).
type IPEnrichment struct {
	IP          string    `gorm:"primaryKey;uniqueIndex;not null" json:"ip"`
	ISP         string    `json:"isp"`
	Org         string    `json:"org"`
	ASN         string    `json:"asn"`
	Country     string    `json:"country"`
	CountryCode string    `json:"country_code"`
	City        string    `json:"city"`
	Lat         float64   `json:"lat"`
	Lon         float64   `json:"lon"`
	FetchedAt   time.Time `json:"fetched_at"`
}

// IPReputationEntry stores a single IP or CIDR from a blacklist source.
type IPReputationEntry struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	IP        string    `gorm:"index" json:"ip"`      // for single IP
	CIDR      string    `gorm:"index" json:"cidr"`    // for CIDR blocks
	Source    string    `gorm:"index" json:"source"`  // e.g. "Spamhaus DROP"
	Reason    string    `json:"reason"`
	UpdatedAt time.Time `json:"updated_at"`
}

// IPReputationSource configures a blacklist source for auto-sync.
type IPReputationSource struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Name       string    `gorm:"uniqueIndex;not null" json:"name"`
	URL        string    `json:"url"`
	Format     string    `json:"format"` // "ip", "cidr", "mixed"
	Enabled    bool      `gorm:"default:true" json:"enabled"`
	LastRunAt  *time.Time `json:"last_run_at"`
	LastCount  int64     `json:"last_count"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
