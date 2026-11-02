import Link from "next/link";
export default function AuthErrorPage() { return <section className="auth-card"><p className="eyebrow">Authentication</p><h1>That sign-in link did not work</h1><p className="muted">It may have expired or already been used. Request a fresh link to try again.</p><Link className="button primary" href="/login">Back to sign in</Link></section>; }
