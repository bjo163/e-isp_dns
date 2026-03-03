"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Menu, X, Radio } from "lucide-react";
import branding from "@/configs/branding";

const navLinks = [
  { label: "Kategori",  href: "#categories" },
  { label: "Banding",   href: "#appeal" },
  { label: "Kontak",    href: "#contact" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Top accent line */}
      <div
        className="fixed top-0 left-0 right-0 h-[2px] z-[60]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, var(--brand-primary) 30%, var(--brand-accent) 70%, transparent 100%)`,
        }}
      />

      <header
        className={`fixed top-[2px] left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[var(--brand-dark-bg)]/90 backdrop-blur-2xl border-b"
            : "bg-transparent"
        }`}
        style={{ borderColor: scrolled ? "var(--brand-border)" : "transparent" }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Brand */}
            <a href="#" className="flex items-center gap-3 group">
              <div className="relative">
                <ShieldCheck
                  className="w-5 h-5 transition-colors"
                  style={{ color: "var(--brand-primary)" }}
                />
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--brand-primary)" }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-[0.15em] uppercase text-foreground">
                  Trust<span style={{ color: "var(--brand-primary)" }}>Positif</span>
                </span>
                <span
                  className="hidden sm:flex items-center gap-1.5 text-[9px] font-medium tracking-widest uppercase px-1.5 py-0.5 rounded border"
                  style={{
                    color: "var(--brand-muted)",
                    borderColor: "var(--brand-border)",
                  }}
                >
                  {branding.authority.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={branding.authority.logo}
                      alt={branding.authority.shortName}
                      className="h-4 w-auto object-contain"
                      style={{ filter: "brightness(0) invert(1)" }}
                    />
                  ) : (
                    <Radio className="w-2 h-2" />
                  )}
                  {branding.authority.shortName}
                </span>
              </div>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-0">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative px-5 py-4 text-xs font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors group"
                >
                  {link.label}
                  <span
                    className="absolute bottom-0 left-5 right-5 h-[1px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
                    style={{ background: "var(--brand-primary)" }}
                  />
                </a>
              ))}
              {/* ISP logo chip */}
              {branding.isp.logo && (
                <a
                  href={branding.isp.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 flex items-center gap-1.5 px-2 py-1 border rounded"
                  style={{
                    borderColor: "var(--brand-border)",
                    background: "var(--brand-card-bg)",
                  }}
                  title={branding.isp.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={branding.isp.logo}
                    alt={branding.isp.shortName}
                    className="h-4 w-auto object-contain"
                    style={{ filter: "brightness(0) invert(1)", opacity: 0.75 }}
                  />
                </a>
              )}
              <a
                href={branding.authority.trustpositifUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-all duration-200 border"
                style={{
                  color: "var(--brand-primary)",
                  borderColor: "var(--brand-primary)",
                  background: "rgba(239,68,68,0.06)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "var(--brand-primary)";
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)";
                  (e.currentTarget as HTMLElement).style.color = "var(--brand-primary)";
                }}
              >
                Portal Banding
              </a>
            </nav>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMenuOpen(v => !v)}
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden border-t px-6 py-4 flex flex-col gap-0"
            style={{
              background: "var(--brand-dark-bg)",
              borderColor: "var(--brand-border)",
            }}
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-xs font-medium tracking-widest uppercase border-b text-muted-foreground hover:text-foreground transition-colors"
                style={{ borderColor: "var(--brand-border)" }}
              >
                {link.label}
              </a>
            ))}
            <a
              href={branding.authority.trustpositifUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 py-2.5 text-xs font-bold tracking-widest uppercase text-center border"
              style={{
                color: "var(--brand-primary)",
                borderColor: "var(--brand-primary)",
              }}
            >
              Portal Banding
            </a>
          </div>
        )}
      </header>
    </>
  );
}

