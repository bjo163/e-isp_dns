import { ExternalLink, ShieldCheck } from "lucide-react";
import branding from "@/configs/branding";

export function SiteFooter() {
  return (
    <footer
      className="relative border-t"
      style={{
        background: "var(--brand-dark-bg)",
        borderColor: "var(--brand-border)",
      }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--brand-border) 20%, var(--brand-border) 80%, transparent 100%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
              <span className="text-xs font-bold tracking-[0.15em] uppercase">
                Trust<span style={{ color: "var(--brand-primary)" }}>Positif</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed max-w-xs" style={{ color: "var(--brand-muted)" }}>
              Sistem pemblokiran konten nasional Republik Indonesia berdasarkan regulasi Kementerian Komunikasi dan Digital.
            </p>
            <div
              className="text-[10px] font-mono tracking-wider"
              style={{ color: "var(--brand-border)" }}
            >
              SYS:TRUSTPOSITIF · v2.0 · AKTIF
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden md:block md:col-span-1" />

          {/* Authority */}
          <div className="md:col-span-3">
            <p
              className="text-[9px] font-bold tracking-[0.2em] uppercase mb-4"
              style={{ color: "var(--brand-muted)" }}
            >
              Regulator
            </p>
            <div className="space-y-1.5">
              <p className="text-xs text-foreground font-medium">{branding.authority.name}</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                {branding.authority.address}
              </p>
              <a
                href={`mailto:${branding.authority.email}`}
                className="text-[11px] transition-colors hover:text-foreground"
                style={{ color: "var(--brand-accent)" }}
              >
                {branding.authority.email}
              </a>
            </div>
          </div>

          {/* ISP */}
          <div className="md:col-span-4">
            <p
              className="text-[9px] font-bold tracking-[0.2em] uppercase mb-4"
              style={{ color: "var(--brand-muted)" }}
            >
              Internet Service Provider
            </p>
            <div className="space-y-1.5">
              {branding.isp.logo && (
                <a
                  href={branding.isp.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-2 border rounded mb-1"
                  style={{ background: "#fff", borderColor: "var(--brand-border)", display: "inline-flex" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={branding.isp.logo}
                    alt={branding.isp.shortName}
                    className="h-6 w-auto object-contain"
                  />
                </a>
              )}
              <p className="text-xs text-foreground font-medium">{branding.isp.name}</p>
              <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>
                Helpline: {branding.isp.helpline}
              </p>
              <a
                href={branding.isp.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] flex items-center gap-1 transition-colors hover:text-foreground"
                style={{ color: "var(--brand-accent)" }}
              >
                {branding.isp.website.replace("https://", "")}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Official logos strip */}
        <div
          className="mt-10 pt-8 border-t"
          style={{ borderColor: "var(--brand-border)" }}
        >
          <p
            className="text-[9px] font-bold tracking-[0.2em] uppercase mb-5"
            style={{ color: "var(--brand-muted)" }}
          >
            Program &amp; Kemitraan Resmi
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {/* Komdigi */}
            <a
              href={branding.authority.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-5 py-3 border rounded hover:border-white/20 transition-colors"
              style={{ background: "var(--brand-card-bg)", borderColor: "var(--brand-border)" }}
              title={branding.authority.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.assets.komdigiLogo}
                alt="Komdigi"
                className="h-10 w-auto object-contain"
              />
            </a>
            {/* Cyber Drone 9 */}
            <a
              href={branding.assets.cyberDrone9Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-5 py-3 border rounded hover:border-white/20 transition-colors"
              style={{ background: "var(--brand-card-bg)", borderColor: "var(--brand-border)" }}
              title="Cyber Drone 9 — Komdigi"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.assets.cyberDrone9Logo}
                alt="Cyber Drone 9"
                className="h-10 w-auto object-contain"
              />
            </a>
            {/* AduanKonten */}
            <a
              href={branding.assets.aduanKontenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-5 py-3 border rounded hover:border-white/20 transition-colors"
              style={{ background: "var(--brand-card-bg)", borderColor: "var(--brand-border)" }}
              title="AduanKonten"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.assets.aduanKontenLogo}
                alt="AduanKonten"
                className="h-10 w-auto object-contain"
              />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ borderColor: "var(--brand-border)" }}
        >
          <p className="text-[10px] font-mono" style={{ color: "var(--brand-border)" }}>
            {branding.meta.footerLegal}
          </p>
          <a
            href={branding.authority.trustpositifUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono flex items-center gap-1 transition-colors hover:text-foreground whitespace-nowrap"
            style={{ color: "var(--brand-primary)" }}
          >
            trustpositif.kominfo.go.id
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}

