package api

import (
	"encoding/csv"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/websocket/v2"
	"github.com/truspositif/dns/internal/analytics"
	"github.com/truspositif/dns/internal/auth"
	"github.com/truspositif/dns/internal/cache"
	"github.com/truspositif/dns/internal/db"
	"github.com/truspositif/dns/internal/importer"
	"github.com/truspositif/dns/internal/metrics"
	"github.com/truspositif/dns/internal/models"
	"github.com/truspositif/dns/internal/scheduler"
	"golang.org/x/crypto/bcrypt"
)

func New() *fiber.App {
	app := fiber.New(fiber.Config{AppName: "TrustPositif DNS Admin API"})
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
	}))

	// ── Public ───────────────────────────────────────────────────────────
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	app.Post("/api/auth/login", handleLogin)

	app.Get("/myip", func(c *fiber.Ctx) error {
		ip := c.Get("X-Real-IP")
		if ip == "" {
			if ips := c.IPs(); len(ips) > 0 {
				ip = ips[0]
			}
		}
		if ip == "" {
			ip = c.IP()
		}
		return c.JSON(fiber.Map{"ip": ip})
	})

	app.Get("/metrics", func(c *fiber.Ctx) error {
		return c.JSON(metrics.Snapshot())
	})

	// WebSocket — real-time metrics
	app.Use("/ws/metrics", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws/metrics", websocket.New(func(c *websocket.Conn) {
		client := metrics.NewClient()
		metrics.Register(client)
		defer metrics.Unregister(client)
		if data := metrics.BuildPayload(); len(data) > 0 {
			_ = c.WriteMessage(websocket.TextMessage, data)
		}
		done := make(chan struct{})
		go func() {
			for {
				if _, _, err := c.ReadMessage(); err != nil {
					close(done)
					return
				}
			}
		}()
		for {
			select {
			case msg, ok := <-client.Send():
				if !ok {
					return
				}
				if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
			case <-done:
				return
			}
		}
	}))

	// ── Protected (JWT) ──────────────────────────────────────────────────
	v1 := app.Group("/api", auth.Middleware())
	v1.Post("/auth/change-password", handleChangePassword)

	// Branding
	v1.Get("/branding", getBranding)
	v1.Put("/branding", updateBranding)

	// Domains (paginated)
	v1.Get("/domains", listDomains)
	v1.Post("/domains", addDomain)
	v1.Put("/domains/:id", updateDomain)
	v1.Delete("/domains/:id", deleteDomain)
	v1.Post("/domains/import", importDomains)
	v1.Delete("/domains/bulk", bulkDeleteDomains)

	// Categories
	v1.Get("/categories", listCategories)
	v1.Post("/categories", addCategory)
	v1.Put("/categories/:id", updateCategory)
	v1.Delete("/categories/:id", deleteCategory)

	// ACL Clients
	v1.Get("/clients", listClients)
	v1.Get("/clients/detected", detectedClients)
	v1.Post("/clients", addClient)
	v1.Put("/clients/:id", updateClient)
	v1.Delete("/clients/:id", deleteClient)

	// Custom DNS Records
	v1.Get("/records", listRecords)
	v1.Post("/records", addRecord)
	v1.Put("/records/:id", updateRecord)
	v1.Delete("/records/:id", deleteRecord)

	// Blocklist presets
	v1.Get("/presets", listPresets)

	// DNS Config
	v1.Get("/config", getDNSConfig)
	v1.Put("/config", updateDNSConfig)

	// Analytics
	v1.Get("/analytics/summary", handleAnalyticsSummary)
	v1.Get("/analytics/top-blocked", handleTopBlocked)
	v1.Get("/analytics/top-clients", handleTopClients)
	v1.Get("/analytics/history", handleHistory)
	v1.Get("/analytics/client-stats", handleClientStats)

	// Export
	v1.Get("/domains/export", exportDomains)

	// Blocklist Subscriptions
	v1.Get("/subscriptions", listSubscriptions)
	v1.Post("/subscriptions", addSubscription)
	v1.Put("/subscriptions/:id", updateSubscription)
	v1.Delete("/subscriptions/:id", deleteSubscription)
	v1.Post("/subscriptions/:id/run", runSubscription)

	return app
}

