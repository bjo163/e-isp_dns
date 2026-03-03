package api

import (
"bufio"
"fmt"
"io"
"net/http"
"strings"

"github.com/gofiber/fiber/v2"
"github.com/gofiber/fiber/v2/middleware/cors"
"github.com/gofiber/fiber/v2/middleware/logger"
"github.com/truspositif/dns/internal/auth"
"github.com/truspositif/dns/internal/cache"
"github.com/truspositif/dns/internal/db"
"github.com/truspositif/dns/internal/metrics"
"github.com/truspositif/dns/internal/models"
"golang.org/x/crypto/bcrypt"
"gorm.io/gorm/clause"
)

func New() *fiber.App {
app := fiber.New(fiber.Config{AppName: "TrustPositif DNS Admin API"})
app.Use(logger.New())
app.Use(cors.New(cors.Config{
AllowOrigins: "*",
AllowHeaders: "Origin, Content-Type, Accept, Authorization",
AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
}))

//  Public 
app.Get("/health", func(c *fiber.Ctx) error {
return c.JSON(fiber.Map{"status": "ok"})
})
app.Post("/api/auth/login", handleLogin)

// Returns the real client IP. Used by the block page to display the user IP.
// Reads X-Real-IP (set by Caddy/nginx) then X-Forwarded-For then socket IP.
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

// Live metrics — public, used by the block page to show real-time stats.
app.Get("/metrics", func(c *fiber.Ctx) error {
return c.JSON(metrics.Snapshot())
})

//  Protected 
v1 := app.Group("/api", auth.Middleware())
v1.Post("/auth/change-password", handleChangePassword)

v1.Get("/branding", getBranding)
v1.Put("/branding", updateBranding)

v1.Get("/domains", listDomains)
v1.Post("/domains", addDomain)
v1.Put("/domains/:id", updateDomain)
v1.Delete("/domains/:id", deleteDomain)
v1.Post("/domains/import", importDomains)

v1.Get("/config", getDNSConfig)
v1.Put("/config", updateDNSConfig)

return app
}

//  Auth 

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
hash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
db.DB.Model(&user).Update("password_hash", string(hash))
return c.JSON(fiber.Map{"message": "password berhasil diubah"})
}

//  Branding 

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

//  Blocked Domains 

func listDomains(c *fiber.Ctx) error {
var domains []models.BlockedDomain
db.DB.Order("created_at desc").Find(&domains)
return c.JSON(domains)
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
db.DB.Save(&d)
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

type importRequest struct {
URL      string `json:"url"`
Category string `json:"category"`
Reason   string `json:"reason"`
}

// importDomains downloads a plain-text or hosts-format blocklist from a URL
// and bulk-upserts entries into the database.
// Supported formats:
//   - plain domain list (one domain per line)
//   - hosts file (127.0.0.1 domain or 0.0.0.0 domain)
//   - adblock (||domain^)
func importDomains(c *fiber.Ctx) error {
var req importRequest
if err := c.BodyParser(&req); err != nil || req.URL == "" {
return c.Status(400).JSON(fiber.Map{"error": "url required"})
}

resp, err := http.Get(req.URL)
if err != nil {
return c.Status(502).JSON(fiber.Map{"error": fmt.Sprintf("gagal mengunduh: %v", err)})
}
defer resp.Body.Close()

body, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20)) // max 10 MB
if err != nil {
return c.Status(502).JSON(fiber.Map{"error": "gagal membaca response"})
}

var entries []models.BlockedDomain
seen := map[string]bool{}

scanner := bufio.NewScanner(strings.NewReader(string(body)))
for scanner.Scan() {
line := strings.TrimSpace(scanner.Text())
if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "!") {
continue
}

var domain string
if strings.HasPrefix(line, "0.0.0.0") || strings.HasPrefix(line, "127.0.0.1") {
if parts := strings.Fields(line); len(parts) >= 2 {
domain = strings.ToLower(parts[1])
}
} else if strings.HasPrefix(line, "||") && strings.HasSuffix(line, "^") {
domain = strings.ToLower(line[2 : len(line)-1])
} else if !strings.Contains(line, " ") && strings.Contains(line, ".") {
domain = strings.ToLower(line)
}

domain = strings.TrimPrefix(domain, "www.")
if domain == "" || strings.Contains(domain, "/") || seen[domain] {
continue
}
seen[domain] = true
entries = append(entries, models.BlockedDomain{
Domain: domain, Category: req.Category, Reason: req.Reason, Active: true,
})
}

if len(entries) == 0 {
return c.Status(400).JSON(fiber.Map{"error": "tidak ada domain valid ditemukan"})
}

result := db.DB.Clauses(clause.OnConflict{DoNothing: true}).CreateInBatches(entries, 500)
inserted := result.RowsAffected
go cache.Reload(db.DB)
return c.JSON(fiber.Map{
"parsed":   len(entries),
"inserted": inserted,
"skipped":  int64(len(entries)) - inserted,
})
}

//  DNS Config 

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
db.DB.Save(&cfg)
return c.JSON(cfg)
}
