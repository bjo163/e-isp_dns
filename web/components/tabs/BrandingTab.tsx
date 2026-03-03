"use client";

import React, { useState, useEffect } from "react";
import { getBranding, updateBranding, type Branding } from "@/lib/api-client";
import { Paintbrush, Globe, Info, Save, RefreshCw, Image as ImageIcon, ShieldCheck, Headphones } from "lucide-react";

export const BrandingTab: React.FC = () => {
    const [branding, setBranding] = useState<Branding | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getBranding().then(setBranding).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        if (!branding) return;
        setSaving(true);
        try {
            await updateBranding(branding);
            alert("Branding berhasil disimpan");
        } catch (err: any) {
            alert("Gagal menyimpan branding: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
    if (!branding) return <div>Gagal memuat data branding</div>;

    const Field = ({ label, value, onChange, placeholder = "", mono = false, type = "text", textarea = false }: any) => (
        <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">{label}</label>
            {textarea ? (
                <textarea
                    rows={2}
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full px-3 py-2 text-sm border rounded bg-transparent outline-none focus:ring-1 transition resize-none`}
                    style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}
                />
            ) : (
                <input
                    type={type}
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full px-3 py-2 text-sm border rounded bg-transparent outline-none focus:ring-1 transition ${mono ? "font-mono" : ""}`}
                    style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}
                />
            )}
        </div>
    );

    const Section = ({ title, sub, icon, children }: any) => (
        <div className="border rounded p-6 space-y-4" style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">{icon}</span>
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">{title}</p>
                        {sub && <p className="text-[10px] mt-0.5 opacity-60">{sub}</p>}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {children}
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl space-y-8 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Identity & Branding</h2>
                    <p className="text-sm mt-1 text-muted-foreground">Konfigurasi visual dan identitas portal TrustPositif</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setLoading(true); getBranding().then(setBranding).finally(() => setLoading(false)); }}
                        className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase border transition-all hover:bg-white/5"
                        style={{ borderColor: "var(--brand-border)", color: "var(--brand-muted)" }}
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 text-[10px] font-bold tracking-widest uppercase border transition-all shadow-lg shadow-brand-primary/10 disabled:opacity-50"
                        style={{ color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "rgba(239,68,68,0.06)" }}
                    >
                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
                    </button>
                </div>
            </div>

            <Section title="General Site Settings" sub="Pengaturan dasar identitas website dan URL redirect" icon={<Globe className="w-4 h-4" />}>
                <Field label="Site Display Name" value={branding.site_name} onChange={(v: string) => setBranding({ ...branding, site_name: v })} />
                <Field label="Block Page Redirect URL" value={branding.block_page_url} onChange={(v: string) => setBranding({ ...branding, block_page_url: v })} mono />
            </Section>

            <Section title="Block Page Content" sub="Copy dan pesan yang muncul saat user mengakses situs terlarang" icon={<Paintbrush className="w-4 h-4" />}>
                <Field label="Hero Main Title" value={branding.hero_title} onChange={(v: string) => setBranding({ ...branding, hero_title: v })} />
                <Field label="Hero Subtitle" value={branding.hero_subtitle} onChange={(v: string) => setBranding({ ...branding, hero_subtitle: v })} textarea />
                <Field label="Warning Badge Text" value={branding.warning_badge_text} onChange={(v: string) => setBranding({ ...branding, warning_badge_text: v })} />
                <Field label="Blocked URL Placeholder" value={branding.blocked_url_placeholder} onChange={(v: string) => setBranding({ ...branding, blocked_url_placeholder: v })} />
                <Field label="Default Reason" value={branding.default_reason} onChange={(v: string) => setBranding({ ...branding, default_reason: v })} />
                <Field label="Notice Text (Legal)" value={branding.notice_text} onChange={(v: string) => setBranding({ ...branding, notice_text: v })} textarea />
            </Section>

            <Section title="Categories & Appeals" sub="Judul bagian kategori dan prosedur pengaduan" icon={<ShieldCheck className="w-4 h-4" />}>
                <Field label="Category Section Title" value={branding.category_title} onChange={(v: string) => setBranding({ ...branding, category_title: v })} />
                <Field label="Category Section Subtitle" value={branding.category_subtitle} onChange={(v: string) => setBranding({ ...branding, category_subtitle: v })} />
                <Field label="Appeal Section Title" value={branding.appeal_title} onChange={(v: string) => setBranding({ ...branding, appeal_title: v })} />
                <Field label="Appeal Section Subtitle" value={branding.appeal_subtitle} onChange={(v: string) => setBranding({ ...branding, appeal_subtitle: v })} />
                <Field label="Appeal Portal Label" value={branding.appeal_portal_label} onChange={(v: string) => setBranding({ ...branding, appeal_portal_label: v })} />
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Process Duration (Days)</label>
                    <input
                        type="number"
                        value={branding.appeal_process_days}
                        onChange={(e) => setBranding({ ...branding, appeal_process_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-sm border rounded bg-transparent outline-none focus:ring-1 transition font-mono"
                        style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}
                    />
                </div>
            </Section>

            <Section title="Regulator Information" sub="Instansi pemerintah yang berwenang (Komdigi)" icon={<Info className="w-4 h-4" />}>
                <Field label="Authority Official Name" value={branding.authority_name} onChange={(v: string) => setBranding({ ...branding, authority_name: v })} />
                <Field label="Authority Short Name" value={branding.authority_short_name} onChange={(v: string) => setBranding({ ...branding, authority_short_name: v })} />
                <Field label="Authority Address" value={branding.authority_address} onChange={(v: string) => setBranding({ ...branding, authority_address: v })} />
                <Field label="Authority Website" value={branding.authority_website} onChange={(v: string) => setBranding({ ...branding, authority_website: v })} mono />
                <Field label="Authority Email" value={branding.authority_email} onChange={(v: string) => setBranding({ ...branding, authority_email: v })} mono />
                <Field label="Authority Phone" value={branding.authority_phone} onChange={(v: string) => setBranding({ ...branding, authority_phone: v })} />
                <Field label="Official Logo URL" value={branding.authority_logo} onChange={(v: string) => setBranding({ ...branding, authority_logo: v })} mono />
                <Field label="TrustPositif Web URL" value={branding.trustpositif_url} onChange={(v: string) => setBranding({ ...branding, trustpositif_url: v })} mono />
            </Section>

            <Section title="ISP Details" sub="Informasi perusahaan penyedia jasa internet (ISP)" icon={<Headphones className="w-4 h-4" />}>
                <Field label="ISP Full Name" value={branding.isp_name} onChange={(v: string) => setBranding({ ...branding, isp_name: v })} />
                <Field label="ISP Short Name" value={branding.isp_short_name} onChange={(v: string) => setBranding({ ...branding, isp_short_name: v })} />
                <Field label="ISP Autonomous System (AS)" value={branding.isp_as_number} onChange={(v: string) => setBranding({ ...branding, isp_as_number: v })} mono />
                <Field label="ISP Official Website" value={branding.isp_website} onChange={(v: string) => setBranding({ ...branding, isp_website: v })} mono />
                <Field label="ISP Support Email" value={branding.isp_email} onChange={(v: string) => setBranding({ ...branding, isp_email: v })} mono />
                <Field label="ISP Helpline / CS" value={branding.isp_helpline} onChange={(v: string) => setBranding({ ...branding, isp_helpline: v })} />
                <Field label="ISP Logo URL" value={branding.isp_logo} onChange={(v: string) => setBranding({ ...branding, isp_logo: v })} mono />
            </Section>

            <Section title="Contact & Support" sub="Informasi kontak yang muncul di footer / section hubungi kami" icon={<Headphones className="w-4 h-4" />}>
                <Field label="Contact Section Title" value={branding.contact_title} onChange={(v: string) => setBranding({ ...branding, contact_title: v })} />
                <Field label="Contact Section Subtitle" value={branding.contact_subtitle} onChange={(v: string) => setBranding({ ...branding, contact_subtitle: v })} textarea />
                <Field label="Footer Legal / Copyright" value={branding.footer_legal} onChange={(v: string) => setBranding({ ...branding, footer_legal: v })} />
            </Section>

            <Section title="Asset URLs" sub="Link logo instansi dan portal pengaduan" icon={<ImageIcon className="w-4 h-4" />}>
                <Field label="Komdigi Logo URL" value={branding.komdigi_logo} onChange={(v: string) => setBranding({ ...branding, komdigi_logo: v })} mono />
                <Field label="Cyber Drone 9 Logo" value={branding.cyber_drone9_logo} onChange={(v: string) => setBranding({ ...branding, cyber_drone9_logo: v })} mono />
                <Field label="Aduan Konten Logo" value={branding.aduan_konten_logo} onChange={(v: string) => setBranding({ ...branding, aduan_konten_logo: v })} mono />
                <Field label="Aduan Konten URL" value={branding.aduan_konten_url} onChange={(v: string) => setBranding({ ...branding, aduan_konten_url: v })} mono />
                <Field label="Cyber Drone 9 URL" value={branding.cyber_drone9_url} onChange={(v: string) => setBranding({ ...branding, cyber_drone9_url: v })} mono />
            </Section>

            <Section title="Visual Identity" sub="Kustomisasi warna utama dan aksen portal" icon={<Paintbrush className="w-4 h-4" />}>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Primary Identity Color</label>
                    <div className="flex gap-2">
                        <input type="color" value={branding.primary_color} onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })} className="w-10 h-10 border rounded bg-transparent cursor-pointer" style={{ borderColor: "var(--brand-border)" }} />
                        <input type="text" value={branding.primary_color} onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })} className="flex-1 px-3 py-2 text-sm border rounded bg-transparent font-mono" style={{ borderColor: "var(--brand-border)" }} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Accent Highlight Color</label>
                    <div className="flex gap-2">
                        <input type="color" value={branding.accent_color} onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })} className="w-10 h-10 border rounded bg-transparent cursor-pointer" style={{ borderColor: "var(--brand-border)" }} />
                        <input type="text" value={branding.accent_color} onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })} className="flex-1 px-3 py-2 text-sm border rounded bg-transparent font-mono" style={{ borderColor: "var(--brand-border)" }} />
                    </div>
                </div>
            </Section>

            <div className="flex justify-end pt-8">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-3 px-8 py-3 text-xs font-bold tracking-[0.2em] uppercase border transition-all shadow-xl shadow-brand-primary/10 disabled:opacity-50"
                    style={{ color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "rgba(239,68,68,0.06)" }}
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Processing..." : "Terapkan Perubahan Global"}
                </button>
            </div>
        </div>
    );
};
