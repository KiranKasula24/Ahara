export type UnitKind = "count" | "household";
export type OwnFoodInput = {
  name: string;
  unitKind: UnitKind;
  servingName: string;
  kcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  note: string | null;
};
export type OwnFoodFormValues = {
  name: string;
  unitKind: UnitKind;
  servingName: string;
  mode: "portion" | "batch";
  servingsMade: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  sugar: string;
  sodium: string;
  note: string;
};

const LIMITS = { kcal: 5000, grams: 1000, sodiumMg: 20000 };
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Blank means unknown (null). Anything that is not a number of 0 or more is invalid. */
export function parseNumber(text: string): number | null | "invalid" {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : "invalid";
}

type Parsed = { value: number | null } | { error: string };
function readNumber(raw: unknown, max: number, label: string, required: boolean): Parsed {
  if (raw === null || raw === undefined || raw === "") return required ? { error: `${label} is required.` } : { value: null };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > max) return { error: `${label} must be a number from 0 to ${max}.` };
  return { value };
}

/** Validates a per-portion food. Used by both the form and the server. Returns an error message or the clean values. */
export function validateOwnFoodInput(raw: Record<string, unknown>): OwnFoodInput | string {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name || name.length > 120) return "Enter a name of up to 120 characters.";
  if (raw.unitKind !== "count" && raw.unitKind !== "household") return "Choose how this food is counted.";
  const servingName = typeof raw.servingName === "string" ? raw.servingName.trim() : "";
  if (!servingName || servingName.length > 40) return "Name the portion, such as piece or bowl.";
  const note = typeof raw.note === "string" && raw.note.trim() ? raw.note.trim() : null;
  if (note && note.length > 500) return "Keep the note to 500 characters.";

  const kcal = readNumber(raw.kcal, LIMITS.kcal, "Calories", true);
  const protein = readNumber(raw.proteinG, LIMITS.grams, "Protein", false);
  const carbs = readNumber(raw.carbsG, LIMITS.grams, "Carbs", false);
  const fat = readNumber(raw.fatG, LIMITS.grams, "Fat", false);
  const sugar = readNumber(raw.sugarG, LIMITS.grams, "Sugar", false);
  const sodium = readNumber(raw.sodiumMg, LIMITS.sodiumMg, "Sodium", false);
  for (const field of [kcal, protein, carbs, fat, sugar, sodium]) if ("error" in field) return field.error;
  const value = (field: Parsed) => (field as { value: number | null }).value;

  return {
    name,
    unitKind: raw.unitKind,
    servingName,
    kcal: value(kcal) as number,
    proteinG: value(protein),
    carbsG: value(carbs),
    fatG: value(fat),
    sugarG: value(sugar),
    sodiumMg: value(sodium),
    note,
  };
}

/** Turns the form into per-portion values, dividing by servings when the user entered a whole batch. */
export function buildOwnFood(form: OwnFoodFormValues): { ok: true; value: OwnFoodInput } | { ok: false; error: string } {
  let divisor = 1;
  if (form.mode === "batch") {
    const servings = parseNumber(form.servingsMade);
    if (servings === null || servings === "invalid" || servings <= 0) return { ok: false, error: "Enter how many servings the batch makes." };
    divisor = servings;
  }
  const field = (text: string): number | null | "invalid" => {
    const parsed = parseNumber(text);
    return parsed === "invalid" ? "invalid" : parsed === null ? null : round2(parsed / divisor);
  };
  const values = { kcal: field(form.kcal), proteinG: field(form.protein), carbsG: field(form.carbs), fatG: field(form.fat), sugarG: field(form.sugar), sodiumMg: field(form.sodium) };
  if (Object.values(values).includes("invalid")) return { ok: false, error: "Use numbers only (0 or more), or leave a field blank if you don’t know it." };
  const checked = validateOwnFoodInput({ name: form.name, unitKind: form.unitKind, servingName: form.servingName, note: form.note, ...values });
  return typeof checked === "string" ? { ok: false, error: checked } : { ok: true, value: checked };
}
