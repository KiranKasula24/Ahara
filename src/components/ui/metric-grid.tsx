import { Card, CardContent } from "@/components/ui/card";

export type Metric = { label: string; value: string | number; tone?: "brand" | "positive" | "negative" | "neutral" };
const tones = { brand: "var(--brand-text)", positive: "var(--positive)", negative: "var(--negative)", neutral: "var(--text-primary)" } as const;

/** A shared compact statistic grid for dashboards, reports, and tracker summaries. */
export function MetricGrid({ metrics, className = "" }: { metrics: Metric[]; className?: string }) {
  return <section className={`metric-grid ${className}`} aria-label="Summary metrics">{metrics.map((metric) => <Card key={metric.label} size="sm" className="metric-card"><CardContent><span>{metric.label}</span><strong style={{ color: tones[metric.tone ?? "neutral"] }}>{metric.value}</strong></CardContent></Card>)}</section>;
}
