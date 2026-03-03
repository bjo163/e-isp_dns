const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

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

//  Blocked Domains (paginated) 
export const getDomains = (params?: { page?: number; limit?: number; search?: string; category?: string; active?: string }) => {
  const p = new URLSearchParams();
  if (params?.page) p.set("page", String(params.page));
  if (params?.limit) p.set("limit", String(params.limit));
  if (params?.search) p.set("search", params.search);
  if (params?.category) p.set("category", params.category);
  if (params?.active) p.set("active", params.active);
  return req<PaginatedResponse<BlockedDomain>>(`/api/domains?${p.toString()}`);
};
export const addDomain    = (d: NewDomain)                              => req<BlockedDomain>("/api/domains", { method: "POST", body: JSON.stringify(d) });
export const updateDomain = (id: number, d: Partial<BlockedDomain>)    => req<BlockedDomain>(`/api/domains/${id}`, { method: "PUT", body: JSON.stringify(d) });
export const deleteDomain = (id: number)                                => req<void>(`/api/domains/${id}`, { method: "DELETE" });
export const bulkDeleteDomains = (ids: number[]) => req<{ deleted: number }>("/api/domains/bulk", { method: "DELETE", body: JSON.stringify({ ids }) });

export const importDomains = (url: string, category: string, reason: string) =>
  req<ImportResult>("/api/domains/import", {
    method: "POST",
    body: JSON.stringify({ url, category, reason }),
  });

//  Categories 
export const getCategories   = ()                                 => req<Category[]>("/api/categories");
export const addCategory     = (c: Partial<Category>)             => req<Category>("/api/categories", { method: "POST", body: JSON.stringify(c) });
export const updateCategory  = (id: number, c: Partial<Category>) => req<Category>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(c) });
export const deleteCategory  = (id: number)                        => req<void>(`/api/categories/${id}`, { method: "DELETE" });

//  ACL Clients 
export const getClients       = ()                                    => req<ACLClient[]>("/api/clients");
export const getDetectedClients = ()                                  => req<DetectedClient[]>("/api/clients/detected");
export const addClient        = (c: Partial<ACLClient>)               => req<ACLClient>("/api/clients", { method: "POST", body: JSON.stringify(c) });
export const updateClient     = (id: number, c: Partial<ACLClient>)   => req<ACLClient>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(c) });
export const deleteClient     = (id: number)                           => req<void>(`/api/clients/${id}`, { method: "DELETE" });

//  Custom DNS Records (paginated) 
export const getRecords = (params?: { page?: number; limit?: number; search?: string; type?: string }) => {
  const p = new URLSearchParams();
  if (params?.page) p.set("page", String(params.page));
  if (params?.limit) p.set("limit", String(params.limit));
  if (params?.search) p.set("search", params.search);
  if (params?.type) p.set("type", params.type);
  return req<PaginatedResponse<CustomRecord>>(`/api/records?${p.toString()}`);
};
export const addRecord    = (r: Partial<CustomRecord>)              => req<CustomRecord>("/api/records", { method: "POST", body: JSON.stringify(r) });
export const updateRecord = (id: number, r: Partial<CustomRecord>) => req<CustomRecord>(`/api/records/${id}`, { method: "PUT", body: JSON.stringify(r) });
export const deleteRecord = (id: number)                            => req<void>(`/api/records/${id}`, { method: "DELETE" });

//  Blocklist Presets 
export const getPresets = () => req<BlocklistPreset[]>("/api/presets");

//  DNS Config 
export const getDNSConfig    = ()              => req<DNSConfig>("/api/config");
export const updateDNSConfig = (c: DNSConfig) => req<DNSConfig>("/api/config", { method: "PUT", body: JSON.stringify(c) });

//  Analytics 
export const getAnalyticsSummary = (period = "24h") =>
  req<AnalyticsSummary>(`/api/analytics/summary?period=${period}`);
export const getTopBlocked = (period = "24h", limit = 10) =>
  req<TopEntry[]>(`/api/analytics/top-blocked?period=${period}&limit=${limit}`);
export const getTopClients = (period = "24h", limit = 10) =>
  req<TopEntry[]>(`/api/analytics/top-clients?period=${period}&limit=${limit}`);
