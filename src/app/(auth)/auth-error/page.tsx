import Link from "next/link";
import { BrandLogo } from "@/components/app-shell/BrandLogo";
export default function AuthErrorPage() { return <section className="auth-card"><Link className="auth-logo" href="/" aria-label="Ahara home"><BrandLogo variant="lockup" /></Link><p className="eyebrow">Authentication</p><h1>That sign-in link did not work</h1><p className="muted">It may have expired or already been used. Request a fresh link or code to try again.</p><Link className="button primary" href="/login">Back to sign in</Link></section>; }
