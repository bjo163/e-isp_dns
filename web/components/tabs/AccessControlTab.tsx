import React, { useState, useEffect } from "react";
import {
  getClients, type ACLClient,
  getDetectedClients, type DetectedClient,
  getIPInfo, type IPEnrichment,
  updateClient, addClient, deleteClient,
  getCategories, type Category
} from "../../lib/api-client";
import {
  Info, Users, Activity, Shield, Globe,
  MapPin, Building2, RefreshCw, Edit2, Trash2,
  Plus, X, Check, Search
} from "lucide-react";

export const AccessControlTab: React.FC = () => {
  const [clients, setClients] = useState<ACLClient[]>([]);
  const [detected, setDetected] = useState<DetectedClient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrichment, setEnrichment] = useState<Record<string, IPEnrichment>>({});
  const [fetchingIP, setFetchingIP] = useState<string | null>(null);

  // Edit & Add Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<ACLClient> | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, d, cat] = await Promise.all([
        getClients(),
        getDetectedClients(),
        getCategories()
      ]);
      setClients(c);
      setDetected(d);
      setCategories(cat);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGetInfo = async (ip: string) => {
    if (enrichment[ip]) return;
    setFetchingIP(ip);
    try {
      const info = await getIPInfo(ip);
      setEnrichment(prev => ({ ...prev, [ip]: info }));
    } catch {
      // silent fail 
    } finally {
      setFetchingIP(null);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.ip) return;
    try {
      if (editingClient.id) {
        await updateClient(editingClient.id, editingClient);
      } else {
        await addClient(editingClient);
      }
      setShowModal(false);
      setEditingClient(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteClient = async (id: number, name: string) => {
    if (!window.confirm(`Hapus client "${name}"?`)) return;
    try {
      await deleteClient(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEdit = (c: ACLClient) => {
    setEditingClient(c);
    setShowModal(true);
  };

  const openRegister = (ip: string) => {
    setEditingClient({ ip, name: "", action: "allow", blocked_categories: "", notes: "" });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingClient({ ip: "", name: "", action: "allow", blocked_categories: "", notes: "" });
    setShowModal(true);
  };

  const IPInfoBlock = ({ ip, info, fetching }: { ip: string, info?: IPEnrichment, fetching: boolean }) => (
    <div className="mt-2 pt-2 border-t text-[10px] space-y-1" style={{ borderColor: "var(--brand-border)" }}>
      {!info && !fetching && (
        <button
          onClick={() => handleGetInfo(ip)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded border hover:bg-white/5 transition-colors"
          style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}
        >
          <Search className="w-2.5 h-2.5" /> Ambil Info Geo/ISP
        </button>
      )}
      {fetching && <div className="flex items-center gap-1.5 text-brand-primary"><RefreshCw className="w-2.5 h-2.5 animate-spin" /> Menarik data...</div>}
      {info && (
        <div className="grid grid-cols-1 gap-1">
          <div className="flex items-center gap-1.5"><Building2 className="w-2.5 h-2.5 text-blue-400" /> {info.isp} ({info.asn})</div>
          <div className="flex items-center gap-1.5"><MapPin className="w-2.5 h-2.5 text-red-400" /> {info.city}, {info.country_code}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Clients & Access Control</h2>
          <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>Kelola akses client dan pantau aktivitas IP</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border rounded hover:bg-white/5 transition-all"
            style={{ color: "var(--brand-primary)", borderColor: "var(--brand-border)" }}>
            <Plus className="w-3.5 h-3.5" /> Manual Add
          </button>
          <button onClick={loadData} className="p-2 hover:bg-white/5 rounded transition-colors" style={{ color: "var(--brand-muted)" }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded border bg-red-500/10 border-red-500/20 text-red-400 text-xs text-center">
          Error: {error}
        </div>
      )}

      {/* REGISTERED CLIENTS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>Klien Terdaftar</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.length === 0 && !loading && (
            <div className="col-span-full border rounded p-12 text-center text-xs text-brand-muted border-dashed"
              style={{ borderColor: "var(--brand-border)" }}>
              Belum ada klien terdaftar. Daftarkan dari list di bawah atau tambah manual.
            </div>
          )}
          {clients.map(cl => (
            <div key={cl.id} className="border rounded p-4 group hover:bg-white/[0.01] transition-all"
              style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
              <div className="flex justify-between items-start mb-3">
                <div className="overflow-hidden">
                  <div className="font-bold text-sm tracking-tight truncate">{cl.name || "Unnamed Client"}</div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--brand-primary)" }}>{cl.ip}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(cl)} className="p-1.5 hover:bg-white/5 rounded transition-colors" style={{ color: "var(--brand-muted)" }}>
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDeleteClient(cl.id!, cl.name || cl.ip)} className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors" style={{ color: "var(--brand-muted)" }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${cl.action === 'allow' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {cl.action}
                </span>
                {cl.blocked_categories && (
                  <span className="text-[9px] truncate opacity-50 font-medium">
                    {cl.blocked_categories}
                  </span>
                )}
              </div>

              {cl.notes && <div className="text-[10px] italic border-l-2 pl-2 mb-3" style={{ color: "var(--brand-muted)", borderColor: "var(--brand-border)" }}>"{cl.notes}"</div>}

              <IPInfoBlock ip={cl.ip} info={enrichment[cl.ip]} fetching={fetchingIP === cl.ip} />
            </div>
          ))}
        </div>
      </section>

      {/* DETECTED CLIENTS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>Klien Terdeteksi (Belum Terdaftar)</h3>
        </div>
        <div className="border rounded overflow-hidden shadow-sm" style={{ borderColor: "var(--brand-border)" }}>
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[9px] font-bold uppercase tracking-widest border-b" style={{ color: "var(--brand-muted)", borderColor: "var(--brand-border)" }}>
              <tr>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Total Queries</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {detected.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-xs text-brand-muted italic">Tidak ada klien terdeteksi baru hari ini</td>
                </tr>
              )}
              {detected.map(d => (
                <tr key={d.ip} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono font-medium">{d.ip}</td>
                  <td className="px-6 py-4 text-xs font-mono opacity-50">{d.query_count.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openRegister(d.ip)}
                      className="text-[10px] font-bold uppercase px-3 py-1.5 rounded border border-brand-primary/30 hover:border-brand-primary text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 transition-all">
                      Daftarkan Klien
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* EDIT/ADD MODAL */}
      {showModal && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--brand-card-bg)] border border-[var(--brand-border)] rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--brand-border)" }}>
              <h3 className="font-bold text-sm uppercase tracking-widest">{editingClient.id ? 'Edit Client' : 'Daftarkan Client'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/5 rounded transition-colors text-brand-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">IP Address</label>
                <input
                  type="text" value={editingClient.ip}
                  onChange={e => setEditingClient({ ...editingClient, ip: e.target.value })}
                  placeholder="e.g. 192.168.1.5" required
                  className="w-full px-3 py-2 text-xs border rounded bg-transparent outline-none focus:border-brand-primary font-mono transition-colors"
                  style={{ borderColor: "var(--brand-border)" }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Nama Klien</label>
                <input
                  type="text" value={editingClient.name}
                  onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                  placeholder="Nama Identifikasi (e.g. Ruang Guru)"
                  className="w-full px-3 py-2 text-xs border rounded bg-transparent outline-none focus:border-brand-primary transition-colors"
                  style={{ borderColor: "var(--brand-border)" }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Default Action</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingClient({ ...editingClient, action: 'allow' })}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase border rounded transition-all ${editingClient.action === 'allow' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-zinc-800 text-zinc-500'}`}>
                    Allow
                  </button>
                  <button type="button" onClick={() => setEditingClient({ ...editingClient, action: 'block' })}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase border rounded transition-all ${editingClient.action === 'block' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-zinc-800 text-zinc-500'}`}>
                    Block
                  </button>
                </div>
              </div>

              {editingClient.action === 'block' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Blocked Categories</label>
                  <p className="text-[8px] italic mb-2 text-brand-muted">Kosongkan jika ingin blokir total</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => {
                      const active = editingClient.blocked_categories?.split(',').includes(cat.name);
                      return (
                        <button key={cat.id} type="button"
                          onClick={() => {
                            const current = editingClient.blocked_categories ? editingClient.blocked_categories.split(',').filter(x => x) : [];
                            const next = active ? current.filter(x => x !== cat.name) : [...current, cat.name];
                            setEditingClient({ ...editingClient, blocked_categories: next.join(',') });
                          }}
                          className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${active ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'border-zinc-800 text-zinc-500'}`}>
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Catatan Internal</label>
                <textarea
                  value={editingClient.notes}
                  onChange={e => setEditingClient({ ...editingClient, notes: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  className="w-full px-3 py-2 text-xs border rounded bg-transparent outline-none focus:border-brand-primary transition-colors h-16 resize-none"
                  style={{ borderColor: "var(--brand-border)" }}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors" style={{ borderColor: "var(--brand-border)" }}>Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-brand-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:opacity-90 transition-opacity">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
