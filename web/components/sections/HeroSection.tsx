"use client";

import { useState, useEffect } from "react";
import {
  ShieldOff,
  Globe,
  ArrowRight,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import branding from "@/configs/branding";

const TICKER_ITEMS = [
  "AKSES DIBLOKIR",
  "TRUSTPOSITIF · AKTIF",
  "KOMDIGI · REPUBLIK INDONESIA",
  "PERLINDUNGAN KONTEN NASIONAL",
  "BLOKIR OTOMATIS · DNS REDIRECT",
  "LAPORAN: trustpositif.kominfo.go.id",
  "UU ITE · PM KOMINFO NO.5/2020",
  "SISTEM AKTIF · 24/7",
];

interface HeroProps {
  blockedDomain?: string;
  reason?: string;
  category?: string;
}

export function HeroSection({ blockedDomain, reason, category }: HeroProps) {
  const { blockedPage, authority, isp } = branding;

  const [userIp, setUserIp] = useState<string>("—");
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    fetch(`${apiUrl}/myip`)
      .then((r) => r.json())
      .then((d) => setUserIp(d.ip ?? "unknown"))
      .catch(() => setUserIp("unknown"));
  }, []);

  const displayDomain = blockedDomain ?? blockedPage.blockedUrlPlaceholder;
  const displayReason = reason ?? blockedPage.defaultReason;
  const displayCategory = category ?? null;

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col overflow-hidden"
    >
      {/* Grid background */}
      <div className="absolute inset-0 hero-grid-bg opacity-[0.18]" />

      {/* Radial glow — left-biased */}
      <div className="absolute inset-0 hero-radial" />

      {/* Large ghost "403" text */}
      <div
        className="pointer-events-none absolute select-none font-black leading-none"
        style={{
          fontSize: "clamp(180px, 28vw, 420px)",
          color: "transparent",
          WebkitTextStroke: "1px rgba(239,68,68,0.07)",
          right: "-2%",
          top: "50%",
          transform: "translateY(-50%)",
          letterSpacing: "-0.05em",
          fontVariantNumeric: "tabular-nums",
          zIndex: 0,
        }}
      >
        403
      </div>

      {/* Scan line */}
      <div
        className="absolute left-0 right-0 h-[1px] pointer-events-none z-10"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--brand-primary) 40%, var(--brand-accent) 60%, transparent 100%)",
          animation: "scan-line 6s linear infinite",
          opacity: 0.4,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-6 lg:px-8 pt-28 pb-8">

        {/* System metadata bar */}
        <div
          className="flex items-center gap-4 text-[10px] font-mono tracking-widest uppercase mb-10 flex-wrap"
          style={{ color: "var(--brand-muted)" }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "var(--brand-primary)" }}
            />
            SYS:TRUSTPOSITIF
          </span>
          <span style={{ color: "var(--brand-border)" }}>·</span>
          <span>PROTOCOL:DNS-REDIRECT</span>
          <span style={{ color: "var(--brand-border)" }}>·</span>
          <span>ISP:{isp.shortName.toUpperCase()}</span>
          <span style={{ color: "var(--brand-border)" }}>·</span>
          <span>REG:{authority.shortName.toUpperCase()}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">

          {/* ── Left column ── */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            {/* Status badge */}
            <div className="inline-flex items-center gap-2 self-start">
              <span
                className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] uppercase px-3 py-1.5 border"
                style={{
                  color: "var(--brand-primary)",
                  borderColor: "rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.06)",
                }}
              >
                <TriangleAlert className="w-3 h-3" />
                {blockedPage.warningBadgeText}
              </span>
            </div>

            {/* Giant headline */}
            <div className="space-y-0">
              <div
                className="font-black leading-[0.88] tracking-[-0.03em] block"
                style={{
                  fontSize: "clamp(52px, 9vw, 128px)",
                  color: "transparent",
                  WebkitTextStroke: "1.5px rgba(255,255,255,0.18)",
                }}
              >
                SITUS INI
              </div>
              <div
                className="font-black leading-[0.88] tracking-[-0.03em] block glitch"
                data-text="DIBLOKIR"
                style={{
                  fontSize: "clamp(52px, 9vw, 128px)",
                  color: "var(--brand-primary)",
                  textShadow: "0 0 60px rgba(239,68,68,0.4)",
                }}
              >
                DIBLOKIR
              </div>
            </div>

            {/* Subtitle */}
            <p
              className="text-sm sm:text-base leading-relaxed max-w-lg"
              style={{ color: "var(--brand-muted)" }}
            >
              {blockedPage.subtitle}
            </p>

            {/* URL terminal chip */}
            <div
              className="inline-flex items-center gap-0 border rounded-none font-mono text-sm self-start overflow-hidden"
              style={{
                borderColor: "var(--brand-border)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span
                className="px-3 py-2.5 text-xs border-r flex items-center gap-2"
                style={{
                  borderColor: "var(--brand-border)",
                  background: "rgba(239,68,68,0.08)",
                  color: "var(--brand-primary)",
                }}
              >
                <Globe className="w-3 h-3" />
                BLOCKED
              </span>
              <span className="px-3 py-2.5">
                <span style={{ color: "var(--brand-muted)" }}>https://</span>
                <span className="text-foreground font-semibold">
                  {displayDomain}
                </span>
              </span>
            </div>

            {/* Reason + ISP metadata */}
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono border-l-2 pl-4"
              style={{
                borderColor: "var(--brand-primary)",
                color: "var(--brand-muted)",
              }}
            >
              <span>
                ALASAN:{" "}
                <span className="text-foreground font-semibold">
                  {displayReason.toUpperCase()}
                </span>
              </span>
              {displayCategory && (
                <span>
                  KAT:{" "}
                  <span className="text-foreground font-semibold">
                    {displayCategory.toUpperCase()}
                  </span>
                </span>
              )}
              <span>
                ISP:{" "}
                <span className="text-foreground font-semibold">
                  {isp.shortName.toUpperCase()}
                </span>
              </span>
              <span>
                AUTH:{" "}
                <span className="text-foreground font-semibold">
                  {authority.shortName.toUpperCase()}
                </span>
              </span>
              <span>
                IP:{" "}
                <span className="text-foreground font-semibold">
                  {userIp}
                </span>
              </span>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <a href={authority.trustpositifUrl} target="_blank" rel="noopener noreferrer">
                <button
                  className="flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-[0.15em] uppercase transition-all duration-200 group"
                  style={{
                    background: "var(--brand-primary)",
                    color: "#fff",
                    boxShadow: "0 0 32px 4px var(--brand-glow)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 48px 10px var(--brand-glow)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px 4px var(--brand-glow)";
                  }}
                >
                  Ajukan Banding
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </a>
              <a href="#categories">
                <button
                  className="flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-[0.15em] uppercase border transition-all duration-200"
                  style={{
                    color: "var(--brand-muted)",
                    borderColor: "var(--brand-border)",
                    background: "transparent",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = "#fff";
                    el.style.borderColor = "rgba(255,255,255,0.3)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = "var(--brand-muted)";
                    el.style.borderColor = "var(--brand-border)";
                  }}
                >
                  Pelajari Lebih Lanjut
                </button>
              </a>
            </div>

          </div>

          {/* ── Right column: visual ── */}
          <div className="hidden lg:flex lg:col-span-5 items-center justify-center">
            <div className="relative w-72 h-72 animate-float">
              {/* Outer rings */}
              {[1, 0.75, 0.5].map((scale, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border"
                  style={{
                    width:  `${scale * 100}%`,
                    height: `${scale * 100}%`,
                    inset:  `${((1 - scale) / 2) * 100}%`,
                    borderColor: `rgba(239,68,68,${0.08 + i * 0.06})`,
                    animation: `spin ${12 + i * 6}s linear infinite ${i % 2 === 1 ? "reverse" : ""}`,
                  }}
                />
              ))}

              {/* Center icon */}
              <div
                className="absolute inset-[30%] rounded-xl flex items-center justify-center animate-pulse-glow glow-ring"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.04) 100%)",
                  border: "1px solid var(--brand-primary)",
                }}
              >
                <ShieldOff
                  className="w-12 h-12"
                  style={{ color: "var(--brand-primary)" }}
                />
              </div>

              {/* Corner bracket decorations */}
              {[
                "top-0 left-0 border-t border-l",
                "top-0 right-0 border-t border-r",
                "bottom-0 left-0 border-b border-l",
                "bottom-0 right-0 border-b border-r",
              ].map((classes, i) => (
                <span
                  key={i}
                  className={`absolute w-5 h-5 ${classes}`}
                  style={{ borderColor: "var(--brand-primary)", opacity: 0.6 }}
                />
              ))}

              {/* Coordinate labels */}
              <span
                className="absolute top-2 left-6 text-[9px] font-mono"
                style={{ color: "var(--brand-border)" }}
              >
                X:403 Y:DNS
              </span>
              <span
                className="absolute bottom-2 right-4 text-[9px] font-mono"
                style={{ color: "var(--brand-border)" }}
              >
                STATUS:BLOCKED
              </span>

              {/* Wifi signal icon */}
              <div
                className="absolute -right-3 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(99,102,241,0.4)" }}
              >
                <Wifi className="w-5 h-5" />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom legal note */}
        <p
          className="mt-12 text-[10px] font-mono max-w-2xl leading-relaxed border-t pt-6"
          style={{
            color: "var(--brand-border)",
            borderColor: "var(--brand-border)",
          }}
        >
          {blockedPage.noticeText}
        </p>
      </div>

      {/* Bottom ticker */}
      <div
        className="relative border-y text-[10px] font-mono tracking-widest uppercase py-2.5 overflow-hidden"
        style={{
          borderColor: "var(--brand-border)",
          background: "rgba(239,68,68,0.03)",
        }}
      >
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-6 px-6 whitespace-nowrap" style={{ color: "var(--brand-muted)" }}>
              <span
                className="w-1 h-1 rounded-full inline-block"
                style={{ background: "var(--brand-primary)" }}
              />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}


