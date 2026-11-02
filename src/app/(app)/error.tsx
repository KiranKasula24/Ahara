"use client";
export default function AppError({ reset }: { error: Error; reset: () => void }) { return <section className="state-card"><h2>This page could not load</h2><p>Your saved data was not changed. Check your connection and try again.</p><button className="button primary" onClick={reset}>Try again</button></section>; }
