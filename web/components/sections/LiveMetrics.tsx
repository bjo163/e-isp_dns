"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity,
  ShieldBan,
  ArrowUpRight,
  Database,
  Zap,
  Clock,
  Server,
  Radio,
  Timer,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ─── types matching Go WsPayload ─── */

interface Stats {
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
  avg_latency_ms: number;
}

interface Sample {
  ts: number;
  qps: number;
  block_ps: number;
  avg_ms: number;
  max_ms: number;
}

interface QueryLog {
  ts: string;
  client: string;
  domain: string;
  qtype: string;
  action: string;
  latency_us: number;
}

interface WsPayload {
  stats: Stats;
  series: Sample[];
  logs: QueryLog[];
}

/* ─── helpers ─── */

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
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * ease));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{formatNumber(display)}</>;
}

/* ─── metric card ─── */

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  color: string;
  glowColor: string;
}

function MetricCard({ icon, label, value, suffix, decimals, color, glowColor }: MetricCardProps) {
  return (
    <div
      className="group relative flex flex-col gap-1.5 p-4 border transition-all duration-300 hover:border-opacity-60"
      style={{ borderColor: `${color}30`, background: `${color}06` }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px 2px ${glowColor}`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}60`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
      }}
    >
      <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: `${color}40` }} />
      <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: `${color}40` }} />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: `${color}40` }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: `${color}40` }} />

      <div className="flex items-center gap-2">
        <div style={{ color }}>{icon}</div>
        <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums" style={{ color }}>
          {decimals != null ? value.toFixed(decimals) : <AnimatedCounter value={value} />}
        </span>
        {suffix && (
          <span className="text-xs font-mono" style={{ color: "var(--brand-muted)" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── recharts custom tooltip ─── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-[10px] font-mono px-2 py-1.5 border rounded" style={{ background: "var(--brand-card-bg)", borderColor: "var(--brand-border)", color: "var(--foreground)" }}>
      <div style={{ color: "var(--brand-muted)" }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mt-0.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <strong>{p.value.toFixed(2)}</strong>
        </div>
      ))}
    </div>
  );
}

