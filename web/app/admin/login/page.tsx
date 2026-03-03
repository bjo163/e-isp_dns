"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, RefreshCw, AlertTriangle } from "lucide-react";
import { login, setToken, getToken } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // Already logged in  redirect
  useEffect(() => {
    if (getToken()) router.replace("/admin");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password);
      setToken(res.token);
      router.replace("/admin");
    } catch (err: unknown) {
      setError((err as Error).message.includes("401") ? "Username atau password salah" : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--brand-dark-bg)", color: "var(--foreground)", fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Top accent line */}
      <div className="fixed top-0 left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg,transparent,var(--brand-primary) 40%,var(--brand-accent) 60%,transparent)" }} />

      {/* Card */}
      <div className="w-full max-w-sm px-4">
        {/* Logo area */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded border flex items-center justify-center"
            style={{ borderColor: "var(--brand-primary)", background: "rgba(239,68,68,0.08)" }}>
            <Shield className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold tracking-[0.1em]">
              Trust<span style={{ color: "var(--brand-primary)" }}>Positif</span>
            </h1>
            <p className="text-[10px] tracking-[0.2em] uppercase mt-0.5" style={{ color: "var(--brand-muted)" }}>
              Admin Panel
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="border rounded p-6 space-y-5"
          style={{ borderColor: "var(--brand-border)", background: "var(--brand-card-bg)" }}
        >
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "var(--brand-muted)" }}>
            Masuk ke Dashboard
          </p>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border rounded bg-transparent outline-none focus:ring-1 transition"
              style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}
              placeholder="admin"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--brand-muted)" }}>
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border rounded bg-transparent outline-none focus:ring-1 transition"
              style={{ borderColor: "var(--brand-border)", color: "var(--foreground)" }}
              placeholder=""
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs px-3 py-2.5 rounded border" style={{ borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.06)", color: "var(--brand-primary)" }}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold tracking-widest uppercase border transition-all disabled:opacity-50"
            style={{ color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "rgba(239,68,68,0.06)" }}
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="text-center mt-4 text-[10px] font-mono" style={{ color: "var(--brand-border)" }}>
          SYS:LOGIN // TrustPositif v1.0
        </p>
      </div>
    </div>
  );
}