// ═════════════════════════════════════════════════════════════════════════════
//  AUTH
// ═════════════════════════════════════════════════════════════════════════════

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func handleLogin(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}
	var user models.AdminUser
	if err := db.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "username atau password salah"})
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "username atau password salah"})
	}
	token, err := auth.Sign(user.Username)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "gagal membuat token"})
	}
	return c.JSON(fiber.Map{"token": token, "username": user.Username})
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func handleChangePassword(c *fiber.Ctx) error {
	username := c.Locals("username").(string)
	var req changePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}
	if len(req.NewPassword) < 6 {
		return c.Status(400).JSON(fiber.Map{"error": "password minimal 6 karakter"})
	}
	var user models.AdminUser
	if err := db.DB.Where("username = ?", username).First(&user).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "user not found"})
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "password lama salah"})
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "gagal memproses password"})
	}
	if err := db.DB.Model(&user).Update("password_hash", string(hash)).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "password berhasil diubah"})
}

// ═════════════════════════════════════════════════════════════════════════════
//  BRANDING
// ═════════════════════════════════════════════════════════════════════════════

func getBranding(c *fiber.Ctx) error {
	var b models.Branding
	if err := db.DB.First(&b, 1).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(b)
}

func updateBranding(c *fiber.Ctx) error {
	var payload models.Branding
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	payload.ID = 1
	if err := db.DB.Save(&payload).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(payload)
}

// ═════════════════════════════════════════════════════════════════════════════
//  DOMAINS (server-side pagination)
// ═════════════════════════════════════════════════════════════════════════════

func listDomains(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	search := strings.TrimSpace(c.Query("search"))
	category := strings.TrimSpace(c.Query("category"))
	activeFilter := strings.TrimSpace(c.Query("active"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}

	q := db.DB.Model(&models.BlockedDomain{})
	if search != "" {
		q = q.Where("domain LIKE ?", "%"+search+"%")
	}
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if activeFilter == "true" {
		q = q.Where("active = ?", true)
	} else if activeFilter == "false" {
		q = q.Where("active = ?", false)
	}

	var total int64
	q.Count(&total)

	var domains []models.BlockedDomain
	q.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&domains)

	return c.JSON(fiber.Map{
		"data":  domains,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func addDomain(c *fiber.Ctx) error {
	var d models.BlockedDomain
	if err := c.BodyParser(&d); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if d.Domain == "" {
		return c.Status(400).JSON(fiber.Map{"error": "domain required"})
	}
	if err := db.DB.Create(&d).Error; err != nil {
		return c.Status(409).JSON(fiber.Map{"error": err.Error()})
	}
	go cache.Reload(db.DB)
	return c.Status(201).JSON(d)
}

func updateDomain(c *fiber.Ctx) error {
	id := c.Params("id")
	var d models.BlockedDomain
	if err := db.DB.First(&d, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	if err := c.BodyParser(&d); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := db.DB.Save(&d).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	go cache.Reload(db.DB)
	return c.JSON(d)
}

func deleteDomain(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&models.BlockedDomain{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	go cache.Reload(db.DB)
	return c.SendStatus(204)
}

func bulkDeleteDomains(c *fiber.Ctx) error {
	var body struct {
		IDs []uint `json:"ids"`
	}
	if err := c.BodyParser(&body); err != nil || len(body.IDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "ids required"})
	}
	result := db.DB.Where("id IN ?", body.IDs).Delete(&models.BlockedDomain{})
	go cache.Reload(db.DB)
	return c.JSON(fiber.Map{"deleted": result.RowsAffected})
}

type importRequest struct {
	URL      string `json:"url"`
	Category string `json:"category"`
	Reason   string `json:"reason"`
}

func importDomains(c *fiber.Ctx) error {
	var req importRequest
	if err := c.BodyParser(&req); err != nil || req.URL == "" {
		return c.Status(400).JSON(fiber.Map{"error": "url required"})
	}

	result, err := importer.FromURL(db.DB, req.URL, req.Category, req.Reason)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"parsed":   result.Parsed,
		"inserted": result.Inserted,
		"skipped":  result.Skipped,
	})
}

// ═════════════════════════════════════════════════════════════════════════════
//  CATEGORIES
// ═════════════════════════════════════════════════════════════════════════════

func listCategories(c *fiber.Ctx) error {
	var cats []models.Category
	db.DB.Order("name asc").Find(&cats)
	for i := range cats {
		var cnt int64
		db.DB.Model(&models.BlockedDomain{}).Where("category = ?", cats[i].Name).Count(&cnt)
		cats[i].DomainCount = cnt
	}
	return c.JSON(cats)
}

func addCategory(c *fiber.Ctx) error {
	var cat models.Category
	if err := c.BodyParser(&cat); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if cat.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name required"})
	}
	if err := db.DB.Create(&cat).Error; err != nil {
		return c.Status(409).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(cat)
}

func updateCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	var cat models.Category
	if err := db.DB.First(&cat, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	oldName := cat.Name
	if err := c.BodyParser(&cat); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := db.DB.Save(&cat).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if oldName != cat.Name {
		db.DB.Model(&models.BlockedDomain{}).Where("category = ?", oldName).Update("category", cat.Name)
	}
	go cache.Reload(db.DB)
	return c.JSON(cat)
}

func deleteCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&models.Category{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}

// ═════════════════════════════════════════════════════════════════════════════
//  ACL CLIENTS
// ═════════════════════════════════════════════════════════════════════════════

func listClients(c *fiber.Ctx) error {
	var clients []models.ACLClient
	db.DB.Order("created_at desc").Find(&clients)
	return c.JSON(clients)
}

func detectedClients(c *fiber.Ctx) error {
	logs := metrics.RecentQueries(200)
	seen := make(map[string]int64)
	for _, l := range logs {
		if l.Client != "" {
			seen[l.Client]++
		}
	}
	var existing []models.ACLClient
	db.DB.Select("ip").Find(&existing)
	existingMap := make(map[string]bool, len(existing))
	for _, e := range existing {
		existingMap[e.IP] = true
	}
	type detected struct {
		IP    string `json:"ip"`
		Count int64  `json:"query_count"`
	}
	var result []detected
	for ip, cnt := range seen {
		if !existingMap[ip] && ip != "" && ip != "127.0.0.1" && ip != "::1" {
			result = append(result, detected{IP: ip, Count: cnt})
		}
	}
	return c.JSON(result)
}

func addClient(c *fiber.Ctx) error {
	var cl models.ACLClient
	if err := c.BodyParser(&cl); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if cl.IP == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ip required"})
	}
	if cl.Action == "" {
		cl.Action = "allow"
	}
	if err := db.DB.Create(&cl).Error; err != nil {
		return c.Status(409).JSON(fiber.Map{"error": err.Error()})
	}
	go cache.ReloadACL(db.DB)
	return c.Status(201).JSON(cl)
}

