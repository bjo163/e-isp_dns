"use client";

import { ArrowRight, Clock, ChevronRight } from "lucide-react";
import branding from "@/configs/branding";

export function AppealSection() {
  const { appeal } = branding;

  return (
    <section
      id="appeal"
      className="relative py-24 border-t"
      style={{
        background: "var(--brand-card-bg)",
        borderColor: "var(--brand-border)",
      }}
    >
      {/* Vertical accent line left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[1px]"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--brand-primary), transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* ── Section header ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          <div className="lg:col-span-6">
            <div
              className="text-[10px] font-mono tracking-[0.25em] uppercase mb-3"
              style={{ color: "var(--brand-muted)" }}
            >
              Prosedur · Pengajuan Banding
            </div>
            <h2
              className="font-black tracking-tight leading-[1.0] mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 52px)" }}
            >
              {appeal.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>
              {appeal.subtitle}
            </p>
          </div>
          <div className="lg:col-span-6 flex items-end">
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div
                className="flex items-center gap-2 text-xs font-mono px-4 py-2.5 border"
                style={{
                  borderColor: "var(--brand-border)",
                  color: "var(--brand-muted)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <Clock className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
                ESTIMASI PROSES:{" "}
                <span className="text-foreground font-bold">
                  {appeal.processDays} HARI KERJA
                </span>
              </div>

              <a href={appeal.portalUrl} target="_blank" rel="noopener noreferrer">
                <button
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-[0.12em] uppercase transition-all duration-200 group"
                  style={{
                    background: "var(--brand-accent)",
                    color: "#fff",
                    boxShadow: "0 0 24px 4px rgba(99,102,241,0.3)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px 8px rgba(99,102,241,0.45)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px 4px rgba(99,102,241,0.3)";
                  }}
                >
                  {appeal.portalLabel}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* ── Steps ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l"
          style={{ borderColor: "var(--brand-border)" }}
        >
          {appeal.steps.map((step, i) => (
            <div
              key={i}
              className="relative group border-b border-r overflow-hidden transition-all duration-300"
              style={{ borderColor: "var(--brand-border)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.03)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {/* Ghost number */}
              <div
                className="absolute font-black leading-none select-none pointer-events-none transition-opacity duration-300"
                style={{
                  fontSize: "clamp(80px, 10vw, 140px)",
                  color: "transparent",
                  WebkitTextStroke: "1px var(--brand-border)",
                  right: "-8px",
                  bottom: "-16px",
                  letterSpacing: "-0.05em",
                  opacity: 0.5,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>

              {/* Top accent on hover */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                style={{ background: "var(--brand-primary)" }}
              />

              {/* Content */}
              <div className="relative p-6 pb-10 flex flex-col gap-3 min-h-[200px]">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-mono tracking-widest"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    STEP_{String(i + 1).padStart(2, "0")}
                  </span>
                  {i < appeal.steps.length - 1 && (
                    <ChevronRight
                      className="w-3 h-3 hidden lg:block"
                      style={{ color: "var(--brand-border)" }}
                    />
                  )}
                </div>
                <h3 className="text-sm font-bold text-foreground leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--brand-muted)" }}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}


