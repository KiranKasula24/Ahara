import { BrandLogo } from "@/components/app-shell/BrandLogo";

export default function Loading() {
  return <main className="loading-page" aria-label="Loading"><BrandLogo variant="lockup" priority /><p>Loading Ahara…</p></main>;
}
