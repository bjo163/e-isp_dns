package db

import (
"log"

"github.com/glebarez/sqlite"
"github.com/truspositif/dns/internal/cache"
"github.com/truspositif/dns/internal/models"
"golang.org/x/crypto/bcrypt"
"gorm.io/gorm"
"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Init(dsn string) {
var err error
DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
Logger: logger.Default.LogMode(logger.Warn),
})
if err != nil {
log.Fatalf("db: failed to open %s: %v", dsn, err)
}
if err := DB.AutoMigrate(
&models.AdminUser{},
&models.Branding{},
&models.BlockedDomain{},
&models.DNSConfig{},
); err != nil {
log.Fatalf("db: auto-migrate failed: %v", err)
}
seed(DB)
// Warm the two-layer domain cache (Redis L2 + sync.Map L1).
cache.InitFromEnv(DB)
log.Printf("db: ready at %s", dsn)
}

func seed(db *gorm.DB) {
var u models.AdminUser
if db.Where("username = ?", "admin").First(&u).Error != nil {
hash, _ := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
db.Create(&models.AdminUser{Username: "admin", PasswordHash: string(hash)})
log.Println("db: seeded admin/admin -- CHANGE PASSWORD after first login")
}

var b models.Branding
if db.First(&b).Error != nil {
db.Create(&models.Branding{
ID:           1,
SiteName:     "TrustPositif",
BlockPageURL: "http://127.0.0.1:3000",

HeroTitle:             "Situs Ini Diblokir",
HeroSubtitle:          "Akses ke situs yang Anda tuju telah diblokir berdasarkan regulasi Kementerian Komunikasi dan Digital Republik Indonesia.",
WarningBadgeText:      "AKSES DIBLOKIR",
BlockedURLPlaceholder: "contoh-situs-terblokir.com",
DefaultReason:         "Konten Tidak Sesuai Regulasi",
NoticeText:            "Pemblokiran dilakukan sesuai Peraturan Menteri Komunikasi dan Informatika No. 5 Tahun 2020 tentang Penyelenggara Sistem Elektronik Lingkup Privat.",

CategoryTitle:    "Jenis Konten yang Diblokir",
CategorySubtitle: "Berikut kategori konten yang termasuk dalam daftar pemblokiran TrustPositif berdasarkan peraturan yang berlaku.",

AppealTitle:       "Cara Mengajukan Banding",
AppealSubtitle:    "Jika Anda yakin situs Anda diblokir secara keliru, ikuti prosedur berikut untuk mengajukan peninjauan ulang.",
AppealPortalLabel: "Buka Portal TrustPositif",
AppealProcessDays: 14,

ContactTitle:    "Hubungi Kami",
ContactSubtitle: "Punya pertanyaan atau laporan? Hubungi regulator atau ISP Anda langsung.",
FooterLegal:     "Kementerian Komunikasi dan Digital Republik Indonesia. Seluruh hak dilindungi undang-undang.",

AuthorityName:      "Kementerian Komunikasi dan Digital",
AuthorityShortName: "Komdigi",
AuthorityLogo:      "https://trustpositif.komdigi.go.id/assets/images/komdigi.png",
AuthorityAddress:   "Jl. Medan Merdeka Barat No.9, Jakarta Pusat 10110",
AuthorityPhone:     "+62 21 3452841",
AuthorityEmail:     "pengaduan@kominfo.go.id",
AuthorityWebsite:   "https://www.komdigi.go.id",
TrustpositifURL:    "https://trustpositif.kominfo.go.id",

ISPName:      "PT Lentera Abadi Solusinet",
ISPShortName: "MyCocolink",
ISPLogo:      "https://db-1.apps.mycocolink.com/api/files/pbc_4001548771/ljo7zpr51ze7322/mycocolink_iuibj2xxle.png",
ISPHelpline:  "+62 811-3615-153",
ISPEmail:     "support@mycocolink.com",
ISPWebsite:   "https://mycocolink.com",
ISPAN:        "AS153615",

PrimaryColor: "#ef4444",
AccentColor:  "#6366f1",

KomdigiLogo:     "https://trustpositif.komdigi.go.id/assets/images/komdigi.png",
CyberDrone9Logo: "https://trustpositif.komdigi.go.id/assets/images/cyberdrone.jpeg",
AduanKontenLogo: "https://trustpositif.komdigi.go.id/assets/images/aduan_.png",
AduanKontenURL:  "https://aduankonten.id",
CyberDrone9URL:  "https://trustpositif.komdigi.go.id/normalisasi",
})
}

var cfg models.DNSConfig
if db.First(&cfg).Error != nil {
db.Create(&models.DNSConfig{
ID:            1,
ListenAddr:    "0.0.0.0:53",
UpstreamDNS:   "8.8.8.8:53",
RedirectIP:    "127.0.0.1",
HTTPPort:      "8080",
InterceptPort: "8081", // internal; Caddy :80 catch-all forwards here
})
}
}
