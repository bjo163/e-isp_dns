"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield, Globe, Radio, Wifi, Plus, Trash2,
  Save, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff,
  ChevronRight, ChevronLeft, Server, LogOut, KeyRound, Download,
  Users, Tags, FileText, Search,
} from "lucide-react";
import {
  getBranding, updateBranding, getDomains, addDomain, deleteDomain,
  getDNSConfig, updateDNSConfig, updateDomain, importDomains, changePassword,
  getToken, clearToken,
  getCategories, addCategory, deleteCategory,
  getClients, getDetectedClients, addClient, deleteClient,
  getRecords, addRecord, updateRecord, deleteRecord,
  getPresets,
  type Branding, type BlockedDomain, type DNSConfig, type NewDomain, type ImportResult,
  type Category, type ACLClient, type DetectedClient,
  type CustomRecord, type BlocklistPreset,
} from "@/lib/api-client";
import { LiveMetrics } from "@/components/sections/LiveMetrics";

//  Toast helper 
type Toast = { id: number; msg: string; type: "ok" | "err" };
let _tid = 0;

//  Tabs 
type Tab = "overview" | "branding" | "isp" | "domains" | "categories" | "clients" | "records" | "dns" | "security";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",    label: "Overview",        icon: <Radio className="w-3.5 h-3.5" /> },
  { id: "branding",    label: "Branding",        icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "isp",         label: "ISP Config",      icon: <Wifi className="w-3.5 h-3.5" /> },
  { id: "domains",     label: "Blokir Domain",   icon: <Globe className="w-3.5 h-3.5" /> },
  { id: "categories",  label: "Kategori",        icon: <Tags className="w-3.5 h-3.5" /> },
  { id: "clients",     label: "Clients / ACL",   icon: <Users className="w-3.5 h-3.5" /> },
  { id: "records",     label: "DNS Records",     icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "dns",         label: "DNS Config",      icon: <Server className="w-3.5 h-3.5" /> },
  { id: "security",    label: "Keamanan",        icon: <KeyRound className="w-3.5 h-3.5" /> },
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
  const [dnsConfig, setDnsConfig] = useState<DNSConfig | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  // Paginated domains
  const [domains, setDomains]       = useState<BlockedDomain[]>([]);
  const [domainTotal, setDomainTotal] = useState(0);
  const [domainPage, setDomainPage] = useState(1);
  const [domainSearch, setDomainSearch] = useState("");
  const [domainCatFilter, setDomainCatFilter] = useState("");
  const DOMAIN_LIMIT = 50;

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCat, setNewCat] = useState({ name: "", description: "", color: "#6366f1", icon: "Globe" });

  // Clients / ACL
  const [clients, setClients] = useState<ACLClient[]>([]);
  const [detected, setDetected] = useState<DetectedClient[]>([]);
  const [newClient, setNewClient] = useState({ ip: "", name: "", action: "allow", notes: "" });

  // Custom DNS Records (paginated)
  const [records, setRecords]       = useState<CustomRecord[]>([]);
  const [recordTotal, setRecordTotal] = useState(0);
  const [recordPage, setRecordPage] = useState(1);
  const [recordSearch, setRecordSearch] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState("");
  const RECORD_LIMIT = 50;
  const [newRecord, setNewRecord] = useState({ name: "", type: "A", value: "", ttl: 3600, priority: 0, notes: "" });

  // Presets
  const [presets, setPresets] = useState<BlocklistPreset[]>([]);

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

  // Load domains (paginated)
  const loadDomains = useCallback(async (page?: number, search?: string, cat?: string) => {
    try {
      const p = page ?? domainPage;
      const s = search ?? domainSearch;
      const c = cat ?? domainCatFilter;
      const res = await getDomains({ page: p, limit: DOMAIN_LIMIT, search: s || undefined, category: c || undefined });
      setDomains(res.data);
      setDomainTotal(res.total);
    } catch { /* silently fail, loadAll handles connection */ }
  }, [domainPage, domainSearch, domainCatFilter]);

  // Load records (paginated)
  const loadRecords = useCallback(async (page?: number, search?: string, type?: string) => {
    try {
      const p = page ?? recordPage;
      const s = search ?? recordSearch;
      const t = type ?? recordTypeFilter;
      const res = await getRecords({ page: p, limit: RECORD_LIMIT, search: s || undefined, type: t || undefined });
      setRecords(res.data);
      setRecordTotal(res.total);
    } catch { /* silent */ }
  }, [recordPage, recordSearch, recordTypeFilter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([getBranding(), getDNSConfig()]);
      setBranding(b);
      setDnsConfig(c);
      setConnected(true);
      // Load sub-data in background
      loadDomains(1, "", "");
      getCategories().then(setCategories).catch(() => {});
      getClients().then(setClients).catch(() => {});
      getDetectedClients().then(setDetected).catch(() => {});
      loadRecords(1, "", "");
      getPresets().then(setPresets).catch(() => {});
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [loadDomains, loadRecords]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Reload domains on filter/page change
  useEffect(() => { if (connected) loadDomains(); }, [domainPage, domainSearch, domainCatFilter, connected, loadDomains]);
  useEffect(() => { if (connected) loadRecords(); }, [recordPage, recordSearch, recordTypeFilter, connected, loadRecords]);

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
      await addDomain(newDomain);
      setNewDomain({ domain: "", reason: "", category: "", active: true });
      toast("Domain ditambahkan");
      loadDomains(1, domainSearch, domainCatFilter);
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleDeleteDomain(id: number, domain: string) {
    if (!window.confirm(`Hapus domain "${domain}"?`)) return;
    try {
      await deleteDomain(id);
      toast(`Domain ${domain} dihapus`);
      loadDomains();
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
      loadDomains(1, "", "");
    } catch (e: unknown) { toast((e as Error).message, "err"); }
    finally { setImporting(false); }
  }

  // Category handlers
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    try {
      const c = await addCategory(newCat);
      setCategories(prev => [...prev, c]);
      setNewCat({ name: "", description: "", color: "#6366f1", icon: "Globe" });
      toast("Kategori ditambahkan");
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleDeleteCategory(id: number, name: string) {
    if (!window.confirm(`Hapus kategori "${name}"?`)) return;
    try {
      await deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast(`Kategori ${name} dihapus`);
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  // Client handlers
  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newClient.ip.trim()) return;
    try {
      const c = await addClient(newClient);
      setClients(prev => [...prev, c]);
      setDetected(prev => prev.filter(d => d.ip !== newClient.ip));
      setNewClient({ ip: "", name: "", action: "allow", notes: "" });
      toast("Client ditambahkan");
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleDeleteClient(id: number) {
    try {
      await deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
      toast("Client dihapus");
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleQuickAddClient(ip: string) {
    try {
      const c = await addClient({ ip, name: "", action: "allow", notes: "Auto-detected" });
      setClients(prev => [...prev, c]);
      setDetected(prev => prev.filter(d => d.ip !== ip));
      toast(`Client ${ip} ditambahkan`);
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  // Record handlers
  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!newRecord.name.trim() || !newRecord.value.trim()) return;
    try {
      await addRecord({ ...newRecord, active: true });
      setNewRecord({ name: "", type: "A", value: "", ttl: 3600, priority: 0, notes: "" });
      toast("Record ditambahkan");
      loadRecords(1, recordSearch, recordTypeFilter);
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function handleDeleteRecord(id: number, name: string) {
    if (!window.confirm(`Hapus record "${name}"?`)) return;
    try {
      await deleteRecord(id);
      toast(`Record ${name} dihapus`);
      loadRecords();
    } catch (e: unknown) { toast((e as Error).message, "err"); }
  }

  async function toggleRecord(r: CustomRecord) {
    try {
      const updated = await updateRecord(r.id, { ...r, active: !r.active });
      setRecords(prev => prev.map(x => x.id === r.id ? updated : x));
    } catch (e: unknown) { toast((e as Error).message, "err"); }
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

  const domainPages = Math.max(1, Math.ceil(domainTotal / DOMAIN_LIMIT));
  const recordPages = Math.max(1, Math.ceil(recordTotal / RECORD_LIMIT));
  const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "PTR", "NS", "SRV"];

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
          <Link href="/" className="text-[10px] tracking-widest uppercase hover:text-foreground transition-colors" style={{ color: "var(--brand-muted)" }}>
            Halaman Utama
          </Link>
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
              {t.id === "domains" && domainTotal > 0 && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--brand-border)", color: "var(--brand-muted)" }}>
                  {domainTotal.toLocaleString()}
                </span>
              )}
              {t.id === "records" && recordTotal > 0 && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--brand-border)", color: "var(--brand-muted)" }}>
                  {recordTotal}
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
              className="flex flex-col items-center gap-1 px-3 py-2.5 text-[8px] font-medium tracking-wide shrink-0 transition-colors border-t-2"
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
                <div className="space-y-6">
                  <SectionTitle title="Overview" sub="Status sistem dan ringkasan konfigurasi aktif" />

                  {/* Live Metrics (compact, WebSocket) */}
                  <LiveMetrics compact />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Domain", value: domainTotal.toLocaleString(), icon: <Globe className="w-4 h-4" /> },
                      { label: "Kategori",     value: categories.length,            icon: <Tags className="w-4 h-4" /> },
                      { label: "ACL Clients",  value: clients.length,               icon: <Users className="w-4 h-4" /> },
                      { label: "DNS Records",  value: recordTotal,                  icon: <FileText className="w-4 h-4" /> },
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
                        ["ISP",              `${branding.isp_name} [${branding.isp_as_number}]`],
                        ["Block Page URL",   branding.block_page_url],
                        ["Redirect IP",      dnsConfig.redirect_ip],
                        ["Upstream DNS",     dnsConfig.upstream_dns],
                        ["API Port",         `:${dnsConfig.http_port}`],
                        ["ACL Default",      dnsConfig.acl_default_allow ? "Allow All" : "Block All"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between px-4 py-3">
                          <span className="text-xs" style={{ color: "var(--brand-muted)" }}>{k}</span>
                          <span className="text-xs font-mono">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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

              {/*  BLOCKED DOMAINS (PAGINATED)  */}
              {tab === "domains" && (
                <div className="max-w-4xl space-y-6">
                  <SectionTitle title="Blokir Domain" sub={`${domainTotal.toLocaleString()} domain terdaftar`} />

                  {/* Search & Filter bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--brand-muted)" }} />
                      <input type="text" placeholder="Cari domain..." value={domainSearch}
                        onChange={e => { setDomainSearch(e.target.value); setDomainPage(1); }}
                        className="w-full pl-9 pr-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                    </div>
                    <select value={domainCatFilter} onChange={e => { setDomainCatFilter(e.target.value); setDomainPage(1); }}
                      className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                      style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}>
                      <option value="">Semua Kategori</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name} ({c.domain_count})</option>)}
                    </select>
                  </div>

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

                    {/* Presets from API */}
                    {presets.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[9px] tracking-widest uppercase" style={{ color: "var(--brand-border)" }}>Blocklist presets:</p>
                        <div className="flex flex-wrap gap-2">
                          {presets.map(p => (
                            <button key={p.label} type="button" onClick={() => { setImportUrl(p.url); setImportCategory(p.category); }}
                              className="text-[10px] px-2 py-1 rounded border transition-colors hover:text-foreground"
                              style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}
                              title={p.description}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                        {domainSearch || domainCatFilter ? "Tidak ada domain yang cocok" : "Belum ada domain yang diblokir"}
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

                  {/* Pagination */}
                  {domainPages > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>
                        Halaman {domainPage} / {domainPages}  ({domainTotal.toLocaleString()} domain)
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setDomainPage(p => Math.max(1, p - 1))} disabled={domainPage <= 1}
                          className="p-1.5 border rounded disabled:opacity-30 transition-colors hover:text-foreground"
                          style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDomainPage(p => Math.min(domainPages, p + 1))} disabled={domainPage >= domainPages}
                          className="p-1.5 border rounded disabled:opacity-30 transition-colors hover:text-foreground"
                          style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/*  CATEGORIES  */}
              {tab === "categories" && (
                <div className="max-w-3xl space-y-6">
                  <SectionTitle title="Kategori" sub="Kelola kategori untuk domain yang diblokir" />

                  {/* Add category form */}
                  <form onSubmit={handleAddCategory} className="border rounded p-5 space-y-4" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Tambah Kategori" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" placeholder="Nama Kategori" value={newCat.name}
                        onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))} required
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      <input type="text" placeholder="Deskripsi" value={newCat.description}
                        onChange={e => setNewCat(c => ({ ...c, description: e.target.value }))}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <input type="color" value={newCat.color} onChange={e => setNewCat(c => ({ ...c, color: e.target.value }))}
                          className="w-8 h-8 rounded border cursor-pointer" style={{ borderColor: "var(--brand-border)" }} />
                        <input type="text" value={newCat.color} onChange={e => setNewCat(c => ({ ...c, color: e.target.value }))}
                          className="flex-1 px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                          style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      </div>
                      <input type="text" placeholder="Icon (lucide name)" value={newCat.icon}
                        onChange={e => setNewCat(c => ({ ...c, icon: e.target.value }))}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                    </div>
                    <button type="submit"
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all"
                      style={{ color: "var(--brand-accent)", borderColor: "var(--brand-accent)", background: "rgba(99,102,241,0.06)" }}>
                      <Plus className="w-3.5 h-3.5" /> Tambah Kategori
                    </button>
                  </form>

                  {/* Categories table */}
                  <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
                    <div className="grid grid-cols-12 px-4 py-2 border-b text-[9px] font-bold tracking-[0.15em] uppercase"
                      style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)", background: "var(--brand-card-bg)" }}>
                      <div className="col-span-1">Warna</div>
                      <div className="col-span-3">Nama</div>
                      <div className="col-span-4">Deskripsi</div>
                      <div className="col-span-2">Domain</div>
                      <div className="col-span-2 text-right">Aksi</div>
                    </div>
                    {categories.length === 0 ? (
                      <div className="px-4 py-10 text-center text-xs" style={{ color: "var(--brand-muted)" }}>
                        Belum ada kategori
                      </div>
                    ) : categories.map(c => (
                      <div key={c.id} className="grid grid-cols-12 px-4 py-3 border-b last:border-0 items-center hover:bg-white/[0.02]"
                        style={{ borderColor: "var(--brand-border)" }}>
                        <div className="col-span-1">
                          <span className="w-4 h-4 rounded-full inline-block" style={{ background: c.color || "#888" }} />
                        </div>
                        <div className="col-span-3 text-xs font-medium">{c.name}</div>
                        <div className="col-span-4 text-xs truncate" style={{ color: "var(--brand-muted)" }}>{c.description || "-"}</div>
                        <div className="col-span-2 text-xs font-mono" style={{ color: "var(--brand-muted)" }}>{c.domain_count}</div>
                        <div className="col-span-2 flex justify-end">
                          <button onClick={() => handleDeleteCategory(c.id, c.name)} className="hover:text-red-400 transition-colors" style={{ color: "var(--brand-muted)" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/*  CLIENTS / ACL  */}
              {tab === "clients" && (
                <div className="max-w-3xl space-y-6">
                  <SectionTitle title="Clients / ACL" sub="Kontrol akses client berdasarkan IP — default: Allow All" />

                  {/* Detected clients */}
                  {detected.length > 0 && (
                    <div className="border rounded p-5 space-y-3" style={{ borderColor: "var(--brand-border)" }}>
                      <CardHeader label="Client Terdeteksi (belum dikelola)" />
                      <div className="flex flex-wrap gap-2">
                        {detected.map(d => (
                          <div key={d.ip} className="flex items-center gap-2 px-3 py-1.5 border rounded text-xs font-mono"
                            style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}>
                            <span>{d.ip}</span>
                            <span className="text-[9px]" style={{ color: "var(--brand-muted)" }}>({d.query_count}q)</span>
                            <button onClick={() => handleQuickAddClient(d.ip)}
                              className="text-[10px] px-2 py-0.5 rounded border hover:text-foreground transition-colors"
                              style={{ borderColor: "var(--brand-accent)", color: "var(--brand-accent)" }}>
                              + Allow
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add client form */}
                  <form onSubmit={handleAddClient} className="border rounded p-5 space-y-4" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Tambah Client Manual" />
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input type="text" placeholder="IP Address" value={newClient.ip}
                        onChange={e => setNewClient(c => ({ ...c, ip: e.target.value }))} required
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      <input type="text" placeholder="Nama (opsional)" value={newClient.name}
                        onChange={e => setNewClient(c => ({ ...c, name: e.target.value }))}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      <select value={newClient.action} onChange={e => setNewClient(c => ({ ...c, action: e.target.value }))}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}>
                        <option value="allow">Allow</option>
                        <option value="block">Block</option>
                      </select>
                      <input type="text" placeholder="Catatan" value={newClient.notes}
                        onChange={e => setNewClient(c => ({ ...c, notes: e.target.value }))}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                    </div>
                    <button type="submit"
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all"
                      style={{ color: "var(--brand-accent)", borderColor: "var(--brand-accent)", background: "rgba(99,102,241,0.06)" }}>
                      <Plus className="w-3.5 h-3.5" /> Tambah Client
                    </button>
                  </form>

                  {/* Clients table */}
                  <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
                    <div className="grid grid-cols-12 px-4 py-2 border-b text-[9px] font-bold tracking-[0.15em] uppercase"
                      style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)", background: "var(--brand-card-bg)" }}>
                      <div className="col-span-3">IP</div>
                      <div className="col-span-3">Nama</div>
                      <div className="col-span-2">Aksi</div>
                      <div className="col-span-3">Catatan</div>
                      <div className="col-span-1 text-right">Hapus</div>
                    </div>
                    {clients.length === 0 ? (
                      <div className="px-4 py-10 text-center text-xs" style={{ color: "var(--brand-muted)" }}>
                        Belum ada client yang dikelola — Default: allow all
                      </div>
                    ) : clients.map(c => (
                      <div key={c.id} className="grid grid-cols-12 px-4 py-3 border-b last:border-0 items-center hover:bg-white/[0.02]"
                        style={{ borderColor: "var(--brand-border)" }}>
                        <div className="col-span-3 text-xs font-mono">{c.ip}</div>
                        <div className="col-span-3 text-xs" style={{ color: "var(--brand-muted)" }}>{c.name || "-"}</div>
                        <div className="col-span-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${c.action === "allow" ? "text-green-400" : "text-red-400"}`}
                            style={{ background: c.action === "allow" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>
                            {c.action}
                          </span>
                        </div>
                        <div className="col-span-3 text-xs truncate" style={{ color: "var(--brand-muted)" }}>{c.notes || "-"}</div>
                        <div className="col-span-1 flex justify-end">
                          <button onClick={() => handleDeleteClient(c.id)} className="hover:text-red-400 transition-colors" style={{ color: "var(--brand-muted)" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/*  CUSTOM DNS RECORDS (PAGINATED)  */}
              {tab === "records" && (
                <div className="max-w-4xl space-y-6">
                  <SectionTitle title="DNS Records" sub={`${recordTotal} custom record — seperti real DNS server (A, AAAA, CNAME, MX, TXT, PTR, NS, SRV)`} />

                  {/* Search & Filter */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--brand-muted)" }} />
                      <input type="text" placeholder="Cari name..." value={recordSearch}
                        onChange={e => { setRecordSearch(e.target.value); setRecordPage(1); }}
                        className="w-full pl-9 pr-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                    </div>
                    <select value={recordTypeFilter} onChange={e => { setRecordTypeFilter(e.target.value); setRecordPage(1); }}
                      className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                      style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}>
                      <option value="">Semua Type</option>
                      {DNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Add record form */}
                  <form onSubmit={handleAddRecord} className="border rounded p-5 space-y-4" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Tambah Record" />
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                      <input type="text" placeholder="nama.domain.com" value={newRecord.name}
                        onChange={e => setNewRecord(r => ({ ...r, name: e.target.value }))} required
                        className="sm:col-span-2 px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      <select value={newRecord.type} onChange={e => setNewRecord(r => ({ ...r, type: e.target.value }))}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}>
                        {DNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="text" placeholder="Value" value={newRecord.value}
                        onChange={e => setNewRecord(r => ({ ...r, value: e.target.value }))} required
                        className="sm:col-span-2 px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      <input type="number" placeholder="TTL" value={newRecord.ttl}
                        onChange={e => setNewRecord(r => ({ ...r, ttl: Number(e.target.value) }))}
                        className="px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                    </div>
                    {(newRecord.type === "MX" || newRecord.type === "SRV") && (
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder="Priority" value={newRecord.priority}
                          onChange={e => setNewRecord(r => ({ ...r, priority: Number(e.target.value) }))}
                          className="px-3 py-2 text-sm border rounded bg-transparent outline-none font-mono"
                          style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                        <input type="text" placeholder="Catatan (opsional)" value={newRecord.notes}
                          onChange={e => setNewRecord(r => ({ ...r, notes: e.target.value }))}
                          className="px-3 py-2 text-sm border rounded bg-transparent outline-none"
                          style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }} />
                      </div>
                    )}
                    <button type="submit"
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all"
                      style={{ color: "var(--brand-accent)", borderColor: "var(--brand-accent)", background: "rgba(99,102,241,0.06)" }}>
                      <Plus className="w-3.5 h-3.5" /> Tambah Record
                    </button>
                  </form>

                  {/* Records table */}
                  <div className="border rounded overflow-hidden" style={{ borderColor: "var(--brand-border)" }}>
                    <div className="grid grid-cols-12 px-4 py-2 border-b text-[9px] font-bold tracking-[0.15em] uppercase"
                      style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)", background: "var(--brand-card-bg)" }}>
                      <div className="col-span-1">Aktif</div>
                      <div className="col-span-3">Name</div>
                      <div className="col-span-1">Type</div>
                      <div className="col-span-3">Value</div>
                      <div className="col-span-1">TTL</div>
                      <div className="col-span-2">Notes</div>
                      <div className="col-span-1 text-right">Aksi</div>
                    </div>
                    {records.length === 0 ? (
                      <div className="px-4 py-10 text-center text-xs" style={{ color: "var(--brand-muted)" }}>
                        {recordSearch || recordTypeFilter ? "Tidak ada record yang cocok" : "Belum ada custom DNS record"}
                      </div>
                    ) : records.map(r => (
                      <div key={r.id} className="grid grid-cols-12 px-4 py-3 border-b last:border-0 items-center hover:bg-white/[0.02]"
                        style={{ borderColor: "var(--brand-border)" }}>
                        <div className="col-span-1">
                          <button onClick={() => toggleRecord(r)} title={r.active ? "Nonaktifkan" : "Aktifkan"}>
                            {r.active
                              ? <Eye className="w-3.5 h-3.5 text-green-400" />
                              : <EyeOff className="w-3.5 h-3.5" style={{ color: "var(--brand-muted)" }} />}
                          </button>
                        </div>
                        <div className="col-span-3 text-xs font-mono truncate">{r.name}</div>
                        <div className="col-span-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold font-mono"
                            style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{r.type}</span>
                        </div>
                        <div className="col-span-3 text-xs font-mono truncate" style={{ color: "var(--brand-muted)" }}>{r.value}</div>
                        <div className="col-span-1 text-xs font-mono" style={{ color: "var(--brand-muted)" }}>{r.ttl}</div>
                        <div className="col-span-2 text-xs truncate" style={{ color: "var(--brand-muted)" }}>{r.notes || "-"}</div>
                        <div className="col-span-1 flex justify-end">
                          <button onClick={() => handleDeleteRecord(r.id, r.name)} className="hover:text-red-400 transition-colors" style={{ color: "var(--brand-muted)" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {recordPages > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono" style={{ color: "var(--brand-muted)" }}>
                        Halaman {recordPage} / {recordPages} ({recordTotal} records)
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setRecordPage(p => Math.max(1, p - 1))} disabled={recordPage <= 1}
                          className="p-1.5 border rounded disabled:opacity-30 transition-colors hover:text-foreground"
                          style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setRecordPage(p => Math.min(recordPages, p + 1))} disabled={recordPage >= recordPages}
                          className="p-1.5 border rounded disabled:opacity-30 transition-colors hover:text-foreground"
                          style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
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

                  {/* ACL Default Toggle */}
                  <div className="space-y-3 border rounded p-5" style={{ borderColor: "var(--brand-border)" }}>
                    <CardHeader label="Access Control (ACL)" />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDnsConfig(c => c && { ...c, acl_default_allow: !c.acl_default_allow })}
                        className="relative w-11 h-6 rounded-full transition-colors"
                        style={{ background: dnsConfig.acl_default_allow ? "#22c55e" : "#ef4444" }}>
                        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                          style={{ transform: dnsConfig.acl_default_allow ? "translateX(20px)" : "translateX(0)" }} />
                      </button>
                      <span className="text-xs">
                        Default: <strong>{dnsConfig.acl_default_allow ? "Allow All" : "Block All"}</strong>
                      </span>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--brand-muted)" }}>
                      {dnsConfig.acl_default_allow
                        ? "Semua client diizinkan kecuali yang di-block di tab Clients"
                        : "Semua client diblokir kecuali yang di-allow di tab Clients"}
                    </p>
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
