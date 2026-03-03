package reputation

import (
	"bufio"
	"net"
	"net/http"
	"strings"
	"time"
	"log"

	"github.com/truspositif/dns/internal/models"
	"gorm.io/gorm"
)

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

// Seed default sources if none exist
func SeedSources(db *gorm.DB) {
	var count int64
	db.Model(&models.IPReputationSource{}).Count(&count)
	if count == 0 {
		db.Create(&defaultSources)
		log.Printf("reputation: seeded %d default sources", len(defaultSources))
	}
}

// Sync all enabled sources
func Sync(db *gorm.DB) {
	var sources []models.IPReputationSource
	db.Where("enabled = ?", true).Find(&sources)
	for _, src := range sources {
		log.Printf("reputation: syncing %s", src.Name)
		ips, cidrs := fetchList(src.URL, src.Format)
		for _, ip := range ips {
			db.Where(models.IPReputationEntry{IP: ip, Source: src.Name}).Assign(models.IPReputationEntry{UpdatedAt: time.Now()}).FirstOrCreate(&models.IPReputationEntry{IP: ip, Source: src.Name})
		}
		for _, cidr := range cidrs {
			db.Where(models.IPReputationEntry{CIDR: cidr, Source: src.Name}).Assign(models.IPReputationEntry{UpdatedAt: time.Now()}).FirstOrCreate(&models.IPReputationEntry{CIDR: cidr, Source: src.Name})
		}
		now := time.Now()
		db.Model(&src).Updates(map[string]interface{}{"last_run_at": &now, "last_count": len(ips) + len(cidrs)})
	}
}

// Fetch and parse a reputation list
func fetchList(url, format string) (ips []string, cidrs []string) {
	resp, err := http.Get(url)
	if err != nil {
		log.Printf("reputation: fetch error %s: %v", url, err)
		return
	}
	defer resp.Body.Close()
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") { continue }
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

// Check if IP matches any reputation entry
func Check(db *gorm.DB, ip string) (matches []models.IPReputationEntry) {
	db.Where("ip = ?", ip).Find(&matches)
	var cidrs []models.IPReputationEntry
	db.Where("cidr != ''").Find(&cidrs)
	for _, entry := range cidrs {
		_, netblock, err := net.ParseCIDR(entry.CIDR)
		if err == nil && netblock.Contains(net.ParseIP(ip)) {
			matches = append(matches, entry)
		}
	}
	return
}

// Start reputation sync scheduler (every 24h)
func Start(db *gorm.DB) {
	SeedSources(db)
	go func() {
		for {
			Sync(db)
			time.Sleep(24 * time.Hour)
		}
	}()
}