export const getHistory = (period = "24h", bucket = 3600) =>
  req<HistoryBucket[]>(`/api/analytics/history?period=${period}&bucket=${bucket}`);
export const getClientStats = (ip: string, period = "24h", limit = 10, bucket = 3600) =>
  req<ClientStat>(`/api/analytics/client-stats?ip=${encodeURIComponent(ip)}&period=${period}&limit=${limit}&bucket=${bucket}`);

//  Export 
export const exportDomainsURL = (format: "csv" | "json" | "hosts" | "domains" = "domains") => {
  const token = getToken();
  return `${BASE}/api/domains/export?format=${format}&token=${token ?? ""}`;
};

//  Blocklist Subscriptions 
export const getSubscriptions   = ()                                          => req<BlocklistSubscription[]>("/api/subscriptions");
export const addSubscription    = (s: Partial<BlocklistSubscription>)          => req<BlocklistSubscription>("/api/subscriptions", { method: "POST", body: JSON.stringify(s) });
export const updateSubscription = (id: number, s: Partial<BlocklistSubscription>) => req<BlocklistSubscription>(`/api/subscriptions/${id}`, { method: "PUT", body: JSON.stringify(s) });
export const deleteSubscription = (id: number)                                 => req<void>(`/api/subscriptions/${id}`, { method: "DELETE" });
export const runSubscription    = (id: number)                                 => req<{ message: string }>(`/api/subscriptions/${id}/run`, { method: "POST" });

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Branding {
  site_name: string;
  block_page_url: string;
  hero_title: string;
  hero_subtitle: string;
  warning_badge_text: string;
  blocked_url_placeholder: string;
  default_reason: string;
  notice_text: string;
  category_title: string;
  category_subtitle: string;
  appeal_title: string;
  appeal_subtitle: string;
  appeal_portal_label: string;
  appeal_process_days: number;
  contact_title: string;
  contact_subtitle: string;
  footer_legal: string;
  authority_name: string;
  authority_short_name: string;
  authority_logo: string;
  authority_address: string;
  authority_phone: string;
  authority_email: string;
  authority_website: string;
  trustpositif_url: string;
  isp_name: string;
  isp_short_name: string;
  isp_logo: string;
  isp_helpline: string;
  isp_email: string;
  isp_website: string;
  isp_as_number: string;
  primary_color: string;
  accent_color: string;
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

export interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  active: boolean;
  domain_count: number;
  created_at?: string;
}

export interface ACLClient {
  id: number;
  ip: string;
  name: string;
  action: string; // "allow" | "block"
  blocked_categories: string; // comma-separated, e.g. "Pornografi,Judi Online"
  notes: string;
  created_at?: string;
}

export interface DetectedClient {
  ip: string;
  query_count: number;
}

export interface CustomRecord {
  id: number;
  name: string;
  type: string; // A, AAAA, CNAME, MX, TXT, PTR, NS, SRV
  value: string;
  ttl: number;
  priority: number;
  active: boolean;
  notes: string;
  created_at?: string;
}

export interface BlocklistPreset {
  label: string;
  url: string;
  category: string;
  description: string;
  format: string;
}

export interface DNSConfig {
  listen_addr: string;
  upstream_dns: string;
  redirect_ip: string;
  http_port: string;
  intercept_port?: string;
  acl_default_allow: boolean;
}

export interface ImportResult {
  parsed: number;
  inserted: number;
  skipped: number;
}

export interface AnalyticsSummary {
  total_queries: number;
  blocked_count: number;
  unique_domains: number;
  unique_clients: number;
}

export interface TopEntry {
  name: string;
  count: number;
}

export interface HistoryBucket {
  ts: number;
  total: number;
  blocked: number;
}

export interface ClientStat {
  total_queries: number;
  blocked_count: number;
  forwarded_count: number;
  top_domains: TopEntry[];
  top_blocked: TopEntry[];
  history: HistoryBucket[];
}

export interface BlocklistSubscription {
  id: number;
  name: string;
  url: string;
  category: string;
  reason: string;
  interval_hours: number;
  enabled: boolean;
  last_run_at: string | null;
  last_count: number;
  last_error: string;
  created_at?: string;
}
