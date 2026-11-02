"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) { return <main className="loading-page"><h1>Something did not load</h1><p>Your data was not changed. Please try again.</p><button className="button primary" onClick={reset}>Try again</button></main>; }
