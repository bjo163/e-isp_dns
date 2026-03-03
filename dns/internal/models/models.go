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
ID        uint      `gorm:"primaryKey" json:"id"`
Domain    string    `gorm:"uniqueIndex;not null" json:"domain"`
Reason    string    `json:"reason"`
Category  string    `json:"category"`
Active    bool      `gorm:"default:true" json:"active"`
CreatedAt time.Time `json:"created_at"`
UpdatedAt time.Time `json:"updated_at"`
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
UpdatedAt     time.Time `json:"updated_at"`
}
