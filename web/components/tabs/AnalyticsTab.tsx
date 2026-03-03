"use client";

import React from "react";
import {
    getAnalyticsSummary, getTopBlocked, getTopClients, getHistory,
    type AnalyticsSummary, type TopEntry, type HistoryBucket,
} from "@/lib/api-client";
import { BarChart3, Globe, Users, Shield, RefreshCw } from "lucide-react";

const PERIODS = [
    { value: "1h", label: "1 Jam" },
    { value: "24h", label: "24 Jam" },
    { value: "7d", label: "7 Hari" },
    { value: "30d", label: "30 Hari" },
];

export const AnalyticsTab: React.FC = () => {
    const [period, setPeriod] = React.useState("24h");
    const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null);
    const [topBlocked, setTopBlocked] = React.useState<TopEntry[]>([]);
    const [topClients, setTopClients] = React.useState<TopEntry[]>([]);
    const [history, setHistory] = React.useState<HistoryBucket[]>([]);
    const [loading, setLoading] = React.useState(false);

    const load = React.useCallback(async (p: string) => {
        setLoading(true);
        try {
            const [s, tb, tc, h] = await Promise.all([
                getAnalyticsSummary(p),
                getTopBlocked(p, 10),
                getTopClients(p, 10),
                getHistory(p, p === "1h" ? 60 : p === "24h" ? 3600 : p === "7d" ? 21600 : 86400),
            ]);
            setSummary(s);
            setTopBlocked(tb);
            setTopClients(tc);
            setHistory(h);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    React.useEffect(() => { load(period); }, [period, load]);

    const maxHist = Math.max(...history.map(h => h.total), 1);

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold tracking-tight">Analytics</h2>
                    <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>
                        Statistik query DNS berdasarkan log historis
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {PERIODS.map(p => (
                        <button key={p.value} onClick={() => setPeriod(p.value)}
                            className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border rounded transition-all"
                            style={{
                                borderColor: period === p.value ? "var(--brand-primary)" : "var(--brand-border)",
                                color: period === p.value ? "var(--brand-primary)" : "var(--brand-muted)",
                                background: period === p.value ? "rgba(239,68,68,0.06)" : "transparent",
                            }}>
                            {p.label}
                        </button>
                    ))}
                    <button onClick={() => load(period)} className="p-1.5 hover:text-foreground transition-colors"
                        style={{ color: "var(--brand-muted)" }} title="Refresh">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "TOTAL QUERIES", value: summary.total_queries.toLocaleString(), icon: <BarChart3 className="w-3.5 h-3.5" />, color: "#6366f1" },
                        { label: "BLOCKED", value: summary.blocked_count.toLocaleString(), icon: <Shield className="w-3.5 h-3.5" />, color: "#ef4444" },
                        { label: "UNIQUE DOMAINS", value: summary.unique_domains.toLocaleString(), icon: <Globe className="w-3.5 h-3.5" />, color: "#22c55e" },
                        { label: "UNIQUE CLIENTS", value: summary.unique_clients.toLocaleString(), icon: <Users className="w-3.5 h-3.5" />, color: "#f59e0b" },
                    ].map(card => (
                        <div key={card.label} className="border rounded p-4" style={{ borderColor: "var(--brand-border)" }}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <span style={{ color: card.color }}>{card.icon}</span>
                                <span className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>
                                    {card.label}
                                </span>
                            </div>
                            <span className="text-2xl font-bold font-mono" style={{ color: card.color }}>{card.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* History Chart (simple bar chart) */}
            {history.length > 0 && (
                <div className="border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--brand-muted)" }}>
                        Query History
                    </p>
                    <div className="flex items-end gap-[2px] h-32">
                        {history.map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-stretch gap-[1px]" title={`Total: ${h.total} | Blocked: ${h.blocked}`}>
                                <div className="rounded-t" style={{
                                    height: `${((h.total - h.blocked) / maxHist) * 100}%`,
                                    background: "rgba(99,102,241,0.5)",
                                    minHeight: h.total > 0 ? "2px" : "0px",
                                }} />
                                <div className="rounded-b" style={{
                                    height: `${(h.blocked / maxHist) * 100}%`,
                                    background: "rgba(239,68,68,0.7)",
                                    minHeight: h.blocked > 0 ? "2px" : "0px",
                                }} />
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-[9px]" style={{ color: "var(--brand-muted)" }}>
                            <span className="w-2.5 h-2.5 rounded" style={{ background: "rgba(99,102,241,0.5)" }} /> Forwarded
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px]" style={{ color: "var(--brand-muted)" }}>
                            <span className="w-2.5 h-2.5 rounded" style={{ background: "rgba(239,68,68,0.7)" }} /> Blocked
                        </div>
                    </div>
                </div>
            )}

            {/* Top Blocked + Top Clients */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Blocked */}
                <div className="border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--brand-muted)" }}>
                        Top 10 Domain Diblokir
                    </p>
                    {topBlocked.length === 0 ? (
                        <p className="text-xs py-4 text-center" style={{ color: "var(--brand-muted)" }}>Tidak ada data</p>
                    ) : topBlocked.map((e, i) => (
                        <div key={e.name} className="flex items-center justify-between py-1.5 border-b last:border-0"
                            style={{ borderColor: "var(--brand-border)" }}>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono w-5 text-right" style={{ color: "var(--brand-muted)" }}>{i + 1}</span>
                                <span className="text-xs font-mono truncate max-w-[200px]">{e.name}</span>
                            </div>
                            <span className="text-xs font-mono font-bold" style={{ color: "#ef4444" }}>{e.count}</span>
                        </div>
                    ))}
                </div>

                {/* Top Clients */}
                <div className="border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--brand-muted)" }}>
                        Top 10 Client
                    </p>
                    {topClients.length === 0 ? (
                        <p className="text-xs py-4 text-center" style={{ color: "var(--brand-muted)" }}>Tidak ada data</p>
                    ) : topClients.map((e, i) => (
                        <div key={e.name} className="flex items-center justify-between py-1.5 border-b last:border-0"
                            style={{ borderColor: "var(--brand-border)" }}>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono w-5 text-right" style={{ color: "var(--brand-muted)" }}>{i + 1}</span>
                                <span className="text-xs font-mono truncate max-w-[200px]">{e.name}</span>
                            </div>
                            <span className="text-xs font-mono font-bold" style={{ color: "#6366f1" }}>{e.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
