package main

import (
	"flag"
	"log"

	"github.com/truspositif/dns/internal/api"
	"github.com/truspositif/dns/internal/db"
	"github.com/truspositif/dns/internal/dns"
	"github.com/truspositif/dns/internal/intercept"
	"github.com/truspositif/dns/internal/models"
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

	// 4. Start Fiber HTTP admin API (non-blocking)
	app := api.New()
	go func() {
		addr := ":" + cfg.HTTPPort
		log.Printf("api: Fiber listening on %s", addr)
		if err := app.Listen(addr); err != nil {
			log.Fatalf("api: %v", err)
		}
	}()

	// 5. Start HTTP intercept server on :80 — redirects blocked requests
	//    from the browser to the block page with domain/reason/cat params.
	intSrv := intercept.New(":"+cfg.InterceptPort, blockPageURL)
	go intSrv.Start()

	// 6. Start DNS server (blocks)
	srv := dns.New(cfg.ListenAddr, cfg.UpstreamDNS, cfg.RedirectIP)
	srv.Start()
}
