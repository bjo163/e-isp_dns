"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Settings, Globe, Radio, Wifi, Database, Plus, Trash2,
  Save, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff,
  ChevronRight, Server, LogOut, KeyRound, Download,
} from "lucide-react";
import {
  getBranding, updateBranding, getDomains, addDomain, deleteDomain,
  getDNSConfig, updateDNSConfig, updateDomain, importDomains, changePassword,
  getToken, clearToken,
  type Branding, type BlockedDomain, type DNSConfig, type NewDomain, type ImportResult,
} from "@/lib/api-client";

//  Toast helper 
type Toast = { id: number; msg: string; type: "ok" | "err" };
let _tid = 0;

//  Tabs 
type Tab = "overview" | "branding" | "isp" | "domains" | "dns" | "security";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Overview",        icon: <Radio className="w-3.5 h-3.5" /> },
  { id: "branding",  label: "Branding",         icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "isp",       label: "ISP Config",       icon: <Wifi className="w-3.5 h-3.5" /> },
  { id: "domains",   label: "Blokir Domain",    icon: <Globe className="w-3.5 h-3.5" /> },
  { id: "dns",       label: "DNS Config",       icon: <Server className="w-3.5 h-3.5" /> },
  { id: "security",  label: "Keamanan",         icon: <KeyRound className="w-3.5 h-3.5" /> },
];

//  Reusable Field 
function Field({
  label, value, onChange, type = "text", mono = false, textarea = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; mono?: boolean; textarea?: boolean;
}) {
  const base = `w-full px-3 py-2 text-sm border rounded bg-transparent outline-none focus:ring-1 transition ${mono ? "font-mono" : ""}`;
  const style = { borderColor: "var(--brand-border)", color: "var(--foreground)" };
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>
        {label}
      </label>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={base}
          style={style}
        />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className={base} style={style} />
      )}
    </div>
  );
}

//  NumberField 
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>
        {label}
      </label>
      <input
        type="number" min={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 text-sm border rounded bg-transparent outline-none focus:ring-1 transition font-mono"
        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}
      />
    </div>
  );
}

//  Color Field 
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded border cursor-pointer" style={{ borderColor: "var(--brand-border)" }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
          style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
      </div>
    </div>
  );
}

//  Section header 
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--brand-muted)" }}>{sub}</p>}
    </div>
  );
}

//  Card header 
function CardHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--brand-muted)" }}>{label}</p>
  );
}

//  Save button 
function SaveBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all disabled:opacity-50"
      style={{ color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "rgba(239,68,68,0.06)" }}>
      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      {loading ? "Menyimpan..." : "Simpan"}
    </button>
  );
}

