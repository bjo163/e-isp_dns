// ============================================================
//  TRUSTPOSITIF — Centralized Branding Config
//  Swap any value here to rebrand the entire site instantly.
// ============================================================

export interface BrandingTheme {
  /** Primary accent — used on CTAs, badges, glow effects */
  primaryColor: string;
  /** Secondary accent — used on step numbers, links */
  accentColor: string;
  /** Main page background */
  darkBg: string;
  /** Card / surface background */
  cardBg: string;
  /** Border color */
  borderColor: string;
  /** Glow shadow color (same hue as primary, lower opacity) */
  glowColor: string;
  /** Muted foreground text color */
  mutedColor: string;
}

export interface Authority {
  /** Full official name */
  name: string;
  /** Short name / acronym */
  shortName: string;
  /** Path or URL to logo image. null = use text fallback */
  logo: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
  /** Main TrustPositif portal URL */
  trustpositifUrl: string;
}

export interface ISP {
  name: string;
  shortName: string;
  logo: string | null;
  helpline: string;
  email: string;
  website: string;
}

export interface BlockedPageConfig {
  title: string;
  subtitle: string;
  /** Placeholder shown as the blocked URL */
  blockedUrlPlaceholder: string;
  /** Default reason shown when no `reason` param present */
  defaultReason: string;
  warningBadgeText: string;
  noticeText: string;
}

export interface Category {
  label: string;
  /** Lucide icon name (kebab-case) */
  icon: string;
  description: string;
}

export interface AppealStep {
  title: string;
  description: string;
}

export interface AppealConfig {
  title: string;
  subtitle: string;
  steps: AppealStep[];
  /** URL to the official appeal / unblock portal */
  portalUrl: string;
  portalLabel: string;
  /** Estimated processing time in working days */
  processDays: number;
}

