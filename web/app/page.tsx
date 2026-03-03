import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HeroSection } from "@/components/sections/HeroSection";
import { CategoriesSection } from "@/components/sections/CategoriesSection";
import { AppealSection } from "@/components/sections/AppealSection";
import { ContactSection } from "@/components/sections/ContactSection";

interface Props {
  searchParams: Promise<{ domain?: string; reason?: string; cat?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const { domain, reason, cat } = await searchParams;
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection blockedDomain={domain} reason={reason} category={cat} />
        <CategoriesSection />
        <AppealSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
