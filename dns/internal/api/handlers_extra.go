package api

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/truspositif/dns/internal/db"
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
	if ip := c.Query("ip"); ip != "" {
		q = q.Where("client = ?", ip)
	}
	if domain := c.Query("domain"); domain != "" {
		q = q.Where("domain LIKE ?", "%"+domain+"%")
	}
	var total int64
	q.Count(&total)
	var logs []models.QueryLogEntry
	q.Order("created_at desc").Offset((page - 1) * limit).Limit(limit).Find(&logs)
	return c.JSON(fiber.Map{"data": logs, "total": total, "page": page, "limit": limit})
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
	// TODO: Call external enrichment API (ipinfo.io, ip-api.com, etc), cache result
	return c.Status(404).JSON(fiber.Map{"error": "not found"})
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