export interface ContactCard {
  role: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export interface ContactConfig {
  title: string;
  subtitle: string;
  authority: ContactCard;
  isp: ContactCard;
  reportEmail: string;
}

export interface MetaConfig {
  siteTitle: string;
  siteDescription: string;
  footerLegal: string;
  year: number;
}

/**
 * Official asset URLs — logos served from the TrustPositif CDN or local /public.
 * Swap any value to point at a locally hosted copy.
 */
export interface BrandingAssets {
  /** Kementerian Komunikasi dan Digital official logo */
  komdigiLogo: string;
  /** Cyber Drone 9 — Komdigi's active content-monitoring program logo */
  cyberDrone9Logo: string;
  /** AduanKonten — official public complaint portal logo */
  aduanKontenLogo: string;
  /** AduanKonten portal URL */
  aduanKontenUrl: string;
  /** Cyber Drone 9 info URL */
  cyberDrone9Url: string;
  /** ISP (MyCocolink) logo URL */
  ispLogo: string;
  /**
   * Image format hint for the CDN images — used for alt text generation.
   * 'external' = cross-origin, no Next.js <Image> optimisation unless
   * you add the domain to next.config.ts remotePatterns.
   */
  source: 'external' | 'local';
}

export interface Branding {
  theme: BrandingTheme;
  authority: Authority;
  isp: ISP;
  blockedPage: BlockedPageConfig;
  categories: Category[];
  appeal: AppealConfig;
  contact: ContactConfig;
  meta: MetaConfig;
  assets: BrandingAssets;
}

// ============================================================
//  DEFAULT VALUES — Edit freely
// ============================================================
const branding: Branding = {
  // ── Theme ─────────────────────────────────────────────────
  theme: {
    primaryColor: "#ef4444",       // Red-500 — danger / block
    accentColor:  "#6366f1",       // Indigo-500 — CTAs / links
    darkBg:       "#080810",       // Near-black
    cardBg:       "#0f0f1a",       // Slightly lighter surface
    borderColor:  "#1e1e2e",       // Subtle border
    glowColor:    "rgba(239,68,68,0.35)",
    mutedColor:   "#71717a",       // Zinc-500
  },

  // ── Regulatory Authority (Komdigi / Kominfo) ──────────────
  authority: {
    name:             "Kementerian Komunikasi dan Digital",
    shortName:        "Komdigi",
    logo:             "https://trustpositif.komdigi.go.id/assets/images/komdigi.png",
    address:          "Jl. Medan Merdeka Barat No.9, Jakarta Pusat 10110, DKI Jakarta",
    phone:            "+62 21 3452841",
    email:            "pengaduan@kominfo.go.id",
    website:          "https://www.komdigi.go.id",
    trustpositifUrl:  "https://trustpositif.kominfo.go.id",
  },

  // ── Internet Service Provider ─────────────────────────────
  isp: {
    name:      "PT Lentera Abadi Solusinet",
    shortName: "MyCocolink",
    logo:      "https://db-1.apps.mycocolink.com/api/files/pbc_4001548771/ljo7zpr51ze7322/mycocolink_iuibj2xxle.png",
    helpline:  "+62 811-3615-153",
    email:     "support@mycocolink.com",
    website:   "https://mycocolink.com",
  },

  // ── Blocked Page Content ──────────────────────────────────
  blockedPage: {
    title:                "Situs Ini Diblokir",
    subtitle:             "Akses ke situs yang Anda tuju telah diblokir berdasarkan regulasi Kementerian Komunikasi dan Digital Republik Indonesia.",
    blockedUrlPlaceholder: "contoh-situs-terblokir.com",
    defaultReason:        "Konten Tidak Sesuai Regulasi",
    warningBadgeText:     "AKSES DIBLOKIR",
    noticeText:           "Pemblokiran dilakukan sesuai Peraturan Menteri Komunikasi dan Informatika No. 5 Tahun 2020 tentang Penyelenggara Sistem Elektronik Lingkup Privat.",
  },

  // ── Content Categories ────────────────────────────────────
  categories: [
    {
      label:       "Pornografi",
      icon:        "shield-ban",
      description: "Konten pornografi dan eksploitasi seksual yang melanggar UU ITE dan norma kesusilaan.",
    },
    {
      label:       "Perjudian Online",
      icon:        "dice-5",
      description: "Platform judi daring, taruhan ilegal, dan situs kasino online tanpa izin.",
    },
    {
      label:       "SARA & Radikalisme",
      icon:        "flame",
      description: "Konten yang mengandung ujaran kebencian berbasis suku, agama, ras, dan antargolongan.",
    },
    {
      label:       "Penipuan & Phishing",
      icon:        "fish",
      description: "Situs penipuan daring, phishing, dan pencurian data identitas.",
    },
    {
      label:       "Malware & Ransomware",
      icon:        "bug",
      description: "Distribusi perangkat lunak berbahaya, ransomware, spyware, dan botnet.",
    },
    {
      label:       "Pelanggaran Hak Cipta",
      icon:        "copyright",
      description: "Distribusi konten bajakan, streaming ilegal, dan pelanggaran kekayaan intelektual.",
    },
    {
      label:       "Narkoba & Zat Berbahaya",
      icon:        "pill",
      description: "Penjualan atau promosi narkotika, psikotropika, dan zat adiktif terlarang.",
    },
    {
      label:       "Terorisme",
      icon:        "alert-triangle",
      description: "Propaganda, rekrutmen, dan pendanaan organisasi teroris.",
    },
  ],

  // ── Appeal / Unblock Process ──────────────────────────────
  appeal: {
    title:    "Cara Mengajukan Banding",
    subtitle: "Jika Anda yakin situs Anda diblokir secara keliru, ikuti prosedur berikut untuk mengajukan peninjauan ulang.",
    steps: [
      {
        title:       "Verifikasi Identitas",
        description: "Pastikan Anda adalah pemilik atau pengelola sah situs tersebut. Siapkan dokumen kepemilikan domain dan identitas diri.",
      },
      {
        title:       "Akses Portal TrustPositif",
        description: "Kunjungi portal resmi TrustPositif dan masuk menggunakan akun resmi Anda atau daftarkan akun baru.",
      },
      {
        title:       "Isi Formulir Banding",
        description: "Lengkapi formulir pengajuan banding dengan URL yang ingin ditinjau, alasan, dan bukti pendukung.",
      },
      {
        title:       "Tunggu Proses Verifikasi",
        description: "Tim Komdigi akan meninjau pengajuan Anda dalam waktu 5–14 hari kerja dan mengirimkan notifikasi melalui email.",
      },
    ],
    portalUrl:   "https://trustpositif.kominfo.go.id",
    portalLabel: "Buka Portal TrustPositif",
    processDays: 14,
  },

  // ── Contact Information ───────────────────────────────────
  contact: {
    title:    "Hubungi Kami",
    subtitle: "Punya pertanyaan atau laporan? Hubungi regulator atau ISP Anda langsung.",
    authority: {
      role:    "Regulator",
      name:    "Kementerian Komunikasi dan Digital",
      address: "Jl. Medan Merdeka Barat No.9, Jakarta Pusat 10110",
      phone:   "+62 21 3452841",
      email:   "pengaduan@kominfo.go.id",
      website: "https://www.komdigi.go.id",
    },
    isp: {
      role:    "Internet Service Provider",
      name:    "PT Lentera Abadi Solusinet [AS153615]",
      address: "Indonesia",
      phone:   "+62 811-3615-153",
      email:   "support@mycocolink.com",
      website: "https://mycocolink.com",
    },
    reportEmail: "pengaduan@kominfo.go.id",
  },

  // ── Site Meta ─────────────────────────────────────────────
  meta: {
    siteTitle:       "Akses Diblokir — TrustPositif | Komdigi",
    siteDescription: "Halaman pemberitahuan pemblokiran situs oleh Kementerian Komunikasi dan Digital Republik Indonesia melalui sistem TrustPositif.",
    footerLegal:     "© 2025 Kementerian Komunikasi dan Digital Republik Indonesia. Seluruh hak dilindungi undang-undang.",
    year:            2025,
  },

  // ── Official Assets / Logos ───────────────────────────────
  // Images served directly from the TrustPositif CDN.
  // To use local copies: download to /public/images/, change
  // the paths to "/images/xxx.png", and set source: 'local'.
  assets: {
    komdigiLogo:      "https://trustpositif.komdigi.go.id/assets/images/komdigi.png",
    cyberDrone9Logo:  "https://trustpositif.komdigi.go.id/assets/images/cyberdrone.jpeg",
    aduanKontenLogo:  "https://trustpositif.komdigi.go.id/assets/images/aduan_.png",
    aduanKontenUrl:   "https://aduankonten.id",
    cyberDrone9Url:   "https://trustpositif.komdigi.go.id/normalisasi",
    ispLogo:          "https://db-1.apps.mycocolink.com/api/files/pbc_4001548771/ljo7zpr51ze7322/mycocolink_iuibj2xxle.png",
    source:           "external",
  },
};

export default branding;
