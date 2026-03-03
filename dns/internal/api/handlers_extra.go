package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/truspositif/dns/internal/db"
	"github.com/truspositif/dns/internal/models"
	"github.com/truspositif/dns/internal/reputation"
	"strconv"
)

// ═════════════════════════════════════════════════════════════════════════════
//  QUERY LOG API
// ═════════════════════════════════════════════════════════════════════════════
func handleQueryLog(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	if page < 1 { page = 1 }
	if limit < 1 || limit > 1000 { limit = 100 }

	q := db.DB.Model(&models.QueryLogEntry{})
	if ip := c.Query("ip"); ip != "" {
		q = q.Where("client = ?", ip)
	}
	if domain := c.Query("domain"); domain != "" {
		q = q.Where("domain LIKE ?", "%"+domain+"%")
	}
	var total int64
	q.Count(&total)
	var logs []models.QueryLogEntry
	q.Order("created_at desc").Offset((page-1)*limit).Limit(limit).Find(&logs)
	return c.JSON(fiber.Map{"data": logs, "total": total, "page": page, "limit": limit})
}

// ═════════════════════════════════════════════════════════════════════════════
//  IP ENRICHMENT API
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
	// TODO: Call external enrichment API (ipinfo.io, ip-api.com, etc), cache result
	return c.Status(404).JSON(fiber.Map{"error": "not found"})
}

// ═════════════════════════════════════════════════════════════════════════════
//  IP REPUTATION API
// ═════════════════════════════════════════════════════════════════════════════
func handleReputation(c *fiber.Ctx) error {
	ip := c.Query("ip")
	if ip == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ip required"})
	}
	entries := reputation.Check(db.DB, ip)
	return c.JSON(entries)
}
