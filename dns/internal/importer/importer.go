// Package importer provides URL-based blocklist import logic shared by
// both the HTTP API handler and the cron scheduler.
package importer

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/truspositif/dns/internal/cache"
	"github.com/truspositif/dns/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Result describes the outcome of an import operation.
type Result struct {
	Parsed   int   `json:"parsed"`
	Inserted int64 `json:"inserted"`
	Skipped  int64 `json:"skipped"`
}

// FromURL downloads a blocklist from url, parses it, and upserts domains
// into the database with the given category and reason.
func FromURL(db *gorm.DB, url, category, reason string) (Result, error) {
	resp, err := http.Get(url)
	if err != nil {
		return Result{}, fmt.Errorf("gagal mengunduh: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20)) // 10 MB max
	if err != nil {
		return Result{}, fmt.Errorf("gagal membaca response: %w", err)
	}

	entries := Parse(string(body), category, reason)
	if len(entries) == 0 {
		return Result{}, fmt.Errorf("tidak ada domain valid ditemukan")
	}

	result := db.Clauses(clause.OnConflict{DoNothing: true}).CreateInBatches(entries, 500)
	inserted := result.RowsAffected

	go cache.Reload(db)

	return Result{
		Parsed:   len(entries),
		Inserted: inserted,
		Skipped:  int64(len(entries)) - inserted,
	}, nil
}

// Parse extracts domain entries from raw blocklist text.
// Supports hosts-file, adblock (||domain^), and plain domain formats.
func Parse(text, category, reason string) []models.BlockedDomain {
	var entries []models.BlockedDomain
	seen := make(map[string]bool)

	scanner := bufio.NewScanner(strings.NewReader(text))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "!") {
			continue
		}

		var domain string

		// hosts-file format: "0.0.0.0 domain" or "127.0.0.1 domain"
		if strings.HasPrefix(line, "0.0.0.0") || strings.HasPrefix(line, "127.0.0.1") {
			if parts := strings.Fields(line); len(parts) >= 2 {
				domain = strings.ToLower(parts[1])
			}
		} else if strings.HasPrefix(line, "||") && strings.HasSuffix(line, "^") {
			// adblock format: "||domain^"
			domain = strings.ToLower(line[2 : len(line)-1])
		} else if !strings.Contains(line, " ") && strings.Contains(line, ".") {
			// plain domain
			domain = strings.ToLower(line)
		}

		domain = strings.TrimPrefix(domain, "www.")
		if domain == "" || strings.Contains(domain, "/") || seen[domain] || domain == "localhost" {
			continue
		}
		seen[domain] = true
		entries = append(entries, models.BlockedDomain{
			Domain:   domain,
			Category: category,
			Reason:   reason,
			Active:   true,
		})
	}
	return entries
}
