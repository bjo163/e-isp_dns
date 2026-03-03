import React, { useState, useEffect } from "react";
import { getAuditLogs, type AuditLog } from "../../lib/api-client";
import {
    ShieldAlert, User, Activity, Globe,
    Search, RefreshCw, ChevronLeft, ChevronRight,
    Clock, Hash
} from "lucide-react";

export const AuditLogsTab: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(25);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [adminFilter, setAdminFilter] = useState("");
    const [targetFilter, setTargetFilter] = useState("");

    const loadLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAuditLogs({
                page, limit,
                admin: adminFilter || undefined,
                target: targetFilter || undefined
            });
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
    }, [page, adminFilter, targetFilter]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="max-w-6xl space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Audit Logs</h2>
                    <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>Pantau aktivitas perubahan konfigurasi oleh administrator</p>
                </div>
                <button onClick={loadLogs} className="p-2 hover:bg-white/5 rounded transition-colors" style={{ color: "var(--brand-muted)" }}>
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* FILTER BAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded bg-white/[0.02]" style={{ borderColor: "var(--brand-border)" }}>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
                    <input
                        type="text" placeholder="Filter Admin..."
                        value={adminFilter} onChange={e => { setAdminFilter(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-transparent border rounded outline-none focus:border-brand-primary transition-colors"
                        style={{ borderColor: "var(--brand-border)" }}
                    />
                </div>
                <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
                    <input
                        type="text" placeholder="Filter Target (Domain/IP)..."
                        value={targetFilter} onChange={e => { setTargetFilter(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-transparent border rounded outline-none focus:border-brand-primary transition-colors"
                        style={{ borderColor: "var(--brand-border)" }}
                    />
                </div>
                <div className="flex items-center text-[10px] font-bold uppercase tracking-widest px-3" style={{ color: "var(--brand-muted)" }}>
                    Total: {total.toLocaleString()} Entries
                </div>
            </div>

            {error && (
                <div className="px-4 py-3 rounded border bg-red-500/10 border-red-500/20 text-red-400 text-xs text-center font-medium">
                    Error: {error}
                </div>
            )}

            {/* LOG TABLE */}
            <div className="border rounded overflow-hidden shadow-sm" style={{ borderColor: "var(--brand-border)" }}>
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-[9px] font-bold uppercase tracking-widest border-b" style={{ color: "var(--brand-muted)", borderColor: "var(--brand-border)" }}>
                        <tr>
                            <th className="px-6 py-4 w-40">Timestamp</th>
                            <th className="px-6 py-4 w-32">Admin</th>
                            <th className="px-6 py-4 w-40">Action</th>
                            <th className="px-6 py-4">Target</th>
                            <th className="px-6 py-4">IP / Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-xs text-brand-muted italic border-dashed border-2" style={{ borderColor: "var(--brand-border)" }}>Tidak ada log audit ditemukan</td>
                            </tr>
                        )}
                        {logs.map(l => (
                            <tr key={l.id} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="px-6 py-4 text-[10px] font-mono whitespace-nowrap opacity-70">
                                    <div className="flex items-center gap-1.5"><Clock className="w-2.5 h-2.5" /> {new Date(l.created_at).toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center text-[8px] font-bold text-brand-primary uppercase ring-1 ring-brand-primary/20">
                                            {l.admin.charAt(0)}
                                        </div>
                                        <span className="text-xs font-bold">{l.admin}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${l.action.includes('Delete') ? 'bg-red-500/10 text-red-300' : l.action.includes('Add') ? 'bg-green-500/10 text-green-300' : 'bg-blue-500/10 text-blue-300'}`}>
                                        {l.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-mono font-medium truncate max-w-xs" title={l.target}>{l.target || "-"}</td>
                                <td className="px-6 py-4">
                                    <div className="text-[10px] opacity-60 font-mono truncate max-w-sm">IP: {l.ip}</div>
                                    {l.details && <div className="text-[10px] opacity-40 truncate max-w-sm mt-0.5">{l.details}</div>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--brand-border)" }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">
                        Page {page} of {totalPages}
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
