"use client";

import { useEffect, useRef, useState } from "react";
import {
  ADJUSTABLE, badgeFor, completenessNotes, describeChange, fillUnknownFromForm, manualFromForm, measuredFromFood, rowToAdjustment,
  type AdjustmentRow,
} from "@/lib/adjustments";
import { apiFetch } from "@/lib/api";
import type { Adjustment, NutrientKey, Nutrients } from "@/lib/nutrition";
import { supabase } from "@/lib/supabase";
import { rowToNutrients, type FoodSummary } from "@/lib/units";

type Mode = "list" | "ingredient" | "manual" | "fill";
type Loaded = { foodId: string | null; name: string; unit: string; base: Nutrients; totals: Nutrients; completeness: unknown };
type Props = { logId: string; startMode?: Mode; onClose: (changed: boolean) => void };

const fmt = (value: number | null) => (value === null ? "—" : String(Math.round(value * 10) / 10));

export function AdjustSheet({ logId, startMode = "list", onClose }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [mode, setMode] = useState<Mode>(startMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const changed = useRef(false);

  // ingredient mode
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSummary[]>([]);
  const [ingredient, setIngredient] = useState<FoodSummary | null>(null);
  const [grams, setGrams] = useState("10");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [perUnit, setPerUnit] = useState(false);
  // manual and fill modes
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<Partial<Record<NutrientKey, string>>>({});
  const [versionName, setVersionName] = useState("");

  useEffect(() => {
    const db = supabase();
    void (async () => {
      const [logResult, nutrientResult, rowResult] = await Promise.all([
        db.from("food_logs").select("food_id,name_snapshot,unit").eq("id", logId).single(),
        db.from("food_log_nutrients").select("base_snapshot,final_totals,completeness").eq("log_id", logId).single(),
        db.from("food_log_adjustments").select("kind,accuracy_class,label,nutrient_changes,assumption,basis,scales_with_quantity").eq("log_id", logId).order("position"),
      ]);
      if (logResult.error || nutrientResult.error || !logResult.data || !nutrientResult.data) {
        setError("This entry couldn’t be loaded.");
        return;
      }
      setLoaded({
        foodId: logResult.data.food_id as string | null,
        name: logResult.data.name_snapshot as string,
        unit: logResult.data.unit as string,
        base: nutrientResult.data.base_snapshot as Nutrients,
        totals: nutrientResult.data.final_totals as Nutrients,
        completeness: nutrientResult.data.completeness,
      });
      setAdjustments(((rowResult.data ?? []) as AdjustmentRow[]).map(rowToAdjustment));
    })();
  }, [logId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (mode !== "ingredient" || trimmed.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      apiFetch<{ foods: FoodSummary[] }>(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((data) => setResults(data.foods.filter((food) => food.serving_mode !== "count" && food.food_nutrients?.some((row) => row.basis === "per_100g"))))
        .catch(() => {});
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, mode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose(changed.current);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function openMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    setLabel("");
    setValues({});
  }

  async function persist(next: Adjustment[]) {
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<{ totals: Nutrients; completeness: unknown }>("/api/logs/adjustments", { method: "POST", json: { logId, adjustments: next } });
      setAdjustments(next);
      setLoaded((old) => (old ? { ...old, totals: result.totals, completeness: result.completeness } : old));
      changed.current = true;
      setIngredient(null);
      setQuery("");
      setMode("list");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That change couldn’t be saved.");
    } finally {
      setBusy(false);
    }
  }

  function addIngredient() {
    const row = ingredient?.food_nutrients?.find((item) => item.basis === "per_100g");
    if (!ingredient || !row) return;
    const built = measuredFromFood({ name: ingredient.canonical_name, per100g: rowToNutrients(row), grams: Number(grams.replace(",", ".")), direction, perUnit });
    if (typeof built === "string") return setError(built);
    void persist([...adjustments, built.adjustment]);
  }
  function addManual() {
    const built = manualFromForm({ label, direction, values, perUnit });
    if (typeof built === "string") return setError(built);
    void persist([...adjustments, built]);
  }
  function addFill() {
    const built = fillUnknownFromForm(values);
    if (typeof built === "string") return setError(built);
    void persist([...adjustments, built]);
  }
  async function saveVersion() {
    if (!loaded?.foodId) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/versions", { method: "POST", json: { baseFoodId: loaded.foodId, name: versionName, adjustments } });
      setMessage(`Saved as “${versionName.trim()}”. Search for it when you add food.`);
      setVersionName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That version couldn’t be saved.");
    } finally {
      setBusy(false);
    }
  }

  const unknownKeys = loaded ? ADJUSTABLE.filter(({ key }) => loaded.base[key] === null) : [];
  const ingredientRow = ingredient?.food_nutrients?.find((item) => item.basis === "per_100g");
  const preview = ingredient && ingredientRow ? measuredFromFood({ name: ingredient.canonical_name, per100g: rowToNutrients(ingredientRow), grams: Number(grams.replace(",", ".")), direction, perUnit }) : null;
  const eachAllowed = loaded ? loaded.unit !== "g" : false;
  const valueFields = (keys: { key: NutrientKey; label: string; unit: string }[]) =>
    keys.map(({ key, label: name, unit }) => (
      <label key={key}>{name} ({unit})
        <input inputMode="decimal" value={values[key] ?? ""} onChange={(event) => setValues((old) => ({ ...old, [key]: event.target.value }))} />
      </label>
    ));
  const directionChips = (
    <div className="ax-chips" role="group" aria-label="Add or remove">
      <button className={`ax-chip ${direction === 1 ? "selected" : ""}`} aria-pressed={direction === 1} onClick={() => setDirection(1)}>Added</button>
      <button className={`ax-chip ${direction === -1 ? "selected" : ""}`} aria-pressed={direction === -1} onClick={() => setDirection(-1)}>Left out</button>
    </div>
  );
  const perUnitToggle = eachAllowed && (
    <label className="ax-check"><input type="checkbox" checked={perUnit} onChange={(event) => setPerUnit(event.target.checked)} /> Applies to each {loaded?.unit}, not just once</label>
  );

  return (
    <div className="ax-sheet-backdrop ax-top" onClick={() => onClose(changed.current)}>
      <div className="ax-sheet" role="dialog" aria-modal="true" aria-label="Adjust this entry" onClick={(event) => event.stopPropagation()}>
        <div className="ax-sheet-head">
          <h2>Adjust {loaded?.name ?? "entry"}</h2>
          <button onClick={() => onClose(changed.current)} aria-label="Close">×</button>
        </div>

        {!loaded ? (
          error ? <p className="inline-error" role="alert">{error}</p> : <div className="skeleton-stack"><div /><div /></div>
        ) : mode === "list" ? (
          <>
            <div className="ax-totals">
              <div className="tx-macro"><span>Published values</span><strong>{fmt(loaded.base.kcal)} kcal</strong></div>
              <div className="tx-macro"><span>With your changes</span><strong>{fmt(loaded.totals.kcal)} kcal</strong></div>
            </div>
            {completenessNotes(loaded.completeness).map((note) => <p className="ax-note" key={note}>{note}</p>)}
            {adjustments.length === 0 ? (
              <p className="muted">No changes yet. The published values are used as they are.</p>
            ) : (
              adjustments.map((adjustment, index) => {
                const badge = badgeFor(adjustment);
                return (
                  <div className="ax-adj-row" key={`${adjustment.label}-${index}`}>
                    <span><span className={`ax-badge ${badge.text.toLowerCase()}`}><span aria-hidden="true">{badge.icon}</span> {badge.text}</span> <b>{adjustment.label}</b></span>
                    <small>{describeChange(adjustment.changes)}{adjustment.basis === "per_unit" ? ` per ${loaded.unit}` : ""}</small>
                    {adjustment.assumption && <small>{adjustment.assumption}</small>}
                    <button className="text-link" disabled={busy} onClick={() => void persist(adjustments.filter((_, position) => position !== index))}>Remove</button>
                  </div>
                );
              })
            )}
            <div className="ax-stack">
              <button className="button secondary" onClick={() => openMode("ingredient")}>Add or leave out an ingredient</button>
              <button className="button secondary" onClick={() => openMode("manual")}>Enter my own change</button>
              {unknownKeys.length > 0 && <button className="button secondary" onClick={() => openMode("fill")}>Fill in unknown values</button>}
            </div>
            {adjustments.length > 0 && loaded.foodId && (
              <div className="ax-stack">
                <label>Save these changes as My Version
                  <input value={versionName} onChange={(event) => setVersionName(event.target.value)} maxLength={120} placeholder="For example, Poha with extra ghee" />
                </label>
                <button className="button secondary" disabled={busy || !versionName.trim()} onClick={() => void saveVersion()}>Save My Version</button>
              </div>
            )}
          </>
        ) : mode === "ingredient" ? (
          <>
            <button className="text-link" onClick={() => openMode("list")}>← Back</button>
            {!ingredient ? (
              <>
                <label>Search for an ingredient
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ghee, oil, sugar, curd…" autoComplete="off" />
                </label>
                <div className="search-results">
                  {results.map((food) => (
                    <button className="search-result" key={food.id} onClick={() => setIngredient(food)}>
                      <span><b>{food.canonical_name}</b></span><span aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
                {query.trim().length >= 2 && results.length === 0 && <p className="muted">Nothing with per-100 g data matches. You can enter your own change instead.</p>}
              </>
            ) : (
              <>
                <h3>{ingredient.canonical_name}</h3>
                {directionChips}
                <label>Amount (g)<input inputMode="decimal" value={grams} onChange={(event) => setGrams(event.target.value)} /></label>
                {perUnitToggle}
                {preview && typeof preview !== "string" ? (
                  <>
                    <p><span className="ax-badge measured"><span aria-hidden="true">⚖</span> Measured</span> {describeChange(preview.adjustment.changes)}</p>
                    {preview.missing.length > 0 && <p className="ax-note">No data for {preview.missing.join(", ")}; those totals are not adjusted.</p>}
                  </>
                ) : (
                  typeof preview === "string" && <p className="muted">{preview}</p>
                )}
                <div className="install-actions">
                  <button className="button primary" disabled={busy} onClick={addIngredient}>{busy ? "Saving…" : "Add to this entry"}</button>
                  <button className="button secondary" onClick={() => setIngredient(null)}>Choose another</button>
                </div>
              </>
            )}
          </>
        ) : mode === "manual" ? (
          <>
            <button className="text-link" onClick={() => openMode("list")}>← Back</button>
            <p className="muted">Use this when you know roughly what changed. It is labelled Manual, so it is never mistaken for a measured value.</p>
            <label>What changed?<input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} placeholder="For example, extra ghee on top" /></label>
            {directionChips}
            {valueFields(ADJUSTABLE)}
            {perUnitToggle}
            <button className="button primary" disabled={busy} onClick={addManual}>{busy ? "Saving…" : "Add to this entry"}</button>
          </>
        ) : (
          <>
            <button className="text-link" onClick={() => openMode("list")}>← Back</button>
            <p className="muted">These values are unknown for this food. Fill in only what you know. Values that are already known are never overwritten.</p>
            {valueFields(unknownKeys)}
            <button className="button primary" disabled={busy} onClick={addFill}>{busy ? "Saving…" : "Save my values"}</button>
          </>
        )}

        {message && <p className="success-note" role="status">{message}</p>}
        {error && loaded && <p className="inline-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
