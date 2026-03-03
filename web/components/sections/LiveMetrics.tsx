"use client";

import { useState, useEffect, useRef } from "react";
import {
  Activity,
  ShieldBan,
  ArrowUpRight,
  Database,
  Zap,
  Clock,
  Server,
  Radio,
} from "lucide-react";

interface MetricsData {
  total_queries: number;
  blocked: number;
  forwarded: number;
  cache_l1_hits: number;
  cache_l2_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  intercepted: number;
  blocked_domains: number;
  uptime_seconds: number;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

/** Smoothly animated number display */
function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;

    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * ease));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{formatNumber(display)}</>;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  glowColor: string;
}

function MetricCard({ icon, label, value, suffix, color, glowColor }: MetricCardProps) {
  return (
    <div
      className="group relative flex flex-col gap-1.5 p-4 border transition-all duration-300 hover:border-opacity-60"
      style={{
        borderColor: `${color}30`,
        background: `${color}06`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px 2px ${glowColor}`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}60`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
      }}
    >
      {/* Corner brackets */}
      <span
        className="absolute top-0 left-0 w-3 h-3 border-t border-l"
        style={{ borderColor: `${color}40` }}
      />
      <span
        className="absolute top-0 right-0 w-3 h-3 border-t border-r"
        style={{ borderColor: `${color}40` }}
      />
      <span
        className="absolute bottom-0 left-0 w-3 h-3 border-b border-l"
        style={{ borderColor: `${color}40` }}
      />
      <span
        className="absolute bottom-0 right-0 w-3 h-3 border-b border-r"
        style={{ borderColor: `${color}40` }}
      />

      <div className="flex items-center gap-2">
        <div style={{ color }}>{icon}</div>
        <span
          className="text-[10px] font-mono tracking-widest uppercase"
          style={{ color: "var(--brand-muted)" }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-2xl sm:text-3xl font-black font-mono tabular-nums"
          style={{ color }}
        >
          <AnimatedCounter value={value} />
        </span>
        {suffix && (
          <span
            className="text-xs font-mono"
            style={{ color: "var(--brand-muted)" }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function LiveMetrics() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`${apiUrl}/metrics`, { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const json: MetricsData = await res.json();
        if (active) {
          setData(json);
          setOnline(true);
        }
      } catch {
        if (active) setOnline(false);
      }
    };

    poll(); // initial
    const id = setInterval(poll, 3000); // every 3s
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Skeleton loader while first fetch hasn't returned yet
  if (!data) {
    return (
      <section id="metrics" className="relative py-16 sm:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-24 border animate-pulse"
                style={{
                  borderColor: "var(--brand-border)",
                  background: "rgba(255,255,255,0.02)",
                }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const cards: MetricCardProps[] = [
    {
      icon: <Activity className="w-4 h-4" />,
      label: "Total Queries",
      value: data.total_queries,
      color: "#6366f1",
      glowColor: "rgba(99,102,241,0.15)",
    },
    {
      icon: <ShieldBan className="w-4 h-4" />,
      label: "Blocked",
      value: data.blocked,
      color: "#ef4444",
      glowColor: "rgba(239,68,68,0.15)",
    },
    {
      icon: <ArrowUpRight className="w-4 h-4" />,
      label: "Forwarded",
      value: data.forwarded,
      color: "#22c55e",
      glowColor: "rgba(34,197,94,0.15)",
    },
    {
      icon: <Zap className="w-4 h-4" />,
      label: "Cache L1 Hit",
      value: data.cache_l1_hits,
      color: "#eab308",
      glowColor: "rgba(234,179,8,0.15)",
    },
    {
      icon: <Database className="w-4 h-4" />,
      label: "Cache L2 Hit",
      value: data.cache_l2_hits,
      color: "#f97316",
      glowColor: "rgba(249,115,22,0.15)",
    },
    {
      icon: <Radio className="w-4 h-4" />,
      label: "Hit Rate",
      value: Math.round(data.cache_hit_rate),
      suffix: "%",
      color: "#06b6d4",
      glowColor: "rgba(6,182,212,0.15)",
    },
    {
      icon: <Server className="w-4 h-4" />,
      label: "Blocked Domains",
      value: data.blocked_domains,
      color: "#a855f7",
      glowColor: "rgba(168,85,247,0.15)",
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: "Intercepted",
      value: data.intercepted,
      color: "#ec4899",
      glowColor: "rgba(236,72,153,0.15)",
    },
  ];

  return (
    <section id="metrics" className="relative py-16 sm:py-20 overflow-hidden">
      {/* Subtle grid bg */}
      <div className="absolute inset-0 hero-grid-bg opacity-[0.06]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: online ? "#22c55e" : "#ef4444",
                  boxShadow: online
                    ? "0 0 8px 2px rgba(34,197,94,0.5)"
                    : "0 0 8px 2px rgba(239,68,68,0.5)",
                  animation: online ? "pulse-glow 2.5s ease-in-out infinite" : "none",
                }}
              />
              <span
                className="text-[10px] font-mono tracking-widest uppercase"
                style={{ color: "var(--brand-muted)" }}
              >
                {online ? "LIVE · REAL-TIME" : "OFFLINE · RECONNECTING"}
              </span>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              System Metrics
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--brand-muted)" }}
            >
              DNS server performance — updated every 3 seconds
            </p>
          </div>
          <div
            className="text-xs font-mono px-3 py-1.5 border self-start sm:self-auto"
            style={{
              borderColor: "var(--brand-border)",
              color: "var(--brand-muted)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            UPTIME: {formatUptime(data.uptime_seconds)}
          </div>
        </div>

        {/* Metric cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>

        {/* Bottom bar with extra info */}
        <div
          className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono tracking-widest uppercase border-t pt-4"
          style={{
            borderColor: "var(--brand-border)",
            color: "var(--brand-border)",
          }}
        >
          <span>
            CACHE:{" "}
            <span style={{ color: "var(--brand-muted)" }}>
              L1:SYNC.MAP · L2:REDIS
            </span>
          </span>
          <span>
            REFRESH:{" "}
            <span style={{ color: "var(--brand-muted)" }}>3s INTERVAL</span>
          </span>
          <span>
            PROTOCOL:{" "}
            <span style={{ color: "var(--brand-muted)" }}>
              UDP+TCP :53
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
