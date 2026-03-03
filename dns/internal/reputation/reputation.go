package reputation

import (
	"bufio"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/truspositif/dns/internal/models"
	"gorm.io/gorm"
)

// httpClient has a hard 30-second timeout to prevent goroutine leaks (BUG-3 fix).
var httpClient = &http.Client{Timeout: 30 * time.Second}

// Default sources for IP reputation lists
var defaultSources = []models.IPReputationSource{
	{Name: "Spamhaus DROP", URL: "https://www.spamhaus.org/drop/drop.txt", Format: "cidr", Enabled: true},
	{Name: "Spamhaus EDROP", URL: "https://www.spamhaus.org/drop/edrop.txt", Format: "cidr", Enabled: true},
	{Name: "Blocklist.de All", URL: "https://lists.blocklist.de/lists/all.txt", Format: "ip", Enabled: true},
	{Name: "FireHOL Level1", URL: "https://iplists.firehol.org/files/firehol_level1.netset", Format: "mixed", Enabled: true},
	{Name: "CI Army", URL: "https://cinsscore.com/list/ci-badguys.txt", Format: "ip", Enabled: true},
	{Name: "Emerging Threats", URL: "https://rules.emergingthreats.net/blockrules/compromised-ips.txt", Format: "ip", Enabled: true},
	{Name: "Abuse.ch Feodo", URL: "https://feodotracker.abuse.ch/downloads/ipblocklist.txt", Format: "ip", Enabled: true},
	{Name: "Bruteforce Blocker", URL: "https://danger.rulez.sk/projects/bruteforceblocker/blist.php", Format: "ip", Enabled: true},
}

// SeedSources inserts default sources if none exist.
func SeedSources(db *gorm.DB) {
	var count int64
	db.Model(&models.IPReputationSource{}).Count(&count)
	if count == 0 {
		db.Create(&defaultSources)
		log.Printf("reputation: seeded %d default sources", len(defaultSources))
	}
}

// Sync all enabled sources.
func Sync(db *gorm.DB) {
	var sources []models.IPReputationSource
	db.Where("enabled = ?", true).Find(&sources)
	for _, src := range sources {
		SyncSource(db, &src)
	}
}

// SyncSource updates a single reputation source.
func SyncSource(db *gorm.DB, src *models.IPReputationSource) {
	log.Printf("reputation: syncing %s", src.Name)
	ips, cidrs := fetchList(src.URL, src.Format)

	// Update or create entries
	for _, ip := range ips {
		db.Where(models.IPReputationEntry{IP: ip, Source: src.Name}).
			Assign(models.IPReputationEntry{UpdatedAt: time.Now()}).
			FirstOrCreate(&models.IPReputationEntry{IP: ip, Source: src.Name})
	}
	for _, cidr := range cidrs {
		db.Where(models.IPReputationEntry{CIDR: cidr, Source: src.Name}).
			Assign(models.IPReputationEntry{UpdatedAt: time.Now()}).
			FirstOrCreate(&models.IPReputationEntry{CIDR: cidr, Source: src.Name})
	}

	now := time.Now()
	db.Model(src).Updates(map[string]interface{}{
		"last_run_at": &now,
		"last_count":  len(ips) + len(cidrs),
	})
}

// fetchList downloads and parses a reputation list.
// Uses httpClient with 30s timeout (BUG-3 fix).
func fetchList(rawURL, format string) (ips []string, cidrs []string) {
	resp, err := httpClient.Get(rawURL)
	if err != nil {
		log.Printf("reputation: fetch error %s: %v", rawURL, err)
		return
	}
	defer resp.Body.Close()
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// Strip inline comments (e.g. Spamhaus "1.2.3.0/24 ; SBLxxx")
		if idx := strings.IndexByte(line, ';'); idx > 0 {
			line = strings.TrimSpace(line[:idx])
		}
		if format == "ip" && net.ParseIP(line) != nil {
			ips = append(ips, line)
		} else if format == "cidr" && strings.Contains(line, "/") {
			cidrs = append(cidrs, line)
		} else if format == "mixed" {
			if net.ParseIP(line) != nil {
				ips = append(ips, line)
			} else if strings.Contains(line, "/") {
				cidrs = append(cidrs, line)
			}
		}
	}
	return
}

// Check if IP matches any reputation entry.
func Check(db *gorm.DB, ip string) (matches []models.IPReputationEntry) {
	// Exact IP match
	db.Where("ip = ?", ip).Find(&matches)
	// CIDR match — load once per call (better than per-request DB hit)
	var cidrs []models.IPReputationEntry
	db.Where("cidr != ''").Find(&cidrs)
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return
	}
	for _, entry := range cidrs {
		_, netblock, err := net.ParseCIDR(entry.CIDR)
		if err == nil && netblock.Contains(parsed) {
			matches = append(matches, entry)
		}
	}
	return
}

// Start reputation sync scheduler (every 24h).
func Start(db *gorm.DB) {
	SeedSources(db)
	go func() {
		for {
			Sync(db)
			time.Sleep(24 * time.Hour)
		}
	}()
}
