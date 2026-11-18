import type { Adjustment, AdjustmentKind, NutrientKey, Nutrients } from "@/lib/nutrition";

export const ADJUSTABLE: { key: NutrientKey; label: string; unit: string; max: number }[] = [
  { key: "kcal", label: "Calories", unit: "kcal", max: 5000 },
  { key: "proteinG", label: "Protein", unit: "g", max: 1000 },
  { key: "carbsG", label: "Carbs", unit: "g", max: 1000 },
  { key: "fatG", label: "Fat", unit: "g", max: 1000 },
  { key: "totalSugarsG", label: "Sugar", unit: "g", max: 1000 },
  { key: "sodiumMg", label: "Sodium", unit: "mg", max: 20000 },
];
export const MAX_ADJUSTMENTS = 12;
const KINDS: AdjustmentKind[] = ["measured_ingredient", "estimate_preset", "percent_of_base", "manual_delta", "set_unknown_value"];
const CLASSES = ["measured", "estimate", "manual"];
const round2 = (value: number) => Math.round(value * 100) / 100;
export const labelOf = (key: string) => ADJUSTABLE.find((item) => item.key === key)?.label ?? key;

export function badgeFor(adjustment: Adjustment): { text: "Measured" | "Estimate" | "Manual"; icon: string } {
  if (adjustment.accuracyClass === "measured") return { text: "Measured", icon: "⚖" };
  if (adjustment.accuracyClass === "estimate") return { text: "Estimate", icon: "≈" };
  return { text: "Manual", icon: "✎" };
}

/** "+40 kcal, +4.5 g fat" */
export function describeChange(changes: Partial<Record<NutrientKey, number>>): string {
  const parts = ADJUSTABLE.flatMap(({ key, label, unit }) => {
    const value = changes[key];
    if (value === undefined) return [];
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    const amount = Math.abs(round2(value));
    return [unit === "kcal" ? `${sign}${amount} kcal` : `${sign}${amount} ${unit} ${label.toLowerCase()}`];
  });
  return parts.join(", ") || "No change";
}

export function completenessNotes(completeness: unknown): string[] {
  if (!completeness || typeof completeness !== "object") return [];
  const notes: string[] = [];
  for (const [key, value] of Object.entries(completeness as Record<string, unknown>)) {
    const flag = value as { notFullyAdjusted?: boolean; direction?: string } | null;
    if (flag && typeof flag === "object" && flag.notFullyAdjusted) {
      notes.push(`${labelOf(key)} ${flag.direction === "at_most" ? "may be lower" : "may be higher"} than shown: its starting value is unknown.`);
    }
  }
  return notes;
}

/** Calculates an ingredient's effect from its published per-100 g values. Unknown values are left out and listed. */
export function measuredFromFood(args: { name: string; per100g: Nutrients; grams: number; direction: 1 | -1; perUnit: boolean }): { adjustment: Adjustment; missing: string[] } | string {
  if (!Number.isFinite(args.grams) || args.grams <= 0 || args.grams > 2000) return "Enter an amount above 0 and up to 2000 g.";
  const changes: Partial<Record<NutrientKey, number>> = {};
  const missing: string[] = [];
  for (const { key, label } of ADJUSTABLE) {
    const value = args.per100g[key];
    if (value === null) missing.push(label.toLowerCase());
    else changes[key] = round2((args.direction * value * args.grams) / 100);
  }
  if (Object.keys(changes).length === 0) return "This food has no nutrition data to calculate from.";
  const assumption =
    `Calculated from the published per-100 g values for ${args.name}.` +
    (missing.length ? ` No data for ${missing.join(", ")}, so those totals are not adjusted.` : "");
  return {
    adjustment: {
      kind: "measured_ingredient",
      label: `${args.direction > 0 ? "+" : "−"} ${args.grams} g ${args.name}`,
      changes,
      basis: args.perUnit ? "per_unit" : "per_entry",
      accuracyClass: "measured",
      assumption,
    },
    missing,
  };
}

