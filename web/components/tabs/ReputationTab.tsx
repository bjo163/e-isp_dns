import React, { useState, useEffect } from "react";
import {
    getReputationSources, type IPReputationSource,
    getReputationEntries, type IPReputationEntry,
    syncReputationSource, addReputationSource, deleteReputationSource
} from "../../lib/api-client";
import {
    ShieldAlert, ShieldCheck, Database, RefreshCw,
    Plus, Trash2, Search, ExternalLink, Globe, LayoutGrid
} from "lucide-react";

export const ReputationTab: React.FC = () => {
    const [sources, setSources] = useState<IPReputationSource[]>([]);
    const [entries, setEntries] = useState<IPReputationEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState<number[]>([]);

    const LIMIT = 50;

    useEffect(() => {
        loadSources();
    }, []);

    useEffect(() => {
        loadEntries();
    }, [page, search]);

    const loadSources = async () => {
        try {
            const s = await getReputationSources();
            setSources(s);
        } catch { /* ignore */ }
    };

    const loadEntries = async () => {
        setLoading(true);
        try {
            const res = await getReputationEntries({ page, limit: LIMIT, search: search || undefined });
            setEntries(res.data);
            setTotal(res.total);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const handleSync = async (id: number) => {
        setSyncing(prev => [...prev, id]);
        try {
            await syncReputationSource(id);
            // Backend syncs in background, so we just wait a bit and refresh sources list 
            // where last_run_at might update
            setTimeout(loadSources, 5000);
        } finally {
            setSyncing(prev => prev.filter(x => x !== id));
        }
    };

    return (
        <div className="max-w-6xl space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">IP Reputation Management</h2>
                    <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>Kelola sumber blacklist IP dan pantau entri reputasi aktif</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--brand-muted)" }} />
                        <input
                            type="text"
                            placeholder="Cari IP / Source..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 pr-4 py-2 border rounded text-xs bg-transparent outline-none w-48 md:w-64 focus:border-brand-primary transition-colors"
                            style={{ borderColor: "var(--brand-border)" }}
                        />
                    </div>
                    <button onClick={loadSources} className="p-2 hover:bg-white/5 rounded transition-colors" style={{ color: "var(--brand-muted)" }}>
                        <RefreshCw className={`w-4 h-4 ${syncing.length > 0 ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* SOURCES GRID */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-brand-primary" />
                        <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>Sumber Blacklist</h3>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border rounded hover:bg-white/5 transition-all"
                        style={{ color: "var(--brand-primary)", borderColor: "var(--brand-border)" }}>
                        <Plus className="w-3 h-3" /> Tambah Sumber
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sources.map(s => (
                        <div key={s.id} className="border rounded p-4 flex flex-col justify-between space-y-4"
                            style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${s.enabled ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                                        {s.enabled ? 'Active' : 'Disabled'}
                                    </span>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleSync(s.id)} disabled={syncing.includes(s.id)}
                                            className="p-1 hover:text-brand-primary transition-colors disabled:opacity-50" style={{ color: "var(--brand-muted)" }}>
                                            <RefreshCw className={`w-3 h-3 ${syncing.includes(s.id) ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button className="p-1 hover:text-red-400 transition-colors" style={{ color: "var(--brand-muted)" }}>
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="font-bold text-sm leading-tight">{s.name}</div>
                                <div className="text-[10px] truncate opacity-40 font-mono">{s.url}</div>
                            </div>

                            <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: "var(--brand-border)" }}>
                                <div>
                                    <div className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "var(--brand-muted)" }}>Entries</div>
                                    <div className="text-sm font-mono font-bold">{(s.last_count || 0).toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "var(--brand-muted)" }}>Last Sync</div>
                                    <div className="text-[10px] font-mono">{s.last_run_at ? new Date(s.last_run_at).toLocaleDateString() : 'Never'}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ENTRIES LIST */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>Entri Reputasi Terdeteksi</h3>
                </div>

                <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>
                            <tr>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">IP / CIDR</th>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3">Reason</th>
                                <th className="px-4 py-3 text-right">Synced At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && entries.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-xs animate-pulse">Memuat data reputasi...</td></tr>
                            )}
                            {entries.length === 0 && !loading && (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-xs" style={{ color: "var(--brand-muted)" }}>Tidak ada data reputasi ditemukan</td></tr>
                            )}
                            {entries.map(e => (
                                <tr key={e.id} className="hover:bg-red-500/[0.02] transition-colors group">
                                    <td className="px-4 py-3">
                                        {e.cidr ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase">Network</span>
                                        ) : (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold uppercase">Single</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs">{e.ip || e.cidr}</td>
                                    <td className="px-4 py-3 text-xs">{e.source}</td>
                                    <td className="px-4 py-3 text-xs italic" style={{ color: "var(--brand-muted)" }}>{e.reason || "Malicious behavior detected"}</td>
                                    <td className="px-4 py-3 text-right font-mono text-[10px] opacity-40 group-hover:opacity-100 transition-opacity">
                                        {new Date(e.updated_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {total > LIMIT && (
                        <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
                            <span className="text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>
                                Halaman {page} dari {Math.ceil(total / LIMIT)} ({total.toLocaleString()} entri)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                    className="px-2 py-1 border rounded text-[10px] disabled:opacity-30 hover:bg-white/5 transition-colors"
                                    style={{ borderColor: "var(--brand-border)" }}
                                >
                                    Prev
                                </button>
                                <button
                                    disabled={page >= Math.ceil(total / LIMIT)}
                                    onClick={() => setPage(page + 1)}
                                    className="px-2 py-1 border rounded text-[10px] disabled:opacity-30 hover:bg-white/5 transition-colors"
                                    style={{ borderColor: "var(--brand-border)" }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
