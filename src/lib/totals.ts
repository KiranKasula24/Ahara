import type { NutrientKey } from "@/lib/nutrition";

export type KcalTotal = { total: number | null; partial: boolean; knownCount: number; unknownCount: number };

/** Sums numbers without ever treating unknown as zero. Works for calories and any other nutrient. */
export function sumKnown(values: ReadonlyArray<number | null | undefined>): KcalTotal {
  let total = 0;
  let knownCount = 0;
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      total += value;
      knownCount += 1;
    }
  }
  const unknownCount = values.length - knownCount;
  return {
    total: values.length === 0 ? 0 : knownCount === 0 ? null : total,
    partial: knownCount > 0 && unknownCount > 0,
    knownCount,
    unknownCount,
  };
}
export const sumKcal = sumKnown;

/** Reads one final nutrient from a food_log_nutrients embed, which may arrive as an object or a one-item array. */
export function finalValue(embed: unknown, key: NutrientKey): number | null {
  const row = (Array.isArray(embed) ? embed[0] : embed) as { final_totals?: Record<string, unknown> } | null | undefined;
  const value = row?.final_totals?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export const finalKcal = (embed: unknown): number | null => finalValue(embed, "kcal");