// 
export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab]     = useState<Tab>("overview");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Data states
  const [branding, setBranding]   = useState<Branding | null>(null);
  const [domains, setDomains]     = useState<BlockedDomain[]>([]);
  const [dnsConfig, setDnsConfig] = useState<DNSConfig | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  // Loading states
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  // New domain form
  const [newDomain, setNewDomain] = useState<NewDomain>({ domain: "", reason: "", category: "", active: true });

  // Import form
  const [importUrl, setImportUrl]         = useState("");
  const [importCategory, setImportCategory] = useState("Blokir");
  const [importReason, setImportReason]   = useState("");
  const [importing, setImporting]         = useState(false);
  const [importResult, setImportResult]   = useState<ImportResult | null>(null);

  // Change password form
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew]         = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving]   = useState(false);

  const toast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    const id = ++_tid;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  //  Auth check 
  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
    }
  }, [router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b, d, c] = await Promise.all([getBranding(), getDomains(), getDNSConfig()]);
      setBranding(b);
      setDomains(d);
      setDnsConfig(c);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function handleLogout() {
    clearToken();
    router.replace("/admin/login");
  }

  //  Save handlers 
  async function saveBranding() {
    if (!branding) return;
    setSaving(true);
    try {
      const updated = await updateBranding(branding);
      setBranding(updated);
      toast("Branding berhasil disimpan");
    } catch (e: unknown) { toast((e as Error).message, "err"); }
    finally { setSaving(false); }
  }

  async function saveDNS() {
    if (!dnsConfig) return;
    setSaving(true);
    try {
      const updated = await updateDNSConfig(dnsConfig);
      setDnsConfig(updated);
      toast("DNS config berhasil disimpan");
    } catch (e: unknown) { toast((e as Error).message, "err"); }
    finally { setSaving(false); }
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.domain.trim()) return;
    try {
      const d = await addDomain(newDomain);
      setDomains(prev => [d, ...prev]);
      setNewDomain({ domain: "", reason: "", category: "", active: true });
      toast(`Domain ${d.domain} ditambahkan`);
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleDeleteDomain(id: number, domain: string) {
    if (!window.confirm(`Hapus domain "${domain}"?`)) return;
    try {
      await deleteDomain(id);
      setDomains(prev => prev.filter(d => d.id !== id));
      toast(`Domain ${domain} dihapus`);
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function toggleDomain(d: BlockedDomain) {
    try {
      const updated = await updateDomain(d.id, { ...d, active: !d.active });
      setDomains(prev => prev.map(x => x.id === d.id ? updated : x));
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importDomains(importUrl, importCategory, importReason);
      setImportResult(result);
      toast(`Import selesai: ${result.inserted} domain ditambahkan`);
      loadAll();
    } catch (e: unknown) { toast((e as Error).message, "err"); }
    finally { setImporting(false); }
  }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (pwNew !== pwConfirm) { toast("Konfirmasi password tidak cocok", "err"); return; }
    if (pwNew.length < 4) { toast("Password minimal 4 karakter", "err"); return; }
    setPwSaving(true);
    try {
      await changePassword(pwCurrent, pwNew);
      toast("Password berhasil diubah");
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (e: unknown) { toast((e as Error).message, "err"); }
    finally { setPwSaving(false); }
  }

  //  Render 
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--brand-dark-bg)", color: "var(--foreground)", fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Top accent line */}
      <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg,transparent,var(--brand-primary) 40%,var(--brand-accent) 60%,transparent)" }} />

      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 h-12 border-b"
        style={{ background: "var(--brand-dark-bg)/95", borderColor: "var(--brand-border)" }}
      >
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <span className="text-xs font-bold tracking-[0.15em] uppercase">
            Trust<span style={{ color: "var(--brand-primary)" }}>Positif</span>
            <span className="ml-2 text-[9px] tracking-widest" style={{ color: "var(--brand-muted)" }}>ADMIN</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: connected ? "#4ade80" : connected === false ? "var(--brand-primary)" : "var(--brand-muted)" }}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400 animate-pulse" : connected === false ? "bg-red-500" : "bg-zinc-500"}`} />
            {connected === null ? "CONNECTING..." : connected ? "API ONLINE" : "API OFFLINE"}
          </div>
          <button onClick={loadAll} className="p-1.5 hover:text-foreground transition-colors" style={{ color: "var(--brand-muted)" }} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a href="/" className="text-[10px] tracking-widest uppercase hover:text-foreground transition-colors" style={{ color: "var(--brand-muted)" }}>
            Halaman Utama
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase hover:text-red-400 transition-colors"
            style={{ color: "var(--brand-muted)" }}
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className="hidden md:flex flex-col w-52 border-r pt-6 pb-4 gap-1 shrink-0"
          style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}
        >
          <p className="px-4 text-[9px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "var(--brand-muted)" }}>
            Navigasi
          </p>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium tracking-wide text-left transition-all relative"
              style={{ color: tab === t.id ? "var(--foreground)" : "var(--brand-muted)", background: tab === t.id ? "rgba(239,68,68,0.07)" : "transparent" }}>
              {tab === t.id && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r" style={{ background: "var(--brand-primary)" }} />}
              {t.icon}
              {t.label}
              {t.id === "domains" && domains.length > 0 && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--brand-border)", color: "var(--brand-muted)" }}>
                  {domains.filter(d => d.active).length}
                </span>
              )}
            </button>
          ))}

          <div className="mt-auto px-4 pt-4 border-t" style={{ borderColor: "var(--brand-border)" }}>
            <div className="text-[9px] font-mono space-y-1" style={{ color: "var(--brand-border)" }}>
              <div>SYS:ADMIN</div>
              <div>DB:SQLITE</div>
              <div>v1.0.0</div>
            </div>
          </div>
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden flex overflow-x-auto border-b px-4 gap-0 shrink-0 w-full fixed bottom-0 z-40"
          style={{ background: "var(--brand-card-bg)", borderColor: "var(--brand-border)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-1 px-4 py-2.5 text-[9px] font-medium tracking-wide shrink-0 transition-colors border-t-2"
              style={{ color: tab === t.id ? "var(--brand-primary)" : "var(--brand-muted)", borderColor: tab === t.id ? "var(--brand-primary)" : "transparent" }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--brand-muted)" }} />
            </div>
          ) : connected === false ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <XCircle className="w-10 h-10" style={{ color: "var(--brand-primary)" }} />
              <p className="text-sm font-medium">Tidak bisa terhubung ke API server</p>
              <p className="text-xs" style={{ color: "var(--brand-muted)" }}>
                Pastikan Go DNS server berjalan di port {dnsConfig?.http_port ?? "8080"}
              </p>
              <button onClick={loadAll} className="text-xs px-4 py-2 border rounded transition-colors hover:text-foreground"
                style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}>
                Coba Lagi
              </button>
            </div>
          ) : (
            <>
              {/*  OVERVIEW  */}
              {tab === "overview" && branding && dnsConfig && (
                <div className="max-w-3xl space-y-6">
                  <SectionTitle title="Overview" sub="Status sistem dan ringkasan konfigurasi aktif" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Domain",    value: domains.length,                        icon: <Globe className="w-4 h-4" /> },
                      { label: "Domain Aktif",    value: domains.filter(d => d.active).length,  icon: <CheckCircle2 className="w-4 h-4" /> },
                      { label: "Domain Nonaktif", value: domains.filter(d => !d.active).length, icon: <XCircle className="w-4 h-4" /> },
                      { label: "DNS Listen",      value: dnsConfig.listen_addr.split(":")[1] ?? "53", icon: <Server className="w-4 h-4" /> },
                    ].map(stat => (
                      <div key={stat.label} className="border rounded p-4 space-y-2"
                        style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] tracking-widest uppercase" style={{ color: "var(--brand-muted)" }}>{stat.label}</span>
                          <span style={{ color: "var(--brand-muted)" }}>{stat.icon}</span>
                        </div>
                        <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border rounded" style={{ borderColor: "var(--brand-border)" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "var(--brand-border)" }}>
                      <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>Konfigurasi Aktif</p>
                    </div>
                    <div className="divide-y" style={{ borderColor: "var(--brand-border)" }}>
                      {[
                        ["ISP",            `${branding.isp_name} [${branding.isp_as_number}]`],
                        ["Block Page URL",  branding.block_page_url],
                        ["Redirect IP",     dnsConfig.redirect_ip],
                        ["Upstream DNS",    dnsConfig.upstream_dns],
                        ["API Port",        `:${dnsConfig.http_port}`],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between px-4 py-3">
                          <span className="text-xs" style={{ color: "var(--brand-muted)" }}>{k}</span>
                          <span className="text-xs font-mono">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {domains.length > 0 && (
                    <div className="border rounded" style={{ borderColor: "var(--brand-border)" }}>
                      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--brand-border)" }}>
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>Domain Terblokir Terbaru</p>
                        <button onClick={() => setTab("domains")} className="text-[10px] flex items-center gap-1 hover:text-foreground transition-colors" style={{ color: "var(--brand-accent)" }}>
                          Lihat Semua <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      {domains.slice(0, 5).map(d => (
                        <div key={d.id} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0" style={{ borderColor: "var(--brand-border)" }}>
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.active ? "bg-green-400" : "bg-zinc-600"}`} />
                            <span className="text-xs font-mono">{d.domain}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "var(--brand-border)", color: "var(--brand-muted)" }}>{d.category || "-"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/*  BRANDING  */}
              {tab === "branding" && branding && (
                <div className="max-w-2xl space-y-8">
                  <SectionTitle title="Branding" sub="Konfigurasi tampilan halaman block - semua teks dapat dikustomisasi" />

                  {/* Umum */}
                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Umum" />
                    <Field label="Nama Situs" value={branding.site_name} onChange={v => setBranding(b => b && { ...b, site_name: v })} />
                    <Field label="URL Halaman Block" value={branding.block_page_url} onChange={v => setBranding(b => b && { ...b, block_page_url: v })} mono />
                    <div className="grid grid-cols-2 gap-4">
                      <ColorField label="Primary Color" value={branding.primary_color} onChange={v => setBranding(b => b && { ...b, primary_color: v })} />
                      <ColorField label="Accent Color"  value={branding.accent_color}  onChange={v => setBranding(b => b && { ...b, accent_color: v })} />
                    </div>
                  </div>

                  {/* Hero / Teks Halaman Block */}
                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Hero & Teks Halaman Block" />
                    <Field label="Judul Hero" value={branding.hero_title} onChange={v => setBranding(b => b && { ...b, hero_title: v })} />
                    <Field label="Subjudul Hero" value={branding.hero_subtitle} onChange={v => setBranding(b => b && { ...b, hero_subtitle: v })} textarea />
                    <Field label="Teks Badge Peringatan" value={branding.warning_badge_text} onChange={v => setBranding(b => b && { ...b, warning_badge_text: v })} />
                    <Field label="Placeholder URL Diblokir" value={branding.blocked_url_placeholder} onChange={v => setBranding(b => b && { ...b, blocked_url_placeholder: v })} mono />
                    <Field label="Alasan Blokir Default" value={branding.default_reason} onChange={v => setBranding(b => b && { ...b, default_reason: v })} />
                    <Field label="Teks Catatan / Notice" value={branding.notice_text} onChange={v => setBranding(b => b && { ...b, notice_text: v })} textarea />
                  </div>

                  {/* Section Kategori */}
                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Section Kategori Konten" />
                    <Field label="Judul Section" value={branding.category_title} onChange={v => setBranding(b => b && { ...b, category_title: v })} />
                    <Field label="Deskripsi Section" value={branding.category_subtitle} onChange={v => setBranding(b => b && { ...b, category_subtitle: v })} textarea />
                  </div>

                  {/* Section Banding */}
                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Section Banding / Appeal" />
                    <Field label="Judul Section Banding" value={branding.appeal_title} onChange={v => setBranding(b => b && { ...b, appeal_title: v })} />
                    <Field label="Deskripsi Banding" value={branding.appeal_subtitle} onChange={v => setBranding(b => b && { ...b, appeal_subtitle: v })} textarea />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Label Portal Banding" value={branding.appeal_portal_label} onChange={v => setBranding(b => b && { ...b, appeal_portal_label: v })} />
                      <NumberField label="Estimasi Proses (hari)" value={branding.appeal_process_days} onChange={v => setBranding(b => b && { ...b, appeal_process_days: v })} />
                    </div>
                  </div>

                  {/* Section Kontak */}
                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Section Kontak" />
                    <Field label="Judul Section Kontak" value={branding.contact_title} onChange={v => setBranding(b => b && { ...b, contact_title: v })} />
                    <Field label="Deskripsi Kontak" value={branding.contact_subtitle} onChange={v => setBranding(b => b && { ...b, contact_subtitle: v })} textarea />
                  </div>

                  {/* Footer */}
                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Footer" />
                    <Field label="Teks Legal Footer" value={branding.footer_legal} onChange={v => setBranding(b => b && { ...b, footer_legal: v })} textarea />
                  </div>

                  {/* Regulator */}
                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Regulator (Komdigi)" />
                    <Field label="Nama Lengkap"     value={branding.authority_name}      onChange={v => setBranding(b => b && { ...b, authority_name: v })} />
                    <Field label="Nama Singkat"     value={branding.authority_short_name} onChange={v => setBranding(b => b && { ...b, authority_short_name: v })} />
                    <Field label="Logo URL"         value={branding.authority_logo}       onChange={v => setBranding(b => b && { ...b, authority_logo: v })} mono />
                    <Field label="Alamat"           value={branding.authority_address}    onChange={v => setBranding(b => b && { ...b, authority_address: v })} />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Telepon" value={branding.authority_phone} onChange={v => setBranding(b => b && { ...b, authority_phone: v })} />
                      <Field label="Email"   value={branding.authority_email} onChange={v => setBranding(b => b && { ...b, authority_email: v })} />
                    </div>
                    <Field label="Website"          value={branding.authority_website}   onChange={v => setBranding(b => b && { ...b, authority_website: v })} mono />
                    <Field label="TrustPositif URL" value={branding.trustpositif_url}    onChange={v => setBranding(b => b && { ...b, trustpositif_url: v })} mono />
                  </div>

                  {/* Aset Logo */}
                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Aset Logo Resmi" />
                    <Field label="Komdigi Logo URL"       value={branding.komdigi_logo}      onChange={v => setBranding(b => b && { ...b, komdigi_logo: v })} mono />
                    <Field label="Cyber Drone 9 Logo URL" value={branding.cyber_drone9_logo} onChange={v => setBranding(b => b && { ...b, cyber_drone9_logo: v })} mono />
                    <Field label="AduanKonten Logo URL"   value={branding.aduan_konten_logo} onChange={v => setBranding(b => b && { ...b, aduan_konten_logo: v })} mono />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="AduanKonten URL" value={branding.aduan_konten_url} onChange={v => setBranding(b => b && { ...b, aduan_konten_url: v })} mono />
                      <Field label="CyberDrone9 URL" value={branding.cyber_drone9_url} onChange={v => setBranding(b => b && { ...b, cyber_drone9_url: v })} mono />
                    </div>
                  </div>

                  <SaveBtn loading={saving} onClick={saveBranding} />
                </div>
              )}

              {/*  ISP CONFIG  */}
              {tab === "isp" && branding && (
                <div className="max-w-2xl space-y-6">
                  <SectionTitle title="ISP Config" sub="Data Internet Service Provider yang ditampilkan di halaman block" />

                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <Field label="Nama ISP"     value={branding.isp_name}       onChange={v => setBranding(b => b && { ...b, isp_name: v })} />
                    <Field label="Nama Singkat" value={branding.isp_short_name} onChange={v => setBranding(b => b && { ...b, isp_short_name: v })} />
                    <Field label="AS Number"    value={branding.isp_as_number}  onChange={v => setBranding(b => b && { ...b, isp_as_number: v })} mono />
                    <Field label="Logo URL"     value={branding.isp_logo}       onChange={v => setBranding(b => b && { ...b, isp_logo: v })} mono />
                    {branding.isp_logo && (
                      <div className="flex items-center gap-3 p-3 border rounded" style={{ borderColor: "var(--brand-border)", background: "#fff" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={branding.isp_logo} alt="ISP Logo Preview" className="h-8 w-auto object-contain" />
                        <span className="text-xs" style={{ color: "#555" }}>Preview logo</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Helpline" value={branding.isp_helpline} onChange={v => setBranding(b => b && { ...b, isp_helpline: v })} />
                      <Field label="Email"    value={branding.isp_email}    onChange={v => setBranding(b => b && { ...b, isp_email: v })} />
                    </div>
                    <Field label="Website" value={branding.isp_website} onChange={v => setBranding(b => b && { ...b, isp_website: v })} mono />
                  </div>

                  <SaveBtn loading={saving} onClick={saveBranding} />
                </div>
              )}

              {/*  BLOCKED DOMAINS  */}
              {tab === "domains" && (
                <div className="max-w-3xl space-y-6">
                  <SectionTitle title="Blokir Domain" sub="Domain yang akan di-intercept oleh DNS server" />

                  {/* Add single domain */}
                  <form onSubmit={handleAddDomain} className="border rounded p-5 space-y-4" style={{ borderColor: "var(--brand-border)" }}>
                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>Tambah Domain Manual</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" placeholder="contoh.com" value={newDomain.domain}
                        onChange={e => setNewDomain(d => ({ ...d, domain: e.target.value }))} required
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      <input type="text" placeholder="Kategori" value={newDomain.category}
                        onChange={e => setNewDomain(d => ({ ...d, category: e.target.value }))}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      <input type="text" placeholder="Alasan" value={newDomain.reason}
                        onChange={e => setNewDomain(d => ({ ...d, reason: e.target.value }))}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                    </div>
                    <button type="submit"
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all"
                      style={{ color: "var(--brand-accent)", borderColor: "var(--brand-accent)", background: "rgba(99,102,241,0.06)" }}>
                      <Plus className="w-3.5 h-3.5" /> Tambah Domain
                    </button>
                  </form>

                  {/* Import from URL */}
                  <form onSubmit={handleImport} className="border rounded p-5 space-y-4" style={{ borderColor: "var(--brand-border)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Download className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
                      <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>
                        Import dari URL Publik
                      </p>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>
                      Mendukung format: plain (1 domain/baris), hosts (<code className="font-mono text-[10px]">0.0.0.0 domain</code>), adblock (<code className="font-mono text-[10px]">||domain^</code>)
                    </p>
                    <input type="url" required placeholder="https://raw.githubusercontent.com/.../blocklist.txt"
                      value={importUrl} onChange={e => setImportUrl(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                      style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Kategori (opsional)" value={importCategory}
                        onChange={e => setImportCategory(e.target.value)}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      <input type="text" placeholder="Alasan (opsional)" value={importReason}
                        onChange={e => setImportReason(e.target.value)}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <button type="submit" disabled={importing}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all disabled:opacity-50"
                        style={{ color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "rgba(239,68,68,0.06)" }}>
                        {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {importing ? "Mengimpor..." : "Import Sekarang"}
                      </button>

                      {importResult && (
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span style={{ color: "var(--brand-muted)" }}>Parsed: <strong className="text-foreground">{importResult.parsed}</strong></span>
                          <span style={{ color: "#4ade80" }}>Ditambahkan: <strong>{importResult.inserted}</strong></span>
                          <span style={{ color: "var(--brand-muted)" }}>Dilewati: <strong>{importResult.skipped}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Quick presets */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[9px] tracking-widest uppercase" style={{ color: "var(--brand-border)" }}>Contoh sumber blacklist publik:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "StevenBlack Unified", url: "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts" },
                          { label: "OISD Full", url: "https://big.oisd.nl/domainswild" },
                          { label: "NoTracking", url: "https://raw.githubusercontent.com/notracking/hosts-blocklists/master/dnscrypt-proxy/dnscrypt-proxy.blacklist.txt" },
                        ].map(p => (
                          <button key={p.label} type="button" onClick={() => setImportUrl(p.url)}
                            className="text-[10px] px-2 py-1 rounded border transition-colors hover:text-foreground"
                            style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </form>

                  {/* Domains table */}
                  <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
                    <div className="grid grid-cols-12 px-4 py-2 border-b text-[9px] font-bold tracking-[0.15em] uppercase"
                      style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)", background: "var(--brand-card-bg)" }}>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-4">Domain</div>
                      <div className="col-span-3">Kategori</div>
                      <div className="col-span-3">Alasan</div>
                      <div className="col-span-1 text-right">Aksi</div>
                    </div>
                    {domains.length === 0 ? (
                      <div className="px-4 py-10 text-center text-xs" style={{ color: "var(--brand-muted)" }}>
                        Belum ada domain yang diblokir
                      </div>
                    ) : domains.map(d => (
                      <div key={d.id} className="grid grid-cols-12 px-4 py-3 border-b last:border-0 items-center hover:bg-white/[0.02]"
                        style={{ borderColor: "var(--brand-border)" }}>
                        <div className="col-span-1">
                          <button onClick={() => toggleDomain(d)} title={d.active ? "Nonaktifkan" : "Aktifkan"}>
                            {d.active
                              ? <Eye className="w-3.5 h-3.5 text-green-400" />
                              : <EyeOff className="w-3.5 h-3.5" style={{ color: "var(--brand-muted)" }} />}
                          </button>
                        </div>
                        <div className="col-span-4 text-xs font-mono truncate">{d.domain}</div>
                        <div className="col-span-3 text-xs" style={{ color: "var(--brand-muted)" }}>{d.category || "-"}</div>
                        <div className="col-span-3 text-xs truncate" style={{ color: "var(--brand-muted)" }}>{d.reason || "-"}</div>
                        <div className="col-span-1 flex justify-end">
                          <button onClick={() => handleDeleteDomain(d.id, d.domain)} className="hover:text-red-400 transition-colors" style={{ color: "var(--brand-muted)" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/*  DNS CONFIG  */}
              {tab === "dns" && dnsConfig && (
                <div className="max-w-xl space-y-6">
                  <SectionTitle title="DNS Config" sub="Konfigurasi operasional DNS server - restart server setelah menyimpan" />

                  <div className="space-y-4 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <Field label="Listen Address" value={dnsConfig.listen_addr}  onChange={v => setDnsConfig(c => c && { ...c, listen_addr: v })}  mono />
                    <Field label="Upstream DNS"   value={dnsConfig.upstream_dns} onChange={v => setDnsConfig(c => c && { ...c, upstream_dns: v })} mono />
                    <Field label="Redirect IP"    value={dnsConfig.redirect_ip}  onChange={v => setDnsConfig(c => c && { ...c, redirect_ip: v })}  mono />
                    <Field label="Admin API Port" value={dnsConfig.http_port}    onChange={v => setDnsConfig(c => c && { ...c, http_port: v })}    mono />
                  </div>

                  <div className="flex items-start gap-2 text-xs px-4 py-3 border rounded" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--brand-primary)" }} />
                    <span style={{ color: "var(--brand-muted)" }}>
                      Perubahan <strong>Listen Address</strong> dan <strong>API Port</strong> membutuhkan restart manual server Go.
                    </span>
                  </div>

                  <SaveBtn loading={saving} onClick={saveDNS} />
                </div>
              )}

              {/*  SECURITY  */}
              {tab === "security" && (
                <div className="max-w-sm space-y-8">
                  <SectionTitle title="Keamanan" sub="Ganti password akun admin" />

                  <form onSubmit={handleChangePw} className="border rounded p-5 space-y-4" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Ganti Password" />
                    <Field label="Password Saat Ini" value={pwCurrent} onChange={setPwCurrent} type="password" />
                    <Field label="Password Baru"     value={pwNew}     onChange={setPwNew}     type="password" />
                    <Field label="Konfirmasi Password Baru" value={pwConfirm} onChange={setPwConfirm} type="password" />
                    <button type="submit" disabled={pwSaving}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all disabled:opacity-50"
                      style={{ color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "rgba(239,68,68,0.06)" }}>
                      {pwSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                      {pwSaving ? "Menyimpan..." : "Ganti Password"}
                    </button>
                  </form>

                  <div className="border rounded p-5 space-y-3" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Sesi" />
                    <p className="text-xs" style={{ color: "var(--brand-muted)" }}>Akhiri sesi admin saat ini dan kembali ke halaman login.</p>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all"
                      style={{ color: "var(--brand-muted)", borderColor: "var(--brand-border)" }}>
                      <LogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className="flex items-center gap-2.5 px-4 py-3 rounded border text-xs font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2"
            style={{ background: "var(--brand-card-bg)", borderColor: t.type === "ok" ? "#4ade80" : "var(--brand-primary)", color: "var(--foreground)" }}>
            {t.type === "ok"
              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              : <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--brand-primary)" }} />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