/* ─── small chart wrapper ─── */
function MiniChart({ data, lines, height = 120 }: {
  data: Array<Record<string, unknown>>;
  lines: Array<{ key: string; color: string; label: string }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" strokeOpacity={0.5} />
        <XAxis dataKey="time" tick={{ fontSize: 9, fill: "var(--brand-muted)" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: "var(--brand-muted)" }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        {lines.map(l => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={1.5} dot={false} animationDuration={300} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// action color map
const ACTION_COLORS: Record<string, string> = {
  blocked: "#ef4444",
  forwarded: "#22c55e",
  custom: "#6366f1",
  acl_blocked: "#f97316",
  cached: "#eab308",
};

/* ─── main export ─── */

export function LiveMetrics({ compact = false }: { compact?: boolean }) {
  const [payload, setPayload] = useState<WsPayload | null>(null);
  const [online, setOnline] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    // If API URL is relative (starts with / or is empty), use current host
    let wsUrl: string;
    if (base.startsWith("http")) {
      wsUrl = base.replace(/^http/, "ws") + "/ws/metrics";
    } else {
      wsUrl = `${proto}//${window.location.host}${base}/ws/metrics`;
    }
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => setOnline(true);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as WsPayload;
        setPayload(data);
      } catch { /* ignore bad frames */ }
    };
    ws.onclose = () => {
      setOnline(false);
      reconnectTimer.current = setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Fallback: poll /metrics if WS not working
  useEffect(() => {
    if (payload) return; // WS working, skip polling
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`${apiUrl}/metrics`, { cache: "no-store" });
        if (!res.ok) throw new Error("fail");
        const json = await res.json();
        if (active && !payload) {
          setPayload({ stats: json, series: [], logs: [] });
          setOnline(true);
        }
      } catch { /* noop */ }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { active = false; clearInterval(id); };
  }, [payload]);

  // Derive chart data from series
  const chartData = (payload?.series ?? []).slice(-60).map(s => ({
    time: new Date(s.ts * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    qps: s.qps,
    block_ps: s.block_ps,
    avg_ms: s.avg_ms,
    max_ms: s.max_ms,
  }));

  // Skeleton
  if (!payload) {
    const grid = (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 border animate-pulse" style={{ borderColor: "var(--brand-border)", background: "rgba(255,255,255,0.02)" }} />
        ))}
      </div>
    );
    if (compact) return <div className="space-y-4">{grid}</div>;
    return (
      <section id="metrics" className="relative py-16 sm:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">{grid}</div>
      </section>
    );
  }

  const data = payload.stats;

  const cards: MetricCardProps[] = [
    { icon: <Activity className="w-4 h-4" />, label: "Total Queries", value: data.total_queries, color: "#6366f1", glowColor: "rgba(99,102,241,0.15)" },
    { icon: <ShieldBan className="w-4 h-4" />, label: "Blocked", value: data.blocked, color: "#ef4444", glowColor: "rgba(239,68,68,0.15)" },
    { icon: <ArrowUpRight className="w-4 h-4" />, label: "Forwarded", value: data.forwarded, color: "#22c55e", glowColor: "rgba(34,197,94,0.15)" },
    { icon: <Zap className="w-4 h-4" />, label: "Cache L1", value: data.cache_l1_hits, color: "#eab308", glowColor: "rgba(234,179,8,0.15)" },
    { icon: <Database className="w-4 h-4" />, label: "Cache L2", value: data.cache_l2_hits, color: "#f97316", glowColor: "rgba(249,115,22,0.15)" },
    { icon: <Radio className="w-4 h-4" />, label: "Hit Rate", value: Math.round(data.cache_hit_rate), suffix: "%", color: "#06b6d4", glowColor: "rgba(6,182,212,0.15)" },
    { icon: <Timer className="w-4 h-4" />, label: "Avg Latency", value: data.avg_latency_ms, suffix: "ms", decimals: 2, color: "#f59e0b", glowColor: "rgba(245,158,11,0.15)" },
    { icon: <Clock className="w-4 h-4" />, label: "Intercepted", value: data.intercepted, color: "#ec4899", glowColor: "rgba(236,72,153,0.15)" },
  ];

  // ── Compact mode (admin dashboard) with charts ──────────────────────────
  if (compact) {
    return (
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{
              background: online ? "#22c55e" : "#ef4444",
              boxShadow: online ? "0 0 8px 2px rgba(34,197,94,0.5)" : "0 0 8px 2px rgba(239,68,68,0.5)",
              animation: online ? "pulse-glow 2.5s ease-in-out infinite" : "none",
            }} />
            <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>
              {online ? "LIVE · WEBSOCKET" : "OFFLINE · RECONNECTING"}
            </span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>
            UPTIME: {formatUptime(data.uptime_seconds)}
          </span>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map(card => <MetricCard key={card.label} {...card} />)}
        </div>

        {/* Charts */}
        {chartData.length > 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* QPS chart */}
            <div className="border rounded p-4" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--brand-muted)" }}>Queries / sec</p>
              <MiniChart data={chartData} lines={[
                { key: "qps", color: "#6366f1", label: "QPS" },
                { key: "block_ps", color: "#ef4444", label: "Blocked/s" },
              ]} />
            </div>
            {/* Latency chart */}
            <div className="border rounded p-4" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--brand-muted)" }}>Response Time (ms)</p>
              <MiniChart data={chartData} lines={[
                { key: "avg_ms", color: "#f59e0b", label: "Avg ms" },
                { key: "max_ms", color: "#ef4444", label: "Max ms" },
              ]} />
            </div>
          </div>
        )}

        {/* Query Log */}
        {payload.logs.length > 0 && (
          <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
            <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>Query Log (recent)</p>
              <span className="text-[9px] font-mono" style={{ color: "var(--brand-muted)" }}>{payload.logs.length}</span>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {payload.logs.slice(0, 30).map((log, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-1.5 border-b last:border-0 text-[11px] font-mono hover:bg-white/[0.02]"
                  style={{ borderColor: "var(--brand-border)" }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ACTION_COLORS[log.action] ?? "#888" }} />
                  <span className="w-[52px] shrink-0" style={{ color: "var(--brand-muted)" }}>
                    {new Date(log.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className="truncate flex-1">{log.domain}</span>
                  <span className="w-8 text-right shrink-0" style={{ color: "var(--brand-muted)" }}>{log.qtype}</span>
                  <span className="w-16 text-right shrink-0" style={{ color: ACTION_COLORS[log.action] ?? "var(--brand-muted)" }}>{log.action}</span>
                  <span className="w-14 text-right shrink-0" style={{ color: "var(--brand-muted)" }}>{(log.latency_us / 1000).toFixed(1)}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-mono tracking-widest uppercase border-t pt-3"
          style={{ borderColor: "var(--brand-border)", color: "var(--brand-border)" }}>
          <span>CACHE: <span style={{ color: "var(--brand-muted)" }}>L1:SYNC.MAP · L2:REDIS</span></span>
          <span>TRANSPORT: <span style={{ color: "var(--brand-muted)" }}>{online ? "WEBSOCKET" : "POLLING"}</span></span>
          <span>PROTOCOL: <span style={{ color: "var(--brand-muted)" }}>UDP+TCP :53</span></span>
        </div>
      </div>
    );
  }

  // ── Full-page section mode ────────────────────────────────────────────
  return (
    <section id="metrics" className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 hero-grid-bg opacity-[0.06]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{
                background: online ? "#22c55e" : "#ef4444",
                boxShadow: online ? "0 0 8px 2px rgba(34,197,94,0.5)" : "0 0 8px 2px rgba(239,68,68,0.5)",
                animation: online ? "pulse-glow 2.5s ease-in-out infinite" : "none",
              }} />
              <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>
                {online ? "LIVE · REAL-TIME" : "OFFLINE · RECONNECTING"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
              System Metrics
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--brand-muted)" }}>
              DNS server performance — real-time via WebSocket
            </p>
          </div>
          <div className="text-xs font-mono px-3 py-1.5 border self-start sm:self-auto"
            style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)", background: "rgba(255,255,255,0.02)" }}>
            UPTIME: {formatUptime(data.uptime_seconds)}
          </div>
        </div>

        {/* Metric cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(card => <MetricCard key={card.label} {...card} />)}
        </div>

        {/* Charts */}
        {chartData.length > 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="border rounded p-4" style={{ borderColor: "var(--brand-border)", background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--brand-muted)" }}>Queries / sec</p>
              <MiniChart data={chartData} height={160} lines={[
                { key: "qps", color: "#6366f1", label: "QPS" },
                { key: "block_ps", color: "#ef4444", label: "Blocked/s" },
              ]} />
            </div>
            <div className="border rounded p-4" style={{ borderColor: "var(--brand-border)", background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--brand-muted)" }}>Response Time (ms)</p>
              <MiniChart data={chartData} height={160} lines={[
                { key: "avg_ms", color: "#f59e0b", label: "Avg ms" },
                { key: "max_ms", color: "#ef4444", label: "Max ms" },
              ]} />
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono tracking-widest uppercase border-t pt-4"
          style={{ borderColor: "var(--brand-border)", color: "var(--brand-border)" }}>
          <span>CACHE: <span style={{ color: "var(--brand-muted)" }}>L1:SYNC.MAP · L2:REDIS</span></span>
          <span>TRANSPORT: <span style={{ color: "var(--brand-muted)" }}>{online ? "WEBSOCKET" : "POLLING"}</span></span>
          <span>PROTOCOL: <span style={{ color: "var(--brand-muted)" }}>UDP+TCP :53</span></span>
        </div>
      </div>
    </section>
  );
}
