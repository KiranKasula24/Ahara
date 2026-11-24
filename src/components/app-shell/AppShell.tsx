"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, BarChart3, Heart, Home, Plus, Settings, Target } from "lucide-react";
import { BrandLogo } from "@/components/app-shell/BrandLogo";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const primary = [
  { href: "/today", label: "Today", icon: Home, match: ["/today", "/log"] },
  { href: "/insights", label: "Insights", icon: BarChart3, match: ["/insights"] },
  { href: "/add", label: "Add", icon: Plus, match: ["/add"] },
  { href: "/activity", label: "Activity", icon: Activity, match: ["/activity"] },
  { href: "/settings", label: "Profile", icon: Settings, match: ["/settings", "/goals", "/favourites", "/export", "/my-foods"] },
] as const;
const secondary = [
  { href: "/favourites", label: "Favourites", icon: Heart },
  { href: "/goals", label: "Goals", icon: Target },
] as const;

const matches = (pathname: string, prefixes: readonly string[]) => prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <header className="desktop-topbar">
      <Link className="brand" href="/today" aria-label="Ahara home"><BrandLogo /><span>Ahara</span></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {primary.map((item) => <Link key={item.href} href={item.href} className={matches(pathname, item.match) ? "nav-link active" : "nav-link"}><item.icon aria-hidden="true" size={16} />{item.label}</Link>)}
      </nav>
      <nav className="desktop-actions" aria-label="Secondary navigation">
        {secondary.map((item) => <Link key={item.href} href={item.href} className={matches(pathname, [item.href]) ? "nav-link active" : "nav-link"}><item.icon aria-hidden="true" size={16} />{item.label}</Link>)}
      </nav>
    </header>
    <div className="app-frame">
      <header className="mobile-topbar"><Link className="brand" href="/today" aria-label="Ahara home"><BrandLogo /><span className="mobile-brand-name">Ahara</span></Link><Link className="quick-add" href="/add" aria-label="Add food"><Plus aria-hidden="true" size={21} /></Link></header>
      <main className="page-main">{pathname === "/today" && <InstallPrompt variant="card" />}{children}</main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Primary navigation">
      {primary.map((item) => <Link key={item.href} href={item.href} className={`${matches(pathname, item.match) ? "mobile-nav-link active" : "mobile-nav-link"}${item.href === "/add" ? " add" : ""}`}><span aria-hidden="true"><item.icon size={item.href === "/add" ? 21 : 19} /></span><span>{item.label}</span></Link>)}
    </nav>
  </div>;
}
