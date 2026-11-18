"use client";

import Link from "next/link";
import { useSession } from "@/components/app-shell/SessionProvider";

export function SignInRequired({ detail = "Sign in to view and save your private Ahara data." }: { detail?: string }) {
  const session = useSession();
  // Signed-in users briefly reach here while a page loads its own data: show a skeleton, never a sign-in card.
  if (session) return <div className="skeleton-stack" aria-hidden="true"><div /><div /></div>;
  return (
    <section className="state-card">
      <p className="state-icon" aria-hidden="true">◎</p>
      <h2>Keep your data private</h2>
      <p>{detail}</p>
      <Link className="button primary" href="/login">Sign in with email</Link>
    </section>
  );
}

export function CapabilityState({ title, detail, href, action }: { title: string; detail: string; href?: string; action?: string }) {
  return (
    <section className="state-card">
      <p className="state-icon" aria-hidden="true">○</p>
      <h2>{title}</h2>
      <p>{detail}</p>
      {href && action && <Link className="button secondary" href={href}>{action}</Link>}
    </section>
  );
}
