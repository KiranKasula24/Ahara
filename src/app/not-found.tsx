import Link from "next/link";
export default function NotFound() { return <main className="loading-page"><p className="eyebrow">404</p><h1>This page does not exist</h1><p>Return to your dashboard or start from the Ahara home page.</p><Link className="button primary" href="/today">Go to Today</Link></main>; }
