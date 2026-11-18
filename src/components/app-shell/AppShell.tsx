"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const primary = [
  { href: "/today", label: "Today", icon: "◉", match: ["/today", "/log"] },
  { href: "/insights", label: "Insights", icon: "⌁", match: ["/insights"] },
  { href: "/add", label: "Add", icon: "+", match: ["/add"] },
  { href: "/activity", label: "Activity", icon: "↗", match: ["/activity"] },
  { href: "/settings", label: "Profile", icon: "◎", match: ["/settings", "/goals", "/favourites", "/export", "/my-foods"] },
] as const;
const secondary = [
  { href: "/favourites", label: "Favourites" },
  { href: "/goals", label: "Goals" },
] as const;

const matches = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar" aria-label="Primary navigation">
        <Link className="brand" href="/today"><span className="brand-mark">A</span><span>Ahara</span></Link>
        <nav className="sidebar-nav">
          {primary.map((item) => (
            <Link key={item.href} href={item.href} className={matches(pathname, item.match) ? "nav-link active" : "nav-link"}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <nav className="sidebar-nav secondary">
          {secondary.map((item) => (
            <Link key={item.href} href={item.href} className={matches(pathname, [item.href]) ? "nav-link active" : "nav-link"}>{item.label}</Link>
          ))}
        </nav>
      </aside>
      <div className="app-frame">
        <header className="mobile-topbar">
          <Link className="brand" href="/today"><span className="brand-mark">A</span><span>Ahara</span></Link>
        </header>
        <main className="page-main">
          {pathname === "/today" && <InstallPrompt variant="card" />}
          {children}
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {primary.map((item) => (
          <Link key={item.href} href={item.href} className={matches(pathname, item.match) ? "mobile-nav-link active" : "mobile-nav-link"}>
            <span aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
