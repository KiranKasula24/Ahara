"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const primary = [
  ["/today", "Today", "◉"], ["/log", "Log", "☷"], ["/add", "Add", "+"], ["/activity", "Activity", "↗"], ["/insights", "Insights", "⌁"],
] as const;
const secondary = [["/recipes", "Recipes"], ["/favourites", "Favourites"], ["/trackers", "Trackers"], ["/history", "History"], ["/goals", "Goals"]] as const;

function isActive(pathname: string, href: string) { return href === "/today" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`); }

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <aside className="desktop-sidebar" aria-label="Primary navigation">
      <Link className="brand" href="/today"><span className="brand-mark">A</span><span>Ahara</span></Link>
      <nav className="sidebar-nav">{primary.map(([href, label, icon]) => <Link key={href} href={href} className={isActive(pathname, href) ? "nav-link active" : "nav-link"}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav>
      <div className="sidebar-divider" />
      <nav className="sidebar-nav secondary">{secondary.map(([href, label]) => <Link key={href} href={href} className={isActive(pathname, href) ? "nav-link active" : "nav-link"}>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><Link href="/settings" className={isActive(pathname, "/settings") ? "nav-link active" : "nav-link"}>Settings</Link><Link href="/login" className="nav-link">Sign in</Link></div>
    </aside>
    <div className="app-frame"><header className="mobile-topbar"><Link className="brand" href="/today"><span className="brand-mark">A</span><span>Ahara</span></Link><Link href="/add" className="quick-add" aria-label="Add food">+</Link></header><main className="page-main">{children}</main></div>
    <nav className="mobile-bottom-nav" aria-label="Primary navigation">{primary.slice(0, 4).map(([href, label, icon]) => <Link key={href} href={href} className={isActive(pathname, href) ? "mobile-nav-link active" : "mobile-nav-link"}><span aria-hidden="true">{icon}</span><span>{label}</span></Link>)}<Link href="/settings" className={isActive(pathname, "/settings") ? "mobile-nav-link active" : "mobile-nav-link"}><span aria-hidden="true">◎</span><span>Profile</span></Link></nav>
  </div>;
}
