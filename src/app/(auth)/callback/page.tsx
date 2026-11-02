import Link from "next/link";
export default function CallbackPage() { return <section className="auth-card"><p className="eyebrow">Authentication</p><h1>Completing sign-in</h1><p className="muted">If you are not redirected automatically, open your dashboard.</p><Link className="button primary" href="/today">Open dashboard</Link></section>; }
