"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { shiftAnchor, type Insights, type RangeKind } from "@/lib/insights";
import { tagLabel } from "@/lib/tags";

const RANGES: [RangeKind, string][] = [["week", "Week"], ["month", "Month"], ["year", "Year"]];
const fmt = (value: number) => value.toLocaleString("en-IN");

export function InsightsExperience() {
  const [range, setRange] = useState<RangeKind>("week");
  const [anchor, setAnchor] = useState<string | null>(null); // null means today
  const [data, setData] = useState<{ insights: Insights; today: string; anchor: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    const query = `/api/insights?range=${range}${anchor ? `&anchor=${anchor}` : ""}`;
    apiFetch<{ insights: Insights; today: string; anchor: string }>(query, { signal: controller.signal })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError("Insights couldn’t be loaded. Please try again.");
      });
    return () => controller.abort();
  }, [range, anchor]);

  const insights = data?.insights;
  const atEnd = insights && data ? insights.end >= data.today : true;
  const max = insights ? Math.max(1, ...insights.buckets.map((bucket) => Math.max(bucket.kcal ?? 0, bucket.goal ?? 0))) : 1;
  const unit = range === "year" ? "average per logged day" : "per day";

  return (
    <>
      <div className="ax-chips" role="group" aria-label="Range">
        {RANGES.map(([value, label]) => (
          <button key={value} className={`ax-chip ${range === value ? "selected" : ""}`} aria-pressed={range === value} onClick={() => { setRange(value); setAnchor(null); }}>{label}</button>
        ))}
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}

      {!insights ? (
        !error && <div className="skeleton-stack"><div /><div /><div /></div>
      ) : (
        <>
          <div className="ax-daynav">
            <button className="button secondary" onClick={() => setAnchor(shiftAnchor(range, data?.anchor ?? insights.end, -1))} aria-label="Earlier">‹</button>
            <strong>{insights.label}</strong>
            <button className="button secondary" disabled={atEnd} onClick={() => setAnchor(shiftAnchor(range, data?.anchor ?? insights.end, 1))} aria-label="Later">›</button>
          </div>

          <section className="ax-section">
            <h2>Coverage</h2>
            <p>Logged {insights.loggedDays} of {insights.elapsedDays} day{insights.elapsedDays === 1 ? "" : "s"}.</p>
            {insights.average.kcal === null ? (
              <p className="muted">No calorie totals yet for this period.</p>
            ) : (
              <p>
                Average on logged days: <strong>{insights.average.partial ? "at least " : ""}{fmt(insights.average.kcal)} kcal</strong>
                {insights.average.partial && <span className="muted"> (some entries have unknown calories)</span>}
              </p>
            )}
            {insights.unknownEntries > 0 && <p className="muted">{insights.unknownEntries} entr{insights.unknownEntries === 1 ? "y has" : "ies have"} unknown calories and {insights.unknownEntries === 1 ? "is" : "are"} left out of totals.</p>}
          </section>

          <section className="ax-section">
            <h2>Calories ({unit})</h2>
            <div className="ax-bars" role="img" aria-label={`Bar chart of calories ${unit} for ${insights.label}`}>
              {insights.buckets.map((bucket) => (
                <div className="ax-barcol" key={bucket.key} title={bucket.kcal === null ? (bucket.logged ? "Calories unknown" : "Not logged") : `${bucket.partial ? "At least " : ""}${fmt(bucket.kcal)} kcal`}>
                  <div className="ax-bartrack">
                    {bucket.goal !== null && <i className="ax-goaltick" style={{ bottom: `${(bucket.goal / max) * 100}%` }} />}
                    {bucket.kcal !== null && <span className={`ax-barfill ${bucket.partial ? "partial" : ""}`} style={{ height: `${Math.max(2, (bucket.kcal / max) * 100)}%` }} />}
                  </div>
                  <small>{bucket.label}</small>
                </div>
              ))}
            </div>
            <p className="muted">Hatched bars are at least that much, because some entries have unknown calories. Empty means nothing logged.{insights.hasGoal ? " The dash marks your goal for that day." : ""}</p>
          </section>

          {insights.hasGoal && (
            <section className="ax-section">
              <h2>Against your goal</h2>
              <div className="ax-totals">
                <div className="tx-macro"><span>Below</span><strong>{insights.statusCounts.below}</strong></div>
                <div className="tx-macro"><span>Around</span><strong>{insights.statusCounts.at}</strong></div>
                <div className="tx-macro"><span>Above</span><strong>{insights.statusCounts.above}</strong></div>
                <div className="tx-macro"><span>Can’t tell</span><strong>{insights.statusCounts.uncertain}</strong></div>
              </div>
              <p className="muted">“Around” means within 25 kcal of the goal. “Can’t tell” is a day with unknown calories that could fall either side. Days with a goal that applied at the time are compared to that goal.</p>
            </section>
          )}

          {insights.meals.length > 0 && (
            <section className="ax-section">
              <h2>By meal</h2>
              {insights.meals.map((meal) => (
                <div className="ax-quick-row" key={meal.meal}>
                  <b style={{ textTransform: "capitalize" }}>{meal.meal}</b>
                  <span>{fmt(Math.round(meal.kcal))} kcal · {meal.entries} entr{meal.entries === 1 ? "y" : "ies"}</span>
                </div>
              ))}
            </section>
          )}

          {insights.tags.length > 0 && (
            <section className="ax-section">
              <h2>Tags</h2>
              {insights.tags.map((tag) => (
                <div className="ax-quick-row" key={tag.tag}>
                  <b>{tagLabel(tag.tag)}</b>
                  <span>{tag.entries} entr{tag.entries === 1 ? "y" : "ies"} · {fmt(Math.round(tag.kcal))} kcal</span>
                </div>
              ))}
            </section>
          )}

          {insights.topFoods.length > 0 && (
            <section className="ax-section">
              <h2>Most logged</h2>
              {insights.topFoods.map((food) => (
                <div className="ax-quick-row" key={food.name}>
                  <b>{food.name}</b>
                  <span>{food.count}× · {food.kcal === null ? "calories unknown" : `${fmt(food.kcal)} kcal`}</span>
                </div>
              ))}
            </section>
          )}

          {insights.loggedDays === 0 && <p className="muted">Nothing logged in this period yet.</p>}
        </>
      )}
    </>
  );
}
