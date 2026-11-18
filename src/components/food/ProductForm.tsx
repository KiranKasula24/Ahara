"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import type { ParsedProduct } from "@/lib/off";
import { buildProduct, type ProductFormValues } from "@/lib/product";
import type { FoodSummary } from "@/lib/units";

export type ProductPrefill = { barcode: string | null; source: "off" | "manual"; product?: ParsedProduct };

const text = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

function initial(prefill: ProductPrefill): ProductFormValues {
  const per = prefill.product?.per100g;
  return {
    barcode: prefill.barcode ?? "",
    name: prefill.product?.name ?? "",
    brand: prefill.product?.brand ?? "",
    source: prefill.source,
    basis: "per100g",
    servingName: "serving",
    servingGrams: text(prefill.product?.servingGrams),
    kcal: text(per?.kcal), protein: text(per?.proteinG), carbs: text(per?.carbsG), fat: text(per?.fatG),
    satFat: text(per?.satFatG), fibre: text(per?.fibreG), sugar: text(per?.sugarG), sodium: text(per?.sodiumMg),
    note: "",
  };
}

type Props = { prefill: ProductPrefill; onSaved: (food: FoodSummary) => void; onCancel: () => void };

export function ProductForm({ prefill, onSaved, onCancel }: Props) {
  const [values, setValues] = useState<ProductFormValues>(() => initial(prefill));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => setValues((old) => ({ ...old, [key]: value }));
  const per100 = values.basis === "per100g";
  const unit = per100 ? "per 100 g" : "per serving";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const built = buildProduct(values);
    if (!built.ok) return setError(built.error);
    setSaving(true);
    setError("");
    try {
      const data = await apiFetch<{ food: FoodSummary }>("/api/products", { method: "POST", json: built.value });
      onSaved(data.food);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The product couldn’t be saved.");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof ProductFormValues) => (
    <label key={key}>{label} ({unit})
      <input inputMode="decimal" value={values[key] as string} onChange={(event) => set(key, event.target.value as never)} />
    </label>
  );

  return (
    <form className="ax-stack" onSubmit={submit}>
      {prefill.source === "off" ? (
        <p className="muted">Found on Open Food Facts. These values come from volunteers, so check them against the pack before saving.</p>
      ) : (
        <p className="muted">Enter the values printed on the pack. Leave blank anything you can’t see; blank stays unknown, never zero.</p>
      )}
      {prefill.barcode && <p className="muted">Barcode {prefill.barcode}</p>}
      <label>Product name<input value={values.name} onChange={(event) => set("name", event.target.value)} maxLength={120} /></label>
      <label>Brand (optional)<input value={values.brand} onChange={(event) => set("brand", event.target.value)} maxLength={80} /></label>

      <div className="ax-chips" role="group" aria-label="What the label shows">
        <button type="button" className={`ax-chip ${per100 ? "selected" : ""}`} aria-pressed={per100} onClick={() => set("basis", "per100g")}>Values per 100 g</button>
        <button type="button" className={`ax-chip ${!per100 ? "selected" : ""}`} aria-pressed={!per100} onClick={() => set("basis", "perServing")}>Values per serving</button>
      </div>
      {!per100 && <label>One serving is called<input value={values.servingName} onChange={(event) => set("servingName", event.target.value)} maxLength={40} placeholder="serving, biscuit, packet…" /></label>}
      <label>One serving weighs (g){per100 ? ", if the pack says" : ", to also log by grams"}
        <input inputMode="decimal" value={values.servingGrams} onChange={(event) => set("servingGrams", event.target.value)} />
      </label>

      {field("Calories (required)", "kcal")}
      {field("Protein (g)", "protein")}
      {field("Carbs (g)", "carbs")}
      {field("Fat (g)", "fat")}
      {field("Saturated fat (g)", "satFat")}
      {field("Fibre (g)", "fibre")}
      {field("Sugar (g)", "sugar")}
      {field("Sodium (mg)", "sodium")}
      <label>Note (optional)<input value={values.note} onChange={(event) => set("note", event.target.value)} maxLength={500} /></label>

      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="install-actions">
        <button className="button primary" disabled={saving}>{saving ? "Saving…" : "Save and choose amount"}</button>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
