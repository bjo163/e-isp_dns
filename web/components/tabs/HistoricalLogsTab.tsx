import React, { useState, useEffect } from "react";
import { getQueryLog, type QueryLogEntry, type QueryLogSearchParams } from "../../lib/api-client";
import {
    Search, RefreshCw, ChevronLeft, ChevronRight,
    Filter, Calendar, Download, Shield, Globe, Monitor
} from "lucide-react";
import { IPBadge } from "../IPBadge";

export const HistoricalLogsTab: React.FC = () => {
    const [logs, setLogs] = useState<QueryLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter States
    const [ipFilter, setIpFilter] = useState("");
    const [domainFilter, setDomainFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [qtypeFilter, setQtypeFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const loadLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const params: QueryLogSearchParams = {
                page,
                limit,
                ip: ipFilter || undefined,
                domain: domainFilter || undefined,
                action: actionFilter || undefined,
                qtype: qtypeFilter || undefined,
                start_date: startDate ? new Date(startDate).toISOString() : undefined,
                end_date: endDate ? new Date(endDate).toISOString() : undefined,
            };
            const res = await getQueryLog(params);
            setLogs(res.data);
            setTotal(res.total);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [page, limit]);

    const handleApplyFilters = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadLogs();
    };

    const handleExport = () => {
        const csvContent = [
            ["Timestamp", "Client", "Domain", "Type", "Action", "Latency (us)"].join(","),
            ...logs.map(l => [
                new Date(l.created_at).toISOString(),
                l.client,
                l.domain,
                l.qtype,
                l.action,
                l.latency_us
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `dns_logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="max-w-6xl space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Search Historical Logs</h2>
                    <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>Telusuri database query DNS dengan filter spesifik</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border rounded hover:bg-white/5 transition-all text-brand-muted" style={{ borderColor: "var(--brand-border)" }}>
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                    <button onClick={loadLogs} className="p-2 hover:bg-white/5 rounded transition-colors" style={{ color: "var(--brand-muted)" }}>
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* SEARCH / FILTER PANEL */}
            <form onSubmit={handleApplyFilters} className="p-6 border rounded bg-[var(--brand-card-bg)] space-y-6" style={{ borderColor: "var(--brand-border)" }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Client IP</label>
                        <div className="relative">
                            <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
                            <input
                                type="text" value={ipFilter} onChange={e => setIpFilter(e.target.value)}
                                placeholder="e.g. 192.168.1.1"
                                className="w-full pl-9 pr-3 py-2 text-xs bg-transparent border rounded outline-none focus:border-brand-primary transition-colors font-mono"
                                style={{ borderColor: "var(--brand-border)" }}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Target Domain</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
                            <input
                                type="text" value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
                                placeholder="e.g. google.com"
                                className="w-full pl-9 pr-3 py-2 text-xs bg-transparent border rounded outline-none focus:border-brand-primary transition-colors font-mono"
                                style={{ borderColor: "var(--brand-border)" }}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Action</label>
                        <select
                            value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-transparent border rounded outline-none focus:border-brand-primary transition-colors cursor-pointer"
                            style={{ borderColor: "var(--brand-border)" }}
                        >
                            <option value="" className="bg-neutral-900">All Actions</option>
                            <option value="blocked" className="bg-neutral-900">Blocked</option>
                            <option value="forwarded" className="bg-neutral-900">Forwarded</option>
                            <option value="custom" className="bg-neutral-900">Custom Record</option>
                            <option value="cached" className="bg-neutral-900">Cached</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Start Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
                            <input
                                type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-transparent border rounded outline-none focus:border-brand-primary transition-colors"
                                style={{ borderColor: "var(--brand-border)" }}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">End Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
                            <input
                                type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-transparent border rounded outline-none focus:border-brand-primary transition-colors"
                                style={{ borderColor: "var(--brand-border)" }}
                            />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest rounded hover:opacity-90 transition-opacity">
                            <Filter className="w-3.5 h-3.5" /> Cerapkan Filter
                        </button>
                    </div>
                </div>
            </form>

            {error && (
                <div className="px-4 py-3 rounded border bg-red-500/10 border-red-500/20 text-red-400 text-xs text-center">
                    Error: {error}
                </div>
            )}

            {/* TABLE */}
            <div className="border rounded overflow-hidden shadow-sm" style={{ borderColor: "var(--brand-border)" }}>
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-[9px] font-bold uppercase tracking-widest border-b" style={{ color: "var(--brand-muted)", borderColor: "var(--brand-border)" }}>
                        <tr>
                            <th className="px-6 py-4">Time</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Domain</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4 text-right">Latency</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-xs text-brand-muted italic">Tidak ada query ditemukan untuk filter ini</td>
                            </tr>
                        )}
                        {logs.map(l => (
                            <tr key={l.id} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="px-6 py-4 text-[10px] opacity-70 font-mono whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                                <td className="px-6 py-4"><IPBadge ip={l.client} /></td>
                                <td className="px-6 py-4 text-xs font-mono font-medium truncate max-w-xs" title={l.domain}>{l.domain}</td>
                                <td className="px-6 py-4 text-[10px] font-bold text-zinc-500">{l.qtype}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${l.action === 'blocked' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                        {l.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-[10px] font-mono opacity-50">{l.latency_us.toLocaleString()}μs</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--brand-border)" }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">
                        Page {page} of {totalPages} ({total.toLocaleString()} total)
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1} onClick={() => setPage(p => p - 1)}
                            className="p-1.5 rounded border border-brand-border disabled:opacity-20 hover:bg-white/5 transition-colors"
                        >
                            <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                            disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                            className="p-1.5 rounded border border-brand-border disabled:opacity-20 hover:bg-white/5 transition-colors"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
