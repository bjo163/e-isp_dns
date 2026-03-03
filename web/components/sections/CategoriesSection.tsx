"use client";

import {
  ShieldBan,
  Dice5,
  Flame,
  Fish,
  Bug,
  Copyright,
  Pill,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import branding from "@/configs/branding";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  "shield-ban":     ShieldBan,
  "dice-5":         Dice5,
  "flame":          Flame,
  "fish":           Fish,
  "bug":            Bug,
  "copyright":      Copyright,
  "pill":           Pill,
  "alert-triangle": AlertTriangle,
  "shield-alert":   ShieldAlert,
};

export function CategoriesSection() {
  const total = branding.categories.length;

  return (
    <section
      id="categories"
      className="relative py-24"
      style={{ background: "var(--brand-dark-bg)" }}
    >
      {/* Vertical rule */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-16"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--brand-border))",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── Header row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          <div className="lg:col-span-5 flex flex-col justify-end">
            {/* Ghost number */}
            <div
              className="font-black leading-none mb-2 select-none"
              style={{
                fontSize: "clamp(64px, 10vw, 120px)",
                color: "transparent",
                WebkitTextStroke: "1px var(--brand-border)",
                letterSpacing: "-0.04em",
              }}
            >
              {String(total).padStart(2, "0")}
            </div>
            <div
              className="text-[10px] font-mono tracking-[0.25em] uppercase mb-4"
              style={{ color: "var(--brand-muted)" }}
            >
              Kategori · Konten Terlarang
            </div>
            <h2
              className="font-black tracking-tight leading-[1.0]"
              style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
            >
              Jenis Konten
              <br />
              yang Diblokir
            </h2>
          </div>

          <div className="lg:col-span-1" />

          <div className="lg:col-span-6 flex flex-col justify-end gap-4">
            <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              Berikut kategori konten yang termasuk dalam daftar pemblokiran TrustPositif berdasarkan peraturan yang berlaku. Komdigi dapat menambahkan kategori baru sesuai perkembangan regulasi.
            </p>
            <div
              className="h-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-border) 60%, transparent 100%)",
              }}
            />
          </div>
        </div>

        {/* ── Category list (manifest style) ── */}
        <div className="border-t" style={{ borderColor: "var(--brand-border)" }}>
          {branding.categories.map((cat, i) => {
            const Icon = iconMap[cat.icon] ?? ShieldAlert;
            return (
              <div
                key={i}
                className="group grid grid-cols-12 gap-4 items-start py-5 border-b cursor-default transition-all duration-200"
                style={{
                  borderColor: "var(--brand-border)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.03)";
                  (e.currentTarget as HTMLElement).style.paddingLeft = "8px";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.paddingLeft = "0px";
                }}
              >
                {/* Index */}
                <div
                  className="col-span-1 font-mono text-xs pt-1"
                  style={{ color: "var(--brand-border)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>

                {/* Icon */}
                <div className="col-span-1 pt-0.5">
                  <div
                    className="w-7 h-7 flex items-center justify-center border transition-colors duration-200"
                    style={{
                      borderColor: "var(--brand-border)",
                      background: "rgba(239,68,68,0.06)",
                    }}
                  >
                    <Icon
                      className="w-3.5 h-3.5 transition-colors duration-200 group-hover:scale-110"
                      style={{ color: "var(--brand-primary)" }}
                    />
                  </div>
                </div>

                {/* Name */}
                <div className="col-span-3 sm:col-span-3">
                  <span className="text-sm font-bold text-foreground tracking-tight">
                    {cat.label}
                  </span>
                </div>

                {/* Description */}
                <div className="col-span-7 sm:col-span-7">
                  <p className="text-xs leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                    {cat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

