import React, { useState, useEffect } from "react";
import {
  getPresets, type BlocklistPreset,
  getSubscriptions, type BlocklistSubscription,
  addSubscription, deleteSubscription, runSubscription,
  getCategories, type Category
} from "../../lib/api-client";
import {
  Shield, Globe, Database, RefreshCw,
  Plus, Trash2, Search, ExternalLink, Calendar,
  AlertCircle, CheckCircle2, Play
} from "lucide-react";

export const BlocklistsTab: React.FC = () => {
  const [presets, setPresets] = useState<BlocklistPreset[]>([]);
  const [subs, setSubs] = useState<BlocklistSubscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<number[]>([]);

  // Form state for new subscription
  const [newSub, setNewSub] = useState({
    name: "",
    url: "",
    category: "",
    reason: "Public Blocklist",
    interval_hours: 24
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        getPresets(),
        getSubscriptions(),
        getCategories()
      ]);
      setPresets(p);
      setSubs(s);
      setCategories(c);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.url.trim()) return;
    try {
      await addSubscription(newSub);
      setNewSub({ name: "", url: "", category: "", reason: "Public Blocklist", interval_hours: 24 });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPreset = async (p: BlocklistPreset) => {
    try {
      await addSubscription({
        name: p.label,
        url: p.url,
        category: p.category,
        reason: p.description,
        interval_hours: 24
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSub = async (id: number, name: string) => {
    if (!window.confirm(`Hapus subscription "${name}"?`)) return;
    try {
      await deleteSubscription(id);
      setSubs(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRunSub = async (id: number) => {
    setRunning(prev => [...prev, id]);
    try {
      await runSubscription(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRunning(prev => prev.filter(x => x !== id));
    }
  };

  return (
    <div className="max-w-6xl space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Blocklist Management</h2>
          <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>
            Berlangganan ke daftar blokir publik atau tambahkan source custom
          </p>
        </div>
        <button onClick={loadData} className="p-2 hover:bg-white/5 rounded transition-colors" style={{ color: "var(--brand-muted)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ADD CUSTOM SOURCE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand-primary" />
          <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>Tambah Source Custom</h3>
        </div>
        <form onSubmit={handleAddSub} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border rounded bg-white/[0.02]" style={{ borderColor: "var(--brand-border)" }}>
          <input
            type="text" placeholder="Nama Source" value={newSub.name}
            onChange={e => setNewSub(s => ({ ...s, name: e.target.value }))}
            className="md:col-span-1 px-3 py-2 border rounded text-xs bg-transparent outline-none focus:border-brand-primary transition-colors"
            style={{ borderColor: "var(--brand-border)" }}
          />
          <input
            type="text" placeholder="URL (txt/hosts)" value={newSub.url}
            onChange={e => setNewSub(s => ({ ...s, url: e.target.value }))}
            className="md:col-span-2 px-3 py-2 border rounded text-xs bg-transparent outline-none focus:border-brand-primary transition-colors font-mono"
            style={{ borderColor: "var(--brand-border)" }}
          />
          <select
            value={newSub.category}
            onChange={e => setNewSub(s => ({ ...s, category: e.target.value }))}
            className="px-3 py-2 border rounded text-xs bg-transparent outline-none focus:border-brand-primary transition-colors"
            style={{ borderColor: "var(--brand-border)" }}
          >
            <option value="">Pilih Kategori</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <button type="submit" className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded hover:opacity-90 transition-opacity">
            Subscribe
          </button>
        </form>
      </section>

      {/* ACTIVE SUBSCRIPTIONS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>Langganan Aktif</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subs.length === 0 && !loading && (
            <div className="col-span-full py-10 text-center border rounded border-dashed" style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}>
              Belum ada langganan aktif. Pilih dari preset di bawah.
            </div>
          )}
          {subs.map(s => (
            <div key={s.id} className="border rounded p-4 space-y-3 hover:bg-white/[0.01] transition-colors" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
              <div className="flex justify-between items-start">
                <div className="space-y-1 overflow-hidden">
                  <div className="font-bold text-sm truncate">{s.name}</div>
                  <div className="text-[10px] font-mono opacity-40 truncate">{s.url}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleRunSub(s.id)} disabled={running.includes(s.id)}
                    className="p-1.5 hover:bg-white/5 rounded text-brand-primary transition-colors title='Sync Now'">
                    <Play className={`w-3.5 h-3.5 ${running.includes(s.id) ? 'animate-pulse' : ''}`} />
                  </button>
                  <button onClick={() => handleDeleteSub(s.id, s.name)}
                    className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors" style={{ color: "var(--brand-muted)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold uppercase tracking-wider">
                  {s.category || 'Uncategorized'}
                </span>
                {s.last_error && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold flex items-center gap-1" title={s.last_error}>
                    <AlertCircle className="w-2.5 h-2.5" /> Error
                  </span>
                )}
              </div>

              <div className="pt-3 border-t grid grid-cols-2 gap-2" style={{ borderColor: "var(--brand-border)" }}>
                <div>
                  <div className="text-[8px] uppercase tracking-widest font-bold" style={{ color: "var(--brand-muted)" }}>Domains</div>
                  <div className="text-xs font-mono font-bold">{(s.last_count || 0).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] uppercase tracking-widest font-bold" style={{ color: "var(--brand-muted)" }}>Last Run</div>
                  <div className="text-[10px] font-mono">{s.last_run_at ? new Date(s.last_run_at).toLocaleDateString() : 'Never'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRESETS PICKER */}
      <section className="space-y-4 text-xs">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>Rekomendasi Preset</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map(p => {
            const isSubbed = subs.some(s => s.url === p.url);
            return (
              <div key={p.url} className={`border rounded p-4 flex items-center justify-between gap-4 transition-all ${isSubbed ? 'opacity-50 border-white/5' : 'hover:border-brand-primary'}`}
                style={{ borderColor: isSubbed ? 'transparent' : "var(--brand-border)", background: "var(--brand-card-bg)" }}>
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    {p.label}
                    <span className="text-[8px] px-1.5 py-0.5 rounded border font-mono" style={{ borderColor: "var(--brand-border)" }}>{p.format}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--brand-muted)" }}>{p.description}</div>
                  <div className="text-[9px] font-bold text-brand-primary uppercase tracking-tighter">{p.category}</div>
                </div>
                <button
                  disabled={isSubbed}
                  onClick={() => handleAddPreset(p)}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${isSubbed ? 'bg-zinc-800 text-zinc-500' : 'bg-brand-primary text-white hover:opacity-90'}`}>
                  {isSubbed ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