function readValues(values: Partial<Record<NutrientKey, string>>, direction: 1 | -1, only?: NutrientKey[]): Partial<Record<NutrientKey, number>> | string {
  const changes: Partial<Record<NutrientKey, number>> = {};
  for (const { key, label, max } of ADJUSTABLE) {
    if (only && !only.includes(key)) continue;
    const text = (values[key] ?? "").trim().replace(",", ".");
    if (text === "") continue;
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0 || value > max) return `${label} must be a number from 0 to ${max}.`;
    changes[key] = round2(direction * value);
  }
  return Object.keys(changes).length === 0 ? "Enter at least one value." : changes;
}

export type ManualForm = { label: string; direction: 1 | -1; values: Partial<Record<NutrientKey, string>>; perUnit: boolean };
export function manualFromForm(form: ManualForm): Adjustment | string {
  const label = form.label.trim();
  if (!label || label.length > 80) return "Describe the change in a few words.";
  const changes = readValues(form.values, form.direction);
  if (typeof changes === "string") return changes;
  return { kind: "manual_delta", label, changes, basis: form.perUnit ? "per_unit" : "per_entry", accuracyClass: "manual", assumption: "Entered by you." };
}

/** Fills only nutrients whose starting value is unknown. Known values are never overwritten. */
export function fillUnknownFromForm(values: Partial<Record<NutrientKey, string>>): Adjustment | string {
  const changes = readValues(values, 1);
  if (typeof changes === "string") return changes;
  return { kind: "set_unknown_value", label: "Your values for unknown nutrients", changes, basis: "per_entry", accuracyClass: "manual", assumption: "Entered by you." };
}

export function validateAdjustments(raw: unknown): Adjustment[] | string {
  if (!Array.isArray(raw)) return "Adjustments must be a list.";
  if (raw.length > MAX_ADJUSTMENTS) return `You can add up to ${MAX_ADJUSTMENTS} adjustments to one entry.`;
  const result: Adjustment[] = [];
  for (const item of raw) {
    const entry = item as Record<string, unknown> | null;
    if (!entry || typeof entry !== "object") return "Invalid adjustment.";
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    if (!label || label.length > 120) return "Each adjustment needs a short label.";
    if (!KINDS.includes(entry.kind as AdjustmentKind)) return "Unknown adjustment type.";
    const accuracy = (entry.accuracyClass ?? "manual") as string;
    if (!CLASSES.includes(accuracy)) return "Unknown accuracy class.";
    if (typeof entry.changes !== "object" || entry.changes === null) return "Invalid changes.";
    const changes: Partial<Record<NutrientKey, number>> = {};
    for (const [key, value] of Object.entries(entry.changes as Record<string, unknown>)) {
      const limit = ADJUSTABLE.find((candidate) => candidate.key === key);
      if (!limit) return `${key} cannot be adjusted.`;
      if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > limit.max * 2) return `Invalid value for ${limit.label}.`;
      changes[key as NutrientKey] = value;
    }
    if (Object.keys(changes).length === 0) return "An adjustment needs at least one change.";
    const assumption = typeof entry.assumption === "string" && entry.assumption.trim() ? entry.assumption.trim().slice(0, 300) : undefined;
    result.push({
      kind: entry.kind as AdjustmentKind,
      label,
      changes,
      basis: entry.basis === "per_unit" ? "per_unit" : "per_entry",
      accuracyClass: accuracy as Adjustment["accuracyClass"],
      scalesWithQuantity: entry.scalesWithQuantity === true,
      assumption,
    });
  }
  return result;
}

export type AdjustmentRow = {
  kind: AdjustmentKind;
  accuracy_class: "measured" | "estimate" | "manual";
  label: string;
  nutrient_changes: Partial<Record<NutrientKey, number>>;
  assumption: string | null;
  basis: "per_entry" | "per_unit";
  scales_with_quantity: boolean;
};
export const rowToAdjustment = (row: AdjustmentRow): Adjustment => ({
  kind: row.kind, label: row.label, changes: row.nutrient_changes, basis: row.basis,
  scalesWithQuantity: row.scales_with_quantity, accuracyClass: row.accuracy_class, assumption: row.assumption ?? undefined,
});
export const adjustmentToRow = (adjustment: Adjustment) => ({
  kind: adjustment.kind,
  accuracy_class: adjustment.accuracyClass ?? "manual",
  label: adjustment.label,
  nutrient_changes: adjustment.changes,
  assumption: adjustment.assumption ?? null,
  basis: adjustment.basis ?? "per_entry",
  scales_with_quantity: adjustment.scalesWithQuantity ?? false,
});
