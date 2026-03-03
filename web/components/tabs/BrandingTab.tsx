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

    const Field = ({ label, value, onChange, placeholder = "", mono = false, type = "text" }: any) => (
        <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">{label}</label>
            <input
                type={type}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full px-3 py-2 text-sm border rounded bg-transparent outline-none focus:ring-1 transition ${mono ? "font-mono" : ""}`}
                style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}
            />
        </div>
    );

    const Section = ({ title, icon, children }: any) => (
        <div className="border rounded p-5 space-y-4" style={{ borderColor: "var(--brand-border)" }}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-brand-primary">{icon}</span>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">{title}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children}
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl space-y-6 pb-20">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold tracking-tight">Branding & ISP Configuration</h2>
                    <p className="text-xs mt-1 text-muted-foreground">Kustomisasi tampilan block page dan informasi instansi</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-all disabled:opacity-50"
                    style={{ color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "rgba(239,68,68,0.06)" }}
                >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
            </div>

            <Section title="General Site Info" icon={<Globe className="w-3.5 h-3.5" />}>
                <Field label="Site Name" value={branding.site_name} onChange={(v: string) => setBranding({ ...branding, site_name: v })} />
                <Field label="Block Page URL" value={branding.block_page_url} onChange={(v: string) => setBranding({ ...branding, block_page_url: v })} mono />
            </Section>

            <Section title="Block Page Hero" icon={<Paintbrush className="w-3.5 h-3.5" />}>
                <Field label="Hero Title" value={branding.hero_title} onChange={(v: string) => setBranding({ ...branding, hero_title: v })} />
                <Field label="Hero Subtitle" value={branding.hero_subtitle} onChange={(v: string) => setBranding({ ...branding, hero_subtitle: v })} />
                <Field label="Warning Badge" value={branding.warning_badge_text} onChange={(v: string) => setBranding({ ...branding, warning_badge_text: v })} />
                <Field label="URL Placeholder" value={branding.blocked_url_placeholder} onChange={(v: string) => setBranding({ ...branding, blocked_url_placeholder: v })} />
                <Field label="Default Reason" value={branding.default_reason} onChange={(v: string) => setBranding({ ...branding, default_reason: v })} />
                <Field label="Notice Text" value={branding.notice_text} onChange={(v: string) => setBranding({ ...branding, notice_text: v })} />
            </Section>

            <Section title="Categories & Appeals" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                <Field label="Category Title" value={branding.category_title} onChange={(v: string) => setBranding({ ...branding, category_title: v })} />
                <Field label="Appeal Title" value={branding.appeal_title} onChange={(v: string) => setBranding({ ...branding, appeal_title: v })} />
                <Field label="Appeal Portal Label" value={branding.appeal_portal_label} onChange={(v: string) => setBranding({ ...branding, appeal_portal_label: v })} />
                <Field label="Process Days" value={branding.appeal_process_days} type="number" onChange={(v: string) => setBranding({ ...branding, appeal_process_days: parseInt(v) || 0 })} />
            </Section>

            <Section title="Authority / Regulator" icon={<Info className="w-3.5 h-3.5" />}>
                <Field label="Authority Name" value={branding.authority_name} onChange={(v: string) => setBranding({ ...branding, authority_name: v })} />
                <Field label="Short Name" value={branding.authority_short_name} onChange={(v: string) => setBranding({ ...branding, authority_short_name: v })} />
                <Field label="Logo URL" value={branding.authority_logo} onChange={(v: string) => setBranding({ ...branding, authority_logo: v })} mono />
                <Field label="Website" value={branding.authority_website} onChange={(v: string) => setBranding({ ...branding, authority_website: v })} mono />
                <Field label="Email" value={branding.authority_email} onChange={(v: string) => setBranding({ ...branding, authority_email: v })} mono />
                <Field label="Phone" value={branding.authority_phone} onChange={(v: string) => setBranding({ ...branding, authority_phone: v })} />
            </Section>

            <Section title="ISP Configuration" icon={<Headphones className="w-3.5 h-3.5" />}>
                <Field label="ISP Name" value={branding.isp_name} onChange={(v: string) => setBranding({ ...branding, isp_name: v })} />
                <Field label="ISP AS Number" value={branding.isp_as_number} onChange={(v: string) => setBranding({ ...branding, isp_as_number: v })} />
                <Field label="ISP Website" value={branding.isp_website} onChange={(v: string) => setBranding({ ...branding, isp_website: v })} mono />
                <Field label="ISP Helpline" value={branding.isp_helpline} onChange={(v: string) => setBranding({ ...branding, isp_helpline: v })} />
                <Field label="ISP Logo URL" value={branding.isp_logo} onChange={(v: string) => setBranding({ ...branding, isp_logo: v })} mono />
            </Section>

            <Section title="Theme & Colors" icon={<Paintbrush className="w-3.5 h-3.5" />}>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Primary Color</label>
                    <div className="flex gap-2">
                        <input type="color" value={branding.primary_color} onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })} className="w-10 h-10 border rounded bg-transparent" />
                        <input type="text" value={branding.primary_color} onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })} className="flex-1 px-3 py-2 text-sm border rounded bg-transparent font-mono" style={{ borderColor: "var(--brand-border)" }} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Accent Color</label>
                    <div className="flex gap-2">
                        <input type="color" value={branding.accent_color} onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })} className="w-10 h-10 border rounded bg-transparent" />
                        <input type="text" value={branding.accent_color} onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })} className="flex-1 px-3 py-2 text-sm border rounded bg-transparent font-mono" style={{ borderColor: "var(--brand-border)" }} />
                    </div>
                </div>
            </Section>

            <Section title="Logos & Links" icon={<ImageIcon className="w-3.5 h-3.5" />}>
                <Field label="Komdigi Logo" value={branding.komdigi_logo} onChange={(v: string) => setBranding({ ...branding, komdigi_logo: v })} mono />
                <Field label="Cyber Drone 9 Logo" value={branding.cyber_drone9_logo} onChange={(v: string) => setBranding({ ...branding, cyber_drone9_logo: v })} mono />
                <Field label="Aduan Konten Logo" value={branding.aduan_konten_logo} onChange={(v: string) => setBranding({ ...branding, aduan_konten_logo: v })} mono />
                <Field label="Aduan Konten URL" value={branding.aduan_konten_url} onChange={(v: string) => setBranding({ ...branding, aduan_konten_url: v })} mono />
            </Section>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold tracking-widest uppercase border transition-all disabled:opacity-50"
                    style={{ color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "rgba(239,68,68,0.06)" }}
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Menyimpan..." : "Simpan Semua Pengaturan"}
                </button>
            </div>
        </div>
    );
};
