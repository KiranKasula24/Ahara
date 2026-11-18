export type ExportLogRow = {
  local_date: string;
  meal_type: string;
  name_snapshot: string;
  quantity: number;
  unit: string;
  food_log_nutrients: unknown;
};
const COLUMNS = [
  ["calories", "kcal"],
  ["protein_g", "proteinG"],
  ["carbs_g", "carbsG"],
  ["fat_g", "fatG"],
  ["total_sugars_g", "totalSugarsG"],
  ["sodium_mg", "sodiumMg"],
] as const;
/** Text cells that start with = + - @ could run as a formula in a spreadsheet, so they get a leading apostrophe. */ export function csvCell(
  value: string | number | null,
): string {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function totalsOf(embed: unknown): Record<string, unknown> {
  const one = Array.isArray(embed) ? embed[0] : embed;
  return ((one as { final_totals?: Record<string, unknown> } | null | undefined)
    ?.final_totals ?? {}) as Record<string, unknown>;
}
/** A blank cell means unknown. Zero is only written when the value really is zero. */ export function logsToCsv(
  rows: ExportLogRow[],
): string {
  const header = [
    "date",
    "meal",
    "food",
    "quantity",
    "unit",
    ...COLUMNS.map(([name]) => name),
  ].join(",");
  const lines = rows.map((row) => {
    const totals = totalsOf(row.food_log_nutrients);
    return [
      csvCell(row.local_date),
      csvCell(row.meal_type),
      csvCell(row.name_snapshot),
      csvCell(Number(row.quantity)),
      csvCell(row.unit),
      ...COLUMNS.map(([, key]) =>
        csvCell(
          typeof totals[key] === "number" ? (totals[key] as number) : null,
        ),
      ),
    ].join(",");
  });
  return [header, ...lines].join("\n") + "\n";
}
