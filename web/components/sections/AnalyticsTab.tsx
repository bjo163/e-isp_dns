"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { RefreshCw, XCircle, TrendingUp, ShieldAlert, Globe, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAnalyticsSummary, getTopBlocked, getTopClients, getHistory, getClientStats,
  type AnalyticsSummary, type TopEntry, type HistoryBucket, type ClientStat,
} from "@/lib/api-client";

const PERIODS = [
  { value: "1h", label: "1 Jam" },
  { value: "24h", label: "24 Jam" },
  { value: "7d", label: "7 Hari" },
  { value: "30d", label: "30 Hari" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

function bucketFor(period: Period) {
  switch (period) {
    case "1h": return 60;
    case "24h": return 3600;
    case "7d": return 3600 * 6;
    case "30d": return 86400;
  }
}

function formatTs(ts: number, period: Period) {
  const d = new Date(ts * 1000);
  if (period === "1h") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (period === "24h") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function AnalyticsTab() {
  const [period, setPeriod] = useState<Period>("24h");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topBlocked, setTopBlocked] = useState<TopEntry[]>([]);
  const [topClients, setTopClients] = useState<TopEntry[]>([]);
  const [history, setHistory] = useState<HistoryBucket[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-client stats
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientStat, setClientStat] = useState<ClientStat | null>(null);
  const [clientLoading, setClientLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bucket = bucketFor(period);
      const [s, tb, tc, h] = await Promise.all([
        getAnalyticsSummary(period),
        getTopBlocked(period, 10),
        getTopClients(period, 10),
        getHistory(period, bucket),
      ]);
      setSummary(s);
      setTopBlocked(tb ?? []);
      setTopClients(tc ?? []);
      setHistory(h ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  async function openClientStats(ip: string) {
    setSelectedClient(ip);
    setClientStat(null);
    setClientLoading(true);
    try {
      const cs = await getClientStats(ip, period, 10, bucketFor(period));
      setClientStat(cs);
    } catch { /* silent */ }
    finally { setClientLoading(false); }
  }

  const chartData = history.map(h => ({
    ts: formatTs(h.ts, period),
    Total: h.total,
    Blocked: h.blocked,
  }));

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Analytics</h2>
          <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>Dashboard query DNS — riwayat dan statistik blocking</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border rounded transition-all"
              style={{
                borderColor: period === p.value ? "var(--brand-primary)" : "var(--brand-border)",
                color: period === p.value ? "var(--brand-primary)" : "var(--brand-muted)",
                background: period === p.value ? "rgba(239,68,68,0.07)" : "transparent",
              }}>
              {p.label}
            </button>
          ))}
          <button onClick={load} className="p-1.5 hover:text-foreground transition-colors" style={{ color: "var(--brand-muted)" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Query", value: summary.total_queries.toLocaleString(), icon: <TrendingUp className="w-4 h-4" />, color: "#6366f1" },
            { label: "Blocked", value: summary.blocked_count.toLocaleString(), icon: <ShieldAlert className="w-4 h-4" />, color: "#ef4444" },
            { label: "Domain Unik", value: summary.unique_domains.toLocaleString(), icon: <Globe className="w-4 h-4" />, color: "#22c55e" },
            { label: "Client Unik", value: summary.unique_clients.toLocaleString(), icon: <Users className="w-4 h-4" />, color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} className="border rounded p-4 space-y-2"
              style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>{s.label}</span>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* History chart */}
      {loading ? (
        <Skeleton className="h-[280px] w-full rounded-lg" />
      ) : chartData.length > 0 && (
        <div className="border rounded p-5" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--brand-muted)" }}>
            Query History
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="ts" tick={{ fontSize: 10, fill: "var(--brand-muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--brand-muted)" }} />
              <Tooltip
                contentStyle={{ background: "var(--brand-card-bg)", border: "1px solid var(--brand-border)", fontSize: 11 }}
                labelStyle={{ color: "var(--brand-muted)" }}
              />
              <Area type="monotone" dataKey="Total" stroke="#6366f1" fill="rgba(99,102,241,0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="Blocked" stroke="#ef4444" fill="rgba(239,68,68,0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top tables side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Blocked */}
        {loading ? (
          <Skeleton className="h-[300px] w-full rounded-lg" />
        ) : (
          <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>Top Blocked Domains</p>
            </div>
            {topBlocked.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs" style={{ color: "var(--brand-muted)" }}>Belum ada data</div>
            ) : topBlocked.map((e, i) => (
              <div key={e.name} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0"
                style={{ borderColor: "var(--brand-border)" }}>
                <span className="text-[10px] font-mono w-5 text-right" style={{ color: "var(--brand-muted)" }}>{i + 1}</span>
                <span className="flex-1 text-xs font-mono truncate">{e.name}</span>
                <span className="text-xs font-mono tabular-nums" style={{ color: "#ef4444" }}>{e.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Top Clients */}
        {loading ? (
          <Skeleton className="h-[300px] w-full rounded-lg" />
        ) : (
          <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>Top Clients</p>
            </div>
            {topClients.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs" style={{ color: "var(--brand-muted)" }}>Belum ada data</div>
            ) : topClients.map((e, i) => (
              <div key={e.name} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 cursor-pointer hover:bg-white/[0.02]"
                style={{ borderColor: "var(--brand-border)" }}
                onClick={() => openClientStats(e.name)}>
                <span className="text-[10px] font-mono w-5 text-right" style={{ color: "var(--brand-muted)" }}>{i + 1}</span>
                <span className="flex-1 text-xs font-mono truncate">{e.name}</span>
                <span className="text-xs font-mono tabular-nums" style={{ color: "#6366f1" }}>{e.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-client stats panel */}
      {selectedClient && (
        <div className="border rounded p-5 space-y-5" style={{ borderColor: "var(--brand-accent)", background: "var(--brand-card-bg)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>
                Statistik Client
              </p>
              <p className="text-sm font-mono font-bold mt-1">{selectedClient}</p>
            </div>
            <button onClick={() => setSelectedClient(null)} className="hover:text-foreground transition-colors" style={{ color: "var(--brand-muted)" }}>
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          {clientLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} />
            </div>
          ) : clientStat ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total", value: clientStat.total_queries, color: "#6366f1" },
                  { label: "Blocked", value: clientStat.blocked_count, color: "#ef4444" },
                  { label: "Forwarded", value: clientStat.forwarded_count, color: "#22c55e" },
                ].map(s => (
                  <div key={s.label} className="border rounded p-3 text-center" style={{ borderColor: "var(--brand-border)" }}>
                    <p className="text-[9px] tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>{s.label}</p>
                    <p className="text-xl font-bold tabular-nums mt-1" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Client history chart */}
              {clientStat.history && clientStat.history.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--brand-muted)" }}>History</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={clientStat.history.map(h => ({ ts: formatTs(h.ts, period), Total: h.total, Blocked: h.blocked }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="ts" tick={{ fontSize: 9, fill: "var(--brand-muted)" }} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--brand-muted)" }} />
                      <Tooltip contentStyle={{ background: "var(--brand-card-bg)", border: "1px solid var(--brand-border)", fontSize: 10 }} />
                      <Area type="monotone" dataKey="Total" stroke="#6366f1" fill="rgba(99,102,241,0.15)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="Blocked" stroke="#ef4444" fill="rgba(239,68,68,0.15)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Two mini tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top domains */}
                <div>
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--brand-muted)" }}>Top Domains</p>
                  {clientStat.top_domains && clientStat.top_domains.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.min(clientStat.top_domains.length * 28, 280)}>
                      <BarChart data={clientStat.top_domains} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 9, fill: "var(--brand-muted)" }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "var(--brand-muted)" }} width={120} />
                        <Tooltip contentStyle={{ background: "var(--brand-card-bg)", border: "1px solid var(--brand-border)", fontSize: 10 }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--brand-muted)" }}>Tidak ada data</p>
                  )}
                </div>
                {/* Top blocked */}
                <div>
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--brand-muted)" }}>Top Blocked</p>
                  {clientStat.top_blocked && clientStat.top_blocked.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.min(clientStat.top_blocked.length * 28, 280)}>
                      <BarChart data={clientStat.top_blocked} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 9, fill: "var(--brand-muted)" }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "var(--brand-muted)" }} width={120} />
                        <Tooltip contentStyle={{ background: "var(--brand-card-bg)", border: "1px solid var(--brand-border)", fontSize: 10 }} />
                        <Bar dataKey="count" fill="#ef4444" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--brand-muted)" }}>Tidak ada data</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