func updateClient(c *fiber.Ctx) error {
	id := c.Params("id")
	var cl models.ACLClient
	if err := db.DB.First(&cl, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	if err := c.BodyParser(&cl); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := db.DB.Save(&cl).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	go cache.ReloadACL(db.DB)
	return c.JSON(cl)
}

func deleteClient(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&models.ACLClient{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	go cache.ReloadACL(db.DB)
	return c.SendStatus(204)
}

// ═════════════════════════════════════════════════════════════════════════════
//  CUSTOM DNS RECORDS
// ═════════════════════════════════════════════════════════════════════════════

func listRecords(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	search := strings.TrimSpace(c.Query("search"))
	rtype := strings.TrimSpace(c.Query("type"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}

	q := db.DB.Model(&models.CustomRecord{})
	if search != "" {
		q = q.Where("name LIKE ? OR value LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if rtype != "" {
		q = q.Where("type = ?", strings.ToUpper(rtype))
	}

	var total int64
	q.Count(&total)

	var records []models.CustomRecord
	q.Order("name asc, type asc").Offset((page - 1) * limit).Limit(limit).Find(&records)

	return c.JSON(fiber.Map{
		"data":  records,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func addRecord(c *fiber.Ctx) error {
	var r models.CustomRecord
	if err := c.BodyParser(&r); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if r.Name == "" || r.Type == "" || r.Value == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name, type, and value required"})
	}
	r.Type = strings.ToUpper(r.Type)
	validTypes := map[string]bool{"A": true, "AAAA": true, "CNAME": true, "MX": true, "TXT": true, "PTR": true, "NS": true, "SRV": true}
	if !validTypes[r.Type] {
		return c.Status(400).JSON(fiber.Map{"error": "type harus: A, AAAA, CNAME, MX, TXT, PTR, NS, SRV"})
	}
	if r.TTL == 0 {
		r.TTL = 3600
	}
	if err := db.DB.Create(&r).Error; err != nil {
		return c.Status(409).JSON(fiber.Map{"error": err.Error()})
	}
	go cache.ReloadRecords(db.DB)
	return c.Status(201).JSON(r)
}

func updateRecord(c *fiber.Ctx) error {
	id := c.Params("id")
	var r models.CustomRecord
	if err := db.DB.First(&r, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	if err := c.BodyParser(&r); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	r.Type = strings.ToUpper(r.Type)
	if err := db.DB.Save(&r).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	go cache.ReloadRecords(db.DB)
	return c.JSON(r)
}

func deleteRecord(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&models.CustomRecord{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	go cache.ReloadRecords(db.DB)
	return c.SendStatus(204)
}

// ═════════════════════════════════════════════════════════════════════════════
//  BLOCKLIST PRESETS
// ═════════════════════════════════════════════════════════════════════════════

func listPresets(c *fiber.Ctx) error {
	presets := []models.BlocklistPreset{
		{Label: "TrustPositif KEMENKOMINFO", URL: "https://raw.githubusercontent.com/nicholasgasior/trustpositif-data/master/domains-blocked.txt", Category: "Pornografi", Description: "Daftar resmi pemblokiran KEMENKOMINFO Indonesia", Format: "domains"},
		{Label: "StevenBlack Porn", URL: "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn-only/hosts", Category: "Pornografi", Description: "Steven Black's curated adult content blocklist", Format: "hosts"},
		{Label: "Sinfool Porn", URL: "https://raw.githubusercontent.com/4skinSkywalker/anti-porn-hosts-file/master/HOSTS.txt", Category: "Pornografi", Description: "Anti-porn hosts file", Format: "hosts"},
		{Label: "StevenBlack Gambling", URL: "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-only/hosts", Category: "Judi Online", Description: "Steven Black's gambling sites blocklist", Format: "hosts"},
		{Label: "Phishing Army", URL: "https://phishing.army/download/phishing_army_blocklist.txt", Category: "Penipuan", Description: "Phishing domains from multiple sources", Format: "domains"},
		{Label: "OpenPhish", URL: "https://openphish.com/feed.txt", Category: "Penipuan", Description: "OpenPhish community phishing feed", Format: "domains"},
		{Label: "Abuse.ch URLhaus", URL: "https://urlhaus.abuse.ch/downloads/hostfile/", Category: "Malware", Description: "Malware distribution sites from abuse.ch", Format: "hosts"},
		{Label: "RPiList Malware", URL: "https://raw.githubusercontent.com/RPiList/specials/master/Blocklisten/malware", Category: "Malware", Description: "RPiList malware domains", Format: "domains"},
		{Label: "StevenBlack Unified", URL: "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts", Category: "Lainnya", Description: "Ads + malware + trackers unified (~200K)", Format: "hosts"},
		{Label: "OISD Full", URL: "https://big.oisd.nl/domainswild", Category: "Lainnya", Description: "OISD comprehensive multi-source blocklist", Format: "domains"},
		{Label: "HaGeZi Multi PRO", URL: "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/hosts/pro.txt", Category: "Lainnya", Description: "HaGeZi multi-source pro blocklist", Format: "hosts"},
		{Label: "NoTracking", URL: "https://raw.githubusercontent.com/notracking/hosts-blocklists/master/dnscrypt-proxy/dnscrypt-proxy.blacklist.txt", Category: "Proxy & VPN", Description: "NoTracking hostnames blocklist", Format: "domains"},
	}
	return c.JSON(presets)
}

// ═════════════════════════════════════════════════════════════════════════════
//  DNS CONFIG
// ═════════════════════════════════════════════════════════════════════════════

func getDNSConfig(c *fiber.Ctx) error {
	var cfg models.DNSConfig
	if err := db.DB.First(&cfg, 1).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(cfg)
}

func updateDNSConfig(c *fiber.Ctx) error {
	var cfg models.DNSConfig
	if err := c.BodyParser(&cfg); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	cfg.ID = 1
	if err := db.DB.Save(&cfg).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	// Update ACL default policy from config
	cache.SetACLDefault(cfg.ACLDefaultAllow)
	return c.JSON(cfg)
}

// ═════════════════════════════════════════════════════════════════════════════
//  ANALYTICS
// ═════════════════════════════════════════════════════════════════════════════

// parsePeriod converts a period query param (1h/24h/7d/30d) to a time.Time.
func parsePeriod(c *fiber.Ctx) time.Time {
	switch c.Query("period", "24h") {
	case "1h":
		return time.Now().Add(-1 * time.Hour)
	case "7d":
		return time.Now().Add(-7 * 24 * time.Hour)
	case "30d":
		return time.Now().Add(-30 * 24 * time.Hour)
	default: // "24h"
		return time.Now().Add(-24 * time.Hour)
	}
}

func handleAnalyticsSummary(c *fiber.Ctx) error {
	return c.JSON(analytics.GetSummary(parsePeriod(c)))
}

func handleTopBlocked(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if limit < 1 || limit > 100 {
		limit = 10
	}
	return c.JSON(analytics.TopBlocked(limit, parsePeriod(c)))
}

func handleTopClients(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if limit < 1 || limit > 100 {
		limit = 10
	}
	return c.JSON(analytics.TopClients(limit, parsePeriod(c)))
}

func handleHistory(c *fiber.Ctx) error {
	bucketSec, _ := strconv.ParseInt(c.Query("bucket", "3600"), 10, 64)
	if bucketSec < 60 {
		bucketSec = 60
	}
	return c.JSON(analytics.History(parsePeriod(c), bucketSec))
}

func handleClientStats(c *fiber.Ctx) error {
	ip := c.Query("ip")
	if ip == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ip required"})
	}
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if limit < 1 || limit > 100 {
		limit = 10
	}
	bucketSec, _ := strconv.ParseInt(c.Query("bucket", "3600"), 10, 64)
	if bucketSec < 60 {
		bucketSec = 60
	}
	return c.JSON(analytics.ClientStats(ip, limit, parsePeriod(c), bucketSec))
}

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORT
// ═════════════════════════════════════════════════════════════════════════════

func exportDomains(c *fiber.Ctx) error {
	var domains []models.BlockedDomain
	db.DB.Where("active = ?", true).Order("domain asc").Find(&domains)

	format := c.Query("format", "domains")
	switch format {
	case "csv":
		c.Set("Content-Type", "text/csv")
		c.Set("Content-Disposition", "attachment; filename=blocklist.csv")
		w := csv.NewWriter(c.Response().BodyWriter())
		_ = w.Write([]string{"domain", "category", "reason"})
		for _, d := range domains {
			_ = w.Write([]string{d.Domain, d.Category, d.Reason})
		}
		w.Flush()
		return nil
	case "json":
		return c.JSON(domains)
	case "hosts":
		c.Set("Content-Type", "text/plain")
		c.Set("Content-Disposition", "attachment; filename=blocklist-hosts.txt")
		var sb strings.Builder
		sb.WriteString("# TrustPositif blocklist (hosts format)\n")
		for _, d := range domains {
			fmt.Fprintf(&sb, "0.0.0.0 %s\n", d.Domain)
		}
		return c.SendString(sb.String())
	default: // "domains"
		c.Set("Content-Type", "text/plain")
		c.Set("Content-Disposition", "attachment; filename=blocklist.txt")
		var sb strings.Builder
		sb.WriteString("# TrustPositif blocklist (domain list)\n")
		for _, d := range domains {
			sb.WriteString(d.Domain)
			sb.WriteByte('\n')
		}
		return c.SendString(sb.String())
	}
}

// ═════════════════════════════════════════════════════════════════════════════
//  BLOCKLIST SUBSCRIPTIONS
// ═════════════════════════════════════════════════════════════════════════════

func listSubscriptions(c *fiber.Ctx) error {
	var subs []models.BlocklistSubscription
	db.DB.Order("created_at desc").Find(&subs)
	return c.JSON(subs)
}

func addSubscription(c *fiber.Ctx) error {
	var s models.BlocklistSubscription
	if err := c.BodyParser(&s); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if s.Name == "" || s.URL == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name and url required"})
	}
	if s.IntervalHours < 1 {
		s.IntervalHours = 24
	}
	if err := db.DB.Create(&s).Error; err != nil {
		return c.Status(409).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(s)
}

func updateSubscription(c *fiber.Ctx) error {
	id := c.Params("id")
	var s models.BlocklistSubscription
	if err := db.DB.First(&s, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	if err := c.BodyParser(&s); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if err := db.DB.Save(&s).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(s)
}

func deleteSubscription(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := db.DB.Delete(&models.BlocklistSubscription{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}

func runSubscription(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	go scheduler.RunSubscription(uint(id))
	return c.JSON(fiber.Map{"message": "subscription run started"})
}
