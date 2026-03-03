import React, { useState, useEffect } from "react";
import { getClients, type ACLClient, getDetectedClients, type DetectedClient, getIPInfo, type IPEnrichment } from "../../lib/api-client";
import { Info, Users, Activity, Shield, Globe, MapPin, Building2, RefreshCw } from "lucide-react";

export const AccessControlTab: React.FC = () => {
  const [clients, setClients] = useState<ACLClient[]>([]);
  const [detected, setDetected] = useState<DetectedClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrichment, setEnrichment] = useState<Record<string, IPEnrichment>>({});
  const [fetchingIP, setFetchingIP] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, d] = await Promise.all([getClients(), getDetectedClients()]);
      setClients(c);
      setDetected(d);
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

  const IPInfoBlock = ({ ip, info, fetching }: { ip: string, info?: IPEnrichment, fetching: boolean }) => (
    <div className="mt-2 pt-2 border-t text-[10px] space-y-1 animate-in fade-in slide-in-from-top-1" style={{ borderColor: "var(--brand-border)" }}>
      {!info && !fetching && (
        <button
          onClick={() => handleGetInfo(ip)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded border hover:bg-white/5 transition-colors"
          style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}
        >
          <Info className="w-2.5 h-2.5" /> Ambil Info Geo/ISP
        </button>
      )}
      {fetching && <div className="flex items-center gap-1.5 text-brand-primary"><RefreshCw className="w-2.5 h-2.5 animate-spin" /> Menarik data...</div>}
      {info && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5"><Building2 className="w-2.5 h-2.5 text-blue-400" /> {info.isp} ({info.asn})</div>
          <div className="flex items-center gap-1.5"><MapPin className="w-2.5 h-2.5 text-red-400" /> {info.city}, {info.country_code}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Clients & Access Control</h2>
          <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>Kelola akses client dan pantau aktivitas IP</p>
        </div>
        <button onClick={loadData} className="p-1.5 hover:text-foreground transition-colors" style={{ color: "var(--brand-muted)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded border bg-red-500/10 border-red-500/20 text-red-400 text-xs text-center">
          Error: {error}
        </div>
      )}

      {/* REIGSTERED CLIENTS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>Klien Terdaftar</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.length === 0 && !loading && <div className="col-span-full border rounded p-8 text-center text-xs text-brand-muted" style={{ borderColor: "var(--brand-border)" }}>Belum ada klien terdaftar</div>}
          {clients.map(cl => (
            <div key={cl.id} className="border rounded p-4 group hover:bg-white/[0.02] transition-colors" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-sm tracking-tight">{cl.name || "Unnamed Client"}</div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--brand-primary)" }}>{cl.ip}</div>
                </div>
                <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${cl.action === 'allow' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {cl.action}
                </div>
              </div>
              <div className="text-[10px] space-y-1" style={{ color: "var(--brand-muted)" }}>
                <div>Notes: {cl.notes || "-"}</div>
                <div>Categories: {cl.blocked_categories || "None"}</div>
              </div>
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
        <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-muted)" }}>
              <tr>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Queries</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {detected.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-xs text-brand-muted">Tidak ada klien terdeteksi baru</td>
                </tr>
              )}
              {detected.map(d => (
                <tr key={d.ip} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-4 py-3 text-xs font-mono">{d.ip}</td>
                  <td className="px-4 py-3 text-xs font-mono">{d.query_count}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[10px] font-bold uppercase px-2 py-1 rounded border border-transparent hover:border-brand-primary text-brand-primary transition-all">
                      Daftarkan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
