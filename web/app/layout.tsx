import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import branding from "@/configs/branding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: branding.meta.siteTitle,
  description: branding.meta.siteDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { theme } = branding;

  // Inject branding CSS vars at root so @theme inline can reference them
  const cssVars = {
    "--brand-primary":  theme.primaryColor,
    "--brand-accent":   theme.accentColor,
    "--brand-dark-bg":  theme.darkBg,
    "--brand-card-bg":  theme.cardBg,
    "--brand-border":   theme.borderColor,
    "--brand-glow":     theme.glowColor,
    "--brand-muted":    theme.mutedColor,
  } as React.CSSProperties;

  return (
    <html lang="id" suppressHydrationWarning style={cssVars}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
