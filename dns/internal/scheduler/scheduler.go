// Package scheduler runs periodic blocklist imports based on
// BlocklistSubscription records in the database.
//
// Uses a simple time.Ticker (1 minute) — no external cron dependency.
// Each tick checks which subscriptions are due (last_run_at + interval_hours < now)
// and runs them sequentially.
package scheduler

import (
	"log"
	"time"

	"github.com/truspositif/dns/internal/importer"
	"github.com/truspositif/dns/internal/models"
	"gorm.io/gorm"
)

var database *gorm.DB

// Start begins the scheduler background goroutine.
func Start(db *gorm.DB) {
	database = db
	go loop()
	log.Println("scheduler: started (checking every 60s)")
}

func loop() {
	// Run due subscriptions immediately on startup
	runDue()

	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		runDue()
	}
}

func runDue() {
	var subs []models.BlocklistSubscription
	database.Where("enabled = ?", true).Find(&subs)

	now := time.Now()
	for _, s := range subs {
		if !isDue(s, now) {
			continue
		}
		RunSubscription(s.ID)
	}
}

func isDue(s models.BlocklistSubscription, now time.Time) bool {
	if s.LastRunAt == nil {
		return true // never ran
	}
	next := s.LastRunAt.Add(time.Duration(s.IntervalHours) * time.Hour)
	return now.After(next)
}

// RunSubscription executes a single subscription import by ID.
// Can be called from the scheduler loop or manually from the API.
func RunSubscription(id uint) {
	var s models.BlocklistSubscription
	if err := database.First(&s, id).Error; err != nil {
		return
	}

	log.Printf("scheduler: running subscription %d (%s) from %s", s.ID, s.Name, s.URL)

	result, err := importer.FromURL(database, s.URL, s.Category, s.Reason)
	now := time.Now()
	s.LastRunAt = &now

	if err != nil {
		s.LastError = err.Error()
		s.LastCount = 0
		log.Printf("scheduler: subscription %d failed: %v", s.ID, err)
	} else {
		s.LastError = ""
		s.LastCount = result.Inserted
		log.Printf("scheduler: subscription %d done — parsed %d, inserted %d, skipped %d",
			s.ID, result.Parsed, result.Inserted, result.Skipped)
	}

	database.Save(&s)
}
