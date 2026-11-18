"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { buildOwnFood, type OwnFoodFormValues } from "@/lib/own-food";
import { servingNameFor, type FoodSummary } from "@/lib/units";

export type OwnFoodRecord = FoodSummary & { user_note?: string | null };

const SERVING_SUGGESTIONS = {
  count: ["piece", "idli", "dosa", "roti", "vada", "laddu"],
  household: ["portion", "bowl", "katori", "cup", "plate", "glass", "spoon"],
} as const;

const text = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

function initialValues(food: OwnFoodRecord | undefined, name: string): OwnFoodFormValues {
  const row = food?.food_nutrients?.find((item) => item.basis === "per_serving");
  return {
    name: food?.canonical_name ?? name,
    unitKind: food?.serving_mode === "count" ? "count" : "household",
    servingName: food ? servingNameFor(food) : "portion",
    mode: "portion",
    servingsMade: "",
    kcal: text(row?.kcal),
    protein: text(row?.protein_g),
    carbs: text(row?.carbs_g),
    fat: text(row?.fat_g),
    sugar: text(row?.total_sugars_g),
    sodium: text(row?.sodium_mg),
    note: food?.user_note ?? "",
  };
}

type Props = { food?: OwnFoodRecord; initialName?: string; onSaved: (food: OwnFoodRecord) => void; onCancel?: () => void };

export function OwnFoodForm({ food, initialName = "", onSaved, onCancel }: Props) {
  const [values, setValues] = useState<OwnFoodFormValues>(() => initialValues(food, initialName));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof OwnFoodFormValues>(key: K, value: OwnFoodFormValues[K]) => setValues((old) => ({ ...old, [key]: value }));
  const batch = values.mode === "batch";
  const suffix = batch ? " (whole batch)" : " (per portion)";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const built = buildOwnFood(values);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await apiFetch<{ food: OwnFoodRecord }>("/api/foods", { method: food ? "PATCH" : "POST", json: food ? { id: food.id, ...built.value } : built.value });
      onSaved(data.food);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your food couldn’t be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <label>Food name
        <input value={values.name} onChange={(event) => set("name", event.target.value)} maxLength={120} />
      </label>

      <div>
        <p className="muted">How do you count it?</p>
        <div className="ax-chips" role="group" aria-label="How you count it">
          <button type="button" className={`ax-chip ${values.unitKind === "count" ? "selected" : ""}`} aria-pressed={values.unitKind === "count"} onClick={() => { set("unitKind", "count"); set("servingName", "piece"); }}>By number (idli, dosa)</button>
          <button type="button" className={`ax-chip ${values.unitKind === "household" ? "selected" : ""}`} aria-pressed={values.unitKind === "household"} onClick={() => { set("unitKind", "household"); set("servingName", "portion"); }}>By portion (curry, rice)</button>
        </div>
      </div>

      <label>One portion is called
        <input list="own-serving-names" value={values.servingName} onChange={(event) => set("servingName", event.target.value)} maxLength={40} />
        <datalist id="own-serving-names">{SERVING_SUGGESTIONS[values.unitKind].map((name) => <option key={name} value={name} />)}</datalist>
      </label>

      <div className="ax-chips" role="group" aria-label="What you know">
        <button type="button" className={`ax-chip ${!batch ? "selected" : ""}`} aria-pressed={!batch} onClick={() => set("mode", "portion")}>I know one portion</button>
        <button type="button" className={`ax-chip ${batch ? "selected" : ""}`} aria-pressed={batch} onClick={() => set("mode", "batch")}>I know the whole batch</button>
      </div>
      {batch && (
        <label>Servings the batch makes
          <input inputMode="decimal" value={values.servingsMade} onChange={(event) => set("servingsMade", event.target.value)} placeholder="For example, 8" />
        </label>
      )}

      <label>Calories{suffix} (required)
        <input inputMode="decimal" value={values.kcal} onChange={(event) => set("kcal", event.target.value)} />
      </label>
      <p className="muted">Everything below is optional. Leave a field blank if you don’t know it; blank stays unknown, never zero.</p>
      <label>Protein (g){suffix}<input inputMode="decimal" value={values.protein} onChange={(event) => set("protein", event.target.value)} /></label>
      <label>Carbs (g){suffix}<input inputMode="decimal" value={values.carbs} onChange={(event) => set("carbs", event.target.value)} /></label>
      <label>Fat (g){suffix}<input inputMode="decimal" value={values.fat} onChange={(event) => set("fat", event.target.value)} /></label>
      <label>Sugar (g){suffix}<input inputMode="decimal" value={values.sugar} onChange={(event) => set("sugar", event.target.value)} /></label>
      <label>Sodium (mg){suffix}<input inputMode="decimal" value={values.sodium} onChange={(event) => set("sodium", event.target.value)} /></label>
      <label>Where the numbers came from (optional)
        <input value={values.note} onChange={(event) => set("note", event.target.value)} maxLength={500} placeholder="For example, packet label or my own calculation" />
      </label>

      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="install-actions">
        <button className="button primary" disabled={saving}>{saving ? "Saving…" : food ? "Save changes" : "Save and choose amount"}</button>
        {onCancel && <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
