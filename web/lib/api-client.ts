const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

//  Token helpers (browser only) 
export const getToken  = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);
export const setToken  = (t: string) => localStorage.setItem("admin_token", t);
export const clearToken = () => localStorage.removeItem("admin_token");

//  Base fetch wrapper 
async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...headers, ...(opts?.headers ?? {}) },
    cache: "no-store",
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

//  Auth 
export const login = (username: string, password: string) =>
  req<{ token: string; username: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const changePassword = (current_password: string, new_password: string) =>
  req<{ message: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });

//  Branding 
export const getBranding    = ()             => req<Branding>("/api/branding");
export const updateBranding = (b: Branding) => req<Branding>("/api/branding", { method: "PUT", body: JSON.stringify(b) });

//  Blocked Domains 
export const getDomains   = ()                                          => req<BlockedDomain[]>("/api/domains");
export const addDomain    = (d: NewDomain)                              => req<BlockedDomain>("/api/domains", { method: "POST", body: JSON.stringify(d) });
export const updateDomain = (id: number, d: Partial<BlockedDomain>)    => req<BlockedDomain>(`/api/domains/${id}`, { method: "PUT", body: JSON.stringify(d) });
export const deleteDomain = (id: number)                                => req<void>(`/api/domains/${id}`, { method: "DELETE" });

export const importDomains = (url: string, category: string, reason: string) =>
  req<ImportResult>("/api/domains/import", {
    method: "POST",
    body: JSON.stringify({ url, category, reason }),
  });

//  DNS Config 
export const getDNSConfig    = ()              => req<DNSConfig>("/api/config");
export const updateDNSConfig = (c: DNSConfig) => req<DNSConfig>("/api/config", { method: "PUT", body: JSON.stringify(c) });

// 
// Types
// 

export interface Branding {
  // Umum
  site_name: string;
  block_page_url: string;

  // Hero / copy teks halaman block
  hero_title: string;
  hero_subtitle: string;
  warning_badge_text: string;
  blocked_url_placeholder: string;
  default_reason: string;
  notice_text: string;

  // Section  Kategori
  category_title: string;
  category_subtitle: string;

  // Section  Banding
  appeal_title: string;
  appeal_subtitle: string;
  appeal_portal_label: string;
  appeal_process_days: number;

  // Section  Kontak
  contact_title: string;
  contact_subtitle: string;

  // Footer
  footer_legal: string;

  // Regulator
  authority_name: string;
  authority_short_name: string;
  authority_logo: string;
  authority_address: string;
  authority_phone: string;
  authority_email: string;
  authority_website: string;
  trustpositif_url: string;

  // ISP
  isp_name: string;
  isp_short_name: string;
  isp_logo: string;
  isp_helpline: string;
  isp_email: string;
  isp_website: string;
  isp_as_number: string;

  // Tema
  primary_color: string;
  accent_color: string;

  // Aset logo resmi
  komdigi_logo: string;
  cyber_drone9_logo: string;
  aduan_konten_logo: string;
  aduan_konten_url: string;
  cyber_drone9_url: string;

  updated_at?: string;
}

export interface BlockedDomain {
  id: number;
  domain: string;
  reason: string;
  category: string;
  active: boolean;
  created_at: string;
}

export type NewDomain = Omit<BlockedDomain, "id" | "created_at">;

export interface DNSConfig {
  listen_addr: string;
  upstream_dns: string;
  redirect_ip: string;
  http_port: string;
}

export interface ImportResult {
  parsed: number;
  inserted: number;
  skipped: number;
}
