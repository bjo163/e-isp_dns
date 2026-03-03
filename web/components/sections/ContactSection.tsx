"use client";

import {
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Building2,
  Wifi,
  Send,
} from "lucide-react";
import branding from "@/configs/branding";
import type { ContactCard } from "@/configs/branding";

function ContactPanel({
  data,
  type,
}: {
  data: ContactCard;
  type: "authority" | "isp";
}) {
  const isAuth = type === "authority";
  const color   = isAuth ? "var(--brand-primary)" : "var(--brand-accent)";
  const colorRgb = isAuth ? "239,68,68" : "99,102,241";

  return (
    <div
      className="relative border group transition-all duration-300"
      style={{ borderColor: "var(--brand-border)" }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `rgba(${colorRgb},0.4)`;
        el.style.background = `rgba(${colorRgb},0.02)`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--brand-border)";
        el.style.background = "transparent";
      }}
    >
      {/* Top accent bar */}
      <div className="h-[2px] w-full" style={{ background: color }} />

      {/* Header */}
      <div
        className="flex items-start gap-4 px-6 pt-6 pb-5 border-b"
        style={{ borderColor: "var(--brand-border)" }}
      >
        <div
          className="w-10 h-10 flex items-center justify-center flex-shrink-0"
          style={{ background: `rgba(${colorRgb},0.12)`, border: `1px solid rgba(${colorRgb},0.3)` }}
        >
          {isAuth
            ? <Building2 className="w-5 h-5" style={{ color }} />
            : <Wifi className="w-5 h-5" style={{ color }} />
          }
        </div>
        <div>
          <p
            className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1"
            style={{ color }}
          >
            {data.role}
          </p>
          <h3 className="text-sm font-bold text-foreground leading-snug">
            {data.name}
          </h3>
        </div>
      </div>

      {/* Details */}
      <div className="px-6 py-5 space-y-3">
        <Row icon={<MapPin className="w-3.5 h-3.5" />} label="Alamat">
          <span className="text-[11px] leading-relaxed" style={{ color: "var(--brand-muted)" }}>
            {data.address}
          </span>
        </Row>
        <Row icon={<Phone className="w-3.5 h-3.5" />} label="Telepon">
          <a
            href={`tel:${data.phone}`}
            className="text-[11px] hover:text-foreground transition-colors"
            style={{ color: "var(--brand-muted)" }}
          >
            {data.phone}
          </a>
        </Row>
        <Row icon={<Mail className="w-3.5 h-3.5" />} label="Email">
          <a
            href={`mailto:${data.email}`}
            className="text-[11px] hover:text-foreground transition-colors"
            style={{ color }}
          >
            {data.email}
          </a>
        </Row>
        <Row icon={<Globe className="w-3.5 h-3.5" />} label="Website">
          <a
            href={data.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] flex items-center gap-1 hover:text-foreground transition-colors"
            style={{ color }}
          >
            {data.website.replace("https://", "")}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </Row>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        <a href={`mailto:${data.email}`}>
          <button
            className="w-full py-2.5 text-xs font-bold tracking-[0.12em] uppercase border transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              color,
              borderColor: `rgba(${colorRgb},0.35)`,
              background: `rgba(${colorRgb},0.05)`,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = `rgba(${colorRgb},0.12)`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = `rgba(${colorRgb},0.05)`;
            }}
          >
            <Mail className="w-3 h-3" />
            Kirim Email
          </button>
        </a>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5" style={{ color: "var(--brand-border)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[9px] font-mono tracking-widest uppercase mb-0.5"
          style={{ color: "var(--brand-border)" }}
        >
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

export function ContactSection() {
  const { contact } = branding;

  return (
    <section
      id="contact"
      className="relative py-24 border-t"
      style={{
        background: "var(--brand-dark-bg)",
        borderColor: "var(--brand-border)",
      }}
    >
      {/* Vertical rule */}
      <div
        className="absolute top-0 right-1/2 w-[1px] h-16"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--brand-border))",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Section header */}
        <div className="mb-14">
          <div
            className="text-[10px] font-mono tracking-[0.25em] uppercase mb-3"
            style={{ color: "var(--brand-muted)" }}
          >
            Informasi · Kontak Resmi
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2
              className="font-black tracking-tight leading-[1.0]"
              style={{ fontSize: "clamp(28px, 4vw, 52px)" }}
            >
              {contact.title}
            </h2>
            <p
              className="text-sm leading-relaxed max-w-sm"
              style={{ color: "var(--brand-muted)" }}
            >
              {contact.subtitle}
            </p>
          </div>
        </div>

        {/* Contact panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ContactPanel data={contact.authority} type="authority" />
          <ContactPanel data={contact.isp} type="isp" />
        </div>

        {/* Report bar */}
        <div
          className="border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5"
          style={{
            borderColor: "rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.04)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-8 h-8 flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.35)",
              }}
            >
              <Send className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground tracking-tight">
                Laporkan Konten Berbahaya
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--brand-muted)" }}>
                Temukan konten yang melanggar hukum? Laporkan langsung ke Komdigi.
              </p>
            </div>
          </div>
          <a href={`mailto:${contact.reportEmail}`}>
            <button
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-[0.12em] uppercase transition-all duration-200 whitespace-nowrap"
              style={{
                background: "var(--brand-primary)",
                color: "#fff",
                boxShadow: "0 0 20px 3px var(--brand-glow)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px 8px var(--brand-glow)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px 3px var(--brand-glow)";
              }}
            >
              <Mail className="w-3 h-3" />
              Kirim Laporan
            </button>
          </a>
        </div>

      </div>
    </section>
  );
}
