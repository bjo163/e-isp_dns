import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — TrustPositif DNS",
  description: "Admin dashboard untuk konfigurasi TrustPositif DNS Server",
  robots: "noindex,nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
