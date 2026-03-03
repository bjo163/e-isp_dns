package main

import (
	"flag"
	"log"
	"os"

	"github.com/truspositif/dns/internal/analytics"
	"github.com/truspositif/dns/internal/api"
	"github.com/truspositif/dns/internal/cache"
	"github.com/truspositif/dns/internal/db"
	"github.com/truspositif/dns/internal/dns"
	"github.com/truspositif/dns/internal/intercept"
	"github.com/truspositif/dns/internal/metrics"
	"github.com/truspositif/dns/internal/models"
	"github.com/truspositif/dns/internal/scheduler"
	"github.com/truspositif/dns/internal/reputation"
)

func main() {
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

	// Start IP reputation sync scheduler
	reputation.Start(db.DB)

	// 6. Start analytics persistence (query log → SQLite) + auto-purge
	analytics.Start(db.DB)

	// 7. Start blocklist subscription scheduler (60s tick)
	scheduler.Start(db.DB)

	// 8. Start Fiber HTTP admin API (non-blocking)
	app := api.New()
	go func() {
		addr := ":" + cfg.HTTPPort
		log.Printf("api: Fiber listening on %s", addr)
		if err := app.Listen(addr); err != nil {
			log.Fatalf("api: failed to listen on %s (port in use?): %v", addr, err)
		}
	}()

	// 6. Start HTTP intercept server on :80 — redirects blocked requests
	//    from the browser to the block page with domain/reason/cat params.
	intSrv := intercept.New(":"+cfg.InterceptPort, blockPageURL)
	go intSrv.Start()

	// 7. Start DNS server (blocks)
	log.Printf("dns: starting on %s (upstream %s, redirect %s)", cfg.ListenAddr, cfg.UpstreamDNS, cfg.RedirectIP)
	srv := dns.New(cfg.ListenAddr, cfg.UpstreamDNS, cfg.RedirectIP)
	srv.Start()
}
