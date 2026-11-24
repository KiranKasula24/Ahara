import Link from "next/link";
import type { ComponentType } from "react";
import { Activity, Search, ShieldCheck } from "lucide-react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { BrandLogo } from "@/components/app-shell/BrandLogo";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const features: { title: string; detail: string; Icon: ComponentType<{ size?: number }> }[] = [
  { title: "Indian-first logging", detail: "Portions and meal names that fit everyday Indian food.", Icon: Search },
  { title: "Evidence, not guesses", detail: "Unknown nutrition stays unavailable, never silently shown as zero.", Icon: Activity },
  { title: "Private by default", detail: "Your diary is protected by your own account and row-level security.", Icon: ShieldCheck },
];

export default function LandingPage() {
  return (
    <main className="marketing">
      <nav className="marketing-nav">
        <span className="brand"><BrandLogo />Ahara</span>
        <Link className="button secondary" href="/login">Sign in</Link>
      </nav>
      <section className="hero">
        <p className="eyebrow">Personal nutrition, thoughtfully tracked</p>
        <h1>Understand what you eat.<br /><span>Build habits that last.</span></h1>
        <p>Ahara is a private, India-first food and activity journal built around real portions, honest uncertainty, and your own pace.</p>
        <InstallPrompt variant="hero" />
        <div className="hero-actions">
          <Link className="button primary" href="/login">Get started</Link>
        </div>
      </section>
      <BentoGrid className="feature-grid">
        {features.map(({ title, detail, Icon }, index) => (
          <BentoGridItem key={title} title={title} description={detail} icon={<Icon size={18} />} header={<span className="feature-number">0{index + 1}</span>} className="feature-card" />
        ))}
      </BentoGrid>
    </main>
  );
}
