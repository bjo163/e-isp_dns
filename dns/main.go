package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/truspositif/dns/internal/analytics"
	"github.com/truspositif/dns/internal/api"
	"github.com/truspositif/dns/internal/cache"
	"github.com/truspositif/dns/internal/db"
	"github.com/truspositif/dns/internal/dns"
	"github.com/truspositif/dns/internal/intercept"
	"github.com/truspositif/dns/internal/metrics"
	"github.com/truspositif/dns/internal/models"
	"github.com/truspositif/dns/internal/reputation"
	"github.com/truspositif/dns/internal/scheduler"
)

func main() {
	// 0. Validate Critical Environment Variables
	if os.Getenv("JWT_SECRET") == "" {
		log.Fatal("FATAL: JWT_SECRET environment variable is not set. Application cannot start securely.")
	}
	if os.Getenv("JWT_SECRET") == "secret" || os.Getenv("JWT_SECRET") == "changeme" {
		log.Println("WARNING: JWT_SECRET is set to a default value. Please change this in production!")
	}
	if os.Getenv("REDIS_URL") == "" {
		log.Println("WARNING: REDIS_URL is not set. Application will run in standalone mode (L1 cache only).")
	}

	dbPath := flag.String("db", "data/trustpositif.db", "Path to SQLite database file")
	flag.Parse()

	// 1. Open DB & auto-migrate
	db.Init(*dbPath)

	// 2. Load operational config from DB
	var cfg models.DNSConfig
	if err := db.DB.First(&cfg, 1).Error; err != nil {
		log.Fatal("main: failed to load DNS config from DB")
	}

	// 3. Load block-page URL from branding (used by intercept redirect)
	var branding models.Branding
	blockPageURL := ""
	if err := db.DB.First(&branding, 1).Error; err == nil {
		blockPageURL = branding.BlockPageURL
	}
	// Environment override — allows docker-compose to inject the real URL
	// without having to update the DB.
	if env := os.Getenv("BLOCK_PAGE_URL"); env != "" {
		blockPageURL = env
	}

	// 4. Apply ACL default policy from config
	cache.SetACLDefault(cfg.ACLDefaultAllow)

	// 5. Start metrics sampler (1-sec ring buffer) + WebSocket hub
	metrics.StartSampler()
	metrics.RunHub()

	// 6. Start IP reputation sync scheduler
	reputation.Start(db.DB)

	// 7. Start analytics persistence (query log → SQLite) + auto-purge
	analytics.Start(db.DB)

	// 8. Start blocklist subscription scheduler (60s tick)
	scheduler.Start(db.DB)

	// 11. DNS Server logic
	log.Printf("dns: initializing on %s", cfg.ListenAddr)
	srv := dns.New(cfg.ListenAddr, cfg.UpstreamDNS, cfg.RedirectIP)

	// 9. Start Fiber HTTP admin API (non-blocking)
	app := api.New(srv)
	go func() {
		addr := ":" + cfg.HTTPPort
		log.Printf("api: Fiber listening on %s", addr)
		if err := app.Listen(addr); err != nil {
			log.Fatalf("api: failed to listen on %s (port in use?): %v", addr, err)
		}
	}()

	// 10. Start HTTP intercept server
	intSrv := intercept.New(":"+cfg.InterceptPort, blockPageURL)
	go intSrv.Start()

	// 11b. Run DNS server in a goroutine
	go srv.Start()

	// 12. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down servers...")

	// Close database connection
	if sqlDB, err := db.DB.DB(); err == nil {
		sqlDB.Close()
	}

	// Fiber shutdown
	if err := app.Shutdown(); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}
