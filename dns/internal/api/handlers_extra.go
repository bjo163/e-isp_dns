package api

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/miekg/dns"
	"github.com/truspositif/dns/internal/db"
	srvdns "github.com/truspositif/dns/internal/dns"
	"github.com/truspositif/dns/internal/models"
	"github.com/truspositif/dns/internal/reputation"
)

// ═════════════════════════════════════════════════════════════════════════════
//
//	QUERY LOG API
//
// ═════════════════════════════════════════════════════════════════════════════
func handleQueryLog(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 1000 {
		limit = 100
	}

	q := db.DB.Model(&models.QueryLogEntry{})

	// Basic Filters
	if ip := c.Query("ip"); ip != "" {
		q = q.Where("client = ?", ip)
	}
	if domain := c.Query("domain"); domain != "" {
		q = q.Where("domain LIKE ?", "%"+domain+"%")
	}
	if action := c.Query("action"); action != "" {
		q = q.Where("action = ?", action)
	}
	if qtype := c.Query("qtype"); qtype != "" {
		q = q.Where("qtype = ?", qtype)
	}

	// Date Range Filters
	if start := c.Query("start_date"); start != "" {
		if t, err := time.Parse(time.RFC3339, start); err == nil {
			q = q.Where("created_at >= ?", t)
		}
	}
	if end := c.Query("end_date"); end != "" {
		if t, err := time.Parse(time.RFC3339, end); err == nil {
			q = q.Where("created_at <= ?", t)
		}
	}

	var total int64
	q.Count(&total)

	var logs []models.QueryLogEntry
	q.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&logs)

	return c.JSON(fiber.Map{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// ═════════════════════════════════════════════════════════════════════════════
//
//	IP ENRICHMENT API
//
// ═════════════════════════════════════════════════════════════════════════════
func handleIPInfo(c *fiber.Ctx) error {
	ip := c.Query("ip")
	if ip == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ip required"})
	}
	var info models.IPEnrichment
	err := db.DB.Where("ip = ?", ip).First(&info).Error
	if err == nil {
		return c.JSON(info)
	}

	// Fetch from external API
	resp, err := http.Get("http://ip-api.com/json/" + ip + "?fields=status,message,country,countryCode,city,isp,as,org,lat,lon")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to fetch from external API"})
	}
	defer resp.Body.Close()

	var apiRes struct {
		Status      string  `json:"status"`
		Message     string  `json:"message"`
		Country     string  `json:"country"`
		CountryCode string  `json:"countryCode"`
		City        string  `json:"city"`
		ISP         string  `json:"isp"`
		AS          string  `json:"as"`
		Org         string  `json:"org"`
		Lat         float64 `json:"lat"`
		Lon         float64 `json:"lon"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiRes); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to decode API response"})
	}

	if apiRes.Status != "success" {
		return c.Status(404).JSON(fiber.Map{"error": apiRes.Message})
	}

	// Map and cache
	info = models.IPEnrichment{
		IP:          ip,
		ISP:         apiRes.ISP,
		Org:         apiRes.Org,
		ASN:         apiRes.AS,
		Country:     apiRes.Country,
		CountryCode: apiRes.CountryCode,
		City:        apiRes.City,
		Lat:         apiRes.Lat,
		Lon:         apiRes.Lon,
		FetchedAt:   time.Now(),
	}
	db.DB.Create(&info)

	return c.JSON(info)
}

// ═════════════════════════════════════════════════════════════════════════════
//
//	IP REPUTATION API
//
// ═════════════════════════════════════════════════════════════════════════════
func handleReputation(c *fiber.Ctx) error {
	ip := c.Query("ip")
	if ip == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ip required"})
	}
	entries := reputation.Check(db.DB, ip)
	return c.JSON(entries)
}

// ═════════════════════════════════════════════════════════════════════════════
//  IP REPUTATION SOURCES & ENTRIES (CRUD)
// ═════════════════════════════════════════════════════════════════════════════

func listReputationSources(c *fiber.Ctx) error {
	var items []models.IPReputationSource
	db.DB.Order("name asc").Find(&items)
	return c.JSON(items)
}

func addReputationSource(c *fiber.Ctx) error {
	var item models.IPReputationSource
	if err := c.BodyParser(&item); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}
	if err := db.DB.Create(&item).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(item)
}

func syncReputationSource(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	var src models.IPReputationSource
	if err := db.DB.First(&src, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "source not found"})
	}
	go reputation.SyncSource(db.DB, &src)
	return c.JSON(fiber.Map{"status": "sync started"})
}

func deleteReputationSource(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	db.DB.Delete(&models.IPReputationEntry{}, "source = (SELECT name FROM ip_reputation_sources WHERE id = ?)", id)
	db.DB.Delete(&models.IPReputationSource{}, id)
	return c.SendStatus(204)
}

func listReputationEntries(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	search := c.Query("search")

	q := db.DB.Model(&models.IPReputationEntry{})
	if search != "" {
		q = q.Where("ip LIKE ? OR cidr LIKE ? OR source LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	q.Count(&total)
	var items []models.IPReputationEntry
	q.Order("updated_at desc").Offset((page - 1) * limit).Limit(limit).Find(&items)

	return c.JSON(fiber.Map{"data": items, "total": total, "page": page, "limit": limit})
}

// ═════════════════════════════════════════════════════════════════════════════
//  AUDIT LOGS
// ═════════════════════════════════════════════════════════════════════════════

func handleAuditLogs(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 500 {
		limit = 50
	}

	q := db.DB.Model(&models.AuditLog{})

	if admin := c.Query("admin"); admin != "" {
		q = q.Where("admin = ?", admin)
	}
	if target := c.Query("target"); target != "" {
		q = q.Where("target LIKE ?", "%"+target+"%")
	}

	var total int64
	q.Count(&total)

	var logs []models.AuditLog
	q.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&logs)

	return c.JSON(fiber.Map{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// RecordAuditLog is a helper to save admin actions to DB
func RecordAuditLog(c *fiber.Ctx, action, target, details string) {
	admin := "system"
	if username, ok := c.Locals("username").(string); ok {
		admin = username
	}
	ip := c.IP()
	if xrip := c.Get("X-Real-IP"); xrip != "" {
		ip = xrip
	}

	logEntry := models.AuditLog{
		Admin:     admin,
		Action:    action,
		Target:    target,
		Details:   details,
		IP:        ip,
		CreatedAt: time.Now(),
	}
	db.DB.Create(&logEntry)
}

// ═════════════════════════════════════════════════════════════════════════════
//  DoH (DNS-over-HTTPS)
// ═════════════════════════════════════════════════════════════════════════════

func handleDoH(c *fiber.Ctx, dnsSrv *srvdns.Server) error {
	var dnsMsg []byte
	var err error

	if c.Method() == "GET" {
		dnsParam := c.Query("dns")
		if dnsParam == "" {
			return c.Status(http.StatusBadRequest).SendString("Missing 'dns' parameter")
		}
		// base64url decoding (RFC 4648)
		dnsMsg, err = base64.RawURLEncoding.DecodeString(dnsParam)
		if err != nil {
			// fallback to standard if raw fails
			dnsMsg, err = base64.URLEncoding.DecodeString(dnsParam)
		}
		if err != nil {
			return c.Status(http.StatusBadRequest).SendString("Invalid base64url encoding")
		}
	} else {
		dnsMsg = c.Body()
	}

	if len(dnsMsg) == 0 {
		return c.Status(http.StatusBadRequest).SendString("Empty DNS message")
	}

	req := new(dns.Msg)
	if err := req.Unpack(dnsMsg); err != nil {
		return c.Status(http.StatusBadRequest).SendString("Failed to unpack DNS message")
	}

	clientIP := c.IP()
	if xrip := c.Get("X-Real-IP"); xrip != "" {
		clientIP = strings.Split(xrip, ",")[0]
	}

	resp := dnsSrv.Resolve(req, clientIP)
	respBuf, err := resp.Pack()
	if err != nil {
		return c.Status(http.StatusInternalServerError).SendString("Failed to pack DNS response")
	}

	c.Set("Content-Type", "application/dns-message")
	return c.Status(http.StatusOK).Send(respBuf)
}
