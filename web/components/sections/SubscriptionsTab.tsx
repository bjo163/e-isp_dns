"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Download, Play } from "lucide-react";
import {
  getSubscriptions, addSubscription, updateSubscription, deleteSubscription, runSubscription,
  getCategories, exportDomainsURL,
  type BlocklistSubscription, type Category,
} from "@/lib/api-client";

export function SubscriptionsTab({ toast }: { toast: (msg: string, type?: "ok" | "err") => void }) {
  const [subs, setSubs] = useState<BlocklistSubscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", category: "", reason: "", interval_hours: 24, enabled: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([getSubscriptions(), getCategories()]);
      setSubs(s ?? []);
      setCategories(c ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) return;
    try {
      const s = await addSubscription(form);
      setSubs(prev => [s, ...prev]);
      setForm({ name: "", url: "", category: "", reason: "", interval_hours: 24, enabled: true });
      setShowAdd(false);
      toast("Subscription ditambahkan");
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Hapus subscription "${name}"?`)) return;
    try {
      await deleteSubscription(id);
      setSubs(prev => prev.filter(s => s.id !== id));
      toast(`Subscription ${name} dihapus`);
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleToggle(s: BlocklistSubscription) {
    try {
      const updated = await updateSubscription(s.id, { ...s, enabled: !s.enabled });
      setSubs(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleRun(id: number, name: string) {
    try {
      await runSubscription(id);
      toast(`Import "${name}" dimulai — cek kembali sebentar lagi`);
      // Reload after brief delay to get updated last_run_at
      setTimeout(load, 3000);
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  function formatDate(s: string | null) {
    if (!s) return "-";
    try { return new Date(s).toLocaleString(); } catch { return s; }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Blocklist Subscriptions</h2>
          <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>Auto-import berkala dari sumber blocklist publik</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border rounded transition-all"
            style={{ color: "var(--brand-accent)", borderColor: "var(--brand-accent)", background: "rgba(99,102,241,0.06)" }}>
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
          <button onClick={load} className="p-1.5 hover:text-foreground transition-colors" style={{ color: "var(--brand-muted)" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>Export Domain List:</span>
        {(["csv", "hosts", "domains", "json"] as const).map(fmt => (
          <a key={fmt} href={exportDomainsURL(fmt)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border rounded transition-colors hover:text-foreground"
            style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}>
            <Download className="w-3 h-3" /> {fmt.toUpperCase()}
          </a>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="border rounded p-5 space-y-4" style={{ borderColor: "var(--brand-accent)" }}>
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--brand-muted)" }}>Subscription Baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Nama (e.g. StevenBlack Porn)" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
              style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
            <input type="url" placeholder="URL blocklist" value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required
              className="px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
              style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
              style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}>
              <option value="">Pilih Kategori</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input type="text" placeholder="Alasan (opsional)" value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
              style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
            <div className="flex items-center gap-3">
              <input type="number" min={1} placeholder="Interval (jam)" value={form.interval_hours}
                onChange={e => setForm(f => ({ ...f, interval_hours: Number(e.target.value) }))}
                className="w-28 px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
              <span className="text-xs" style={{ color: "var(--brand-muted)" }}>jam sekali</span>
            </div>
          </div>
          <button type="submit"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all"
            style={{ color: "var(--brand-accent)", borderColor: "var(--brand-accent)", background: "rgba(99,102,241,0.06)" }}>
            <Plus className="w-3.5 h-3.5" /> Simpan
          </button>
        </form>
      )}

      {/* Subscriptions table */}
      <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
        <div className="grid grid-cols-12 px-4 py-2 border-b text-[9px] font-bold tracking-[0.15em] uppercase"
          style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)", background: "var(--brand-card-bg)" }}>
          <div className="col-span-1">On</div>
          <div className="col-span-2">Nama</div>
          <div className="col-span-2">Kategori</div>
          <div className="col-span-1">Interval</div>
          <div className="col-span-2">Terakhir</div>
          <div className="col-span-1">Count</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Aksi</div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--brand-muted)" }} />
          </div>
        ) : subs.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs" style={{ color: "var(--brand-muted)" }}>
            Belum ada subscription — tambahkan sumber blocklist otomatis
          </div>
        ) : subs.map(s => (
          <div key={s.id} className="grid grid-cols-12 px-4 py-3 border-b last:border-0 items-center hover:bg-white/[0.02]"
            style={{ borderColor: "var(--brand-border)" }}>
            <div className="col-span-1">
              <button onClick={() => handleToggle(s)}
                className="relative w-8 h-4.5 rounded-full transition-colors"
                style={{ background: s.enabled ? "#22c55e" : "var(--brand-border)", width: 32, height: 18 }}>
                <span className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: s.enabled ? "translateX(14px)" : "translateX(0)", width: 14, height: 14 }} />
              </button>
            </div>
            <div className="col-span-2 text-xs font-medium truncate" title={s.url}>{s.name}</div>
            <div className="col-span-2 text-xs" style={{ color: "var(--brand-muted)" }}>{s.category || "-"}</div>
            <div className="col-span-1 text-xs font-mono" style={{ color: "var(--brand-muted)" }}>{s.interval_hours}h</div>
            <div className="col-span-2 text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>{formatDate(s.last_run_at)}</div>
            <div className="col-span-1 text-xs font-mono tabular-nums">{s.last_count > 0 ? s.last_count.toLocaleString() : "-"}</div>
            <div className="col-span-2">
              {s.last_error ? (
                <span className="text-[10px] text-red-400 truncate block" title={s.last_error}>Error</span>
              ) : s.last_run_at ? (
                <span className="text-[10px] text-green-400">OK</span>
              ) : (
                <span className="text-[10px]" style={{ color: "var(--brand-muted)" }}>Pending</span>
              )}
            </div>
            <div className="col-span-1 flex items-center justify-end gap-1.5">
              <button onClick={() => handleRun(s.id, s.name)} title="Run sekarang"
                className="hover:text-green-400 transition-colors" style={{ color: "var(--brand-muted)" }}>
                <Play className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(s.id, s.name)} title="Hapus"
                className="hover:text-red-400 transition-colors" style={{ color: "var(--brand-muted)" }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
