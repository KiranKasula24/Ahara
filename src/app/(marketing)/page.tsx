import Link from "next/link";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const features = [
  ["Indian-first logging", "Portions and meal names that fit everyday Indian food."],
  ["Evidence, not guesses", "Unknown nutrition stays unavailable, never silently shown as zero."],
  ["Private by default", "Your diary is protected by your own account and row-level security."],
];

export default function LandingPage() {
  return (
    <main className="marketing">
      <nav className="marketing-nav">
        <span className="brand"><span className="brand-mark">A</span>Ahara</span>
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
      <section className="feature-grid">
        {features.map(([title, detail], index) => (
          <article className="feature-card" key={title}>
            <span className="feature-number">0{index + 1}</span>
            <h2>{title}</h2>
            <p>{detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
