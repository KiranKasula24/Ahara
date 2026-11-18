import { isValidBarcode, type Per100g } from "@/lib/off";

export type Per = Per100g;
export type ProductInput = {
  barcode: string | null;
  name: string;
  brand: string | null;
  source: "off" | "manual";
  servingName: string | null;
  servingGrams: number | null;
  per100g: Per | null;
  perServing: Per | null;
  per100gDerived: boolean;
  perServingDerived: boolean;
  note: string | null;
};
export type ProductFormValues = {
  barcode: string; name: string; brand: string; source: "off" | "manual"; basis: "per100g" | "perServing";
  servingName: string; servingGrams: string;
  kcal: string; protein: string; carbs: string; fat: string; satFat: string; fibre: string; sugar: string; sodium: string; note: string;
};

const FIELDS: { key: keyof Per; form: keyof ProductFormValues; label: string; max: number }[] = [
  { key: "kcal", form: "kcal", label: "Calories", max: 5000 },
  { key: "proteinG", form: "protein", label: "Protein", max: 1000 },
  { key: "carbsG", form: "carbs", label: "Carbs", max: 1000 },
  { key: "fatG", form: "fat", label: "Fat", max: 1000 },
  { key: "satFatG", form: "satFat", label: "Saturated fat", max: 1000 },
  { key: "fibreG", form: "fibre", label: "Fibre", max: 1000 },
  { key: "sugarG", form: "sugar", label: "Sugar", max: 1000 },
  { key: "sodiumMg", form: "sodium", label: "Sodium", max: 40000 },
];
const round2 = (value: number) => Math.round(value * 100) / 100;
const scale = (per: Per, factor: number): Per =>
  Object.fromEntries(Object.entries(per).map(([key, value]) => [key, value === null ? null : round2((value as number) * factor)])) as Per;

function readPer(raw: unknown): Per | string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return "Invalid nutrition values.";
  const source = raw as Record<string, unknown>;
  const out = {} as Per;
  for (const { key, label, max } of FIELDS) {
    const value = source[key];
    if (value === null || value === undefined || value === "") out[key] = null;
    else if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) return `${label} must be a number from 0 to ${max}.`;
    else out[key] = value;
  }
  return out;
}

/** Validates a product on the server. Returns an error message or the clean values. */
export function validateProductInput(raw: Record<string, unknown>): ProductInput | string {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name || name.length > 120) return "Enter a product name of up to 120 characters.";
  const barcode = typeof raw.barcode === "string" && raw.barcode ? raw.barcode : null;
  if (barcode && !isValidBarcode(barcode)) return "That barcode isn’t valid.";
  const brand = typeof raw.brand === "string" && raw.brand.trim() ? raw.brand.trim().slice(0, 80) : null;
  const note = typeof raw.note === "string" && raw.note.trim() ? raw.note.trim().slice(0, 500) : null;
  const servingGrams = raw.servingGrams === null || raw.servingGrams === undefined ? null : Number(raw.servingGrams);
  if (servingGrams !== null && (!Number.isFinite(servingGrams) || servingGrams <= 0 || servingGrams > 5000)) return "Serving size must be above 0 and up to 5000 g.";
  const per100g = readPer(raw.per100g);
  const perServing = readPer(raw.perServing);
  if (typeof per100g === "string") return per100g;
  if (typeof perServing === "string") return perServing;
  if (!per100g && !perServing) return "Enter the nutrition values from the label.";
  if ((per100g && per100g.kcal === null) || (perServing && perServing.kcal === null)) return "Calories are required.";
  const servingName = typeof raw.servingName === "string" && raw.servingName.trim() ? raw.servingName.trim().slice(0, 40) : null;
  if (perServing && !servingName) return "Name the serving, such as serving or biscuit.";
  return {
    barcode, name, brand, note, servingGrams, per100g, perServing, servingName: perServing ? servingName : servingGrams ? servingName ?? "serving" : null,
    source: raw.source === "off" ? "off" : "manual",
    per100gDerived: raw.per100gDerived === true,
    perServingDerived: raw.perServingDerived === true,
  };
}

/** Turns the form into a product. Values that are worked out from the other basis are flagged as derived. */
export function buildProduct(form: ProductFormValues): { ok: true; value: ProductInput } | { ok: false; error: string } {
  const values = {} as Per;
  for (const { key, form: formKey, label, max } of FIELDS) {
    const text = String(form[formKey]).trim().replace(",", ".");
    if (text === "") {
      values[key] = null;
      continue;
    }
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0 || value > max) return { ok: false, error: `${label} must be a number from 0 to ${max}.` };
    values[key] = value;
  }
  if (values.kcal === null) return { ok: false, error: "Calories are required." };

  const gramsText = form.servingGrams.trim().replace(",", ".");
  const grams = gramsText === "" ? null : Number(gramsText);
  if (grams !== null && (!Number.isFinite(grams) || grams <= 0 || grams > 5000)) return { ok: false, error: "Serving size must be above 0 and up to 5000 g." };

  const servingName = form.servingName.trim() || "serving";
  let per100g: Per | null = null;
  let perServing: Per | null = null;
  let per100gDerived = false;
  let perServingDerived = false;
  if (form.basis === "per100g") {
    per100g = values;
    if (grams) {
      perServing = scale(values, grams / 100);
      perServingDerived = true;
    }
  } else {
    perServing = values;
    if (grams) {
      per100g = scale(values, 100 / grams);
      per100gDerived = true;
    }
  }
  const checked = validateProductInput({
    barcode: form.barcode || null, name: form.name, brand: form.brand, source: form.source, servingName: perServing ? servingName : null,
    servingGrams: grams, per100g, perServing, per100gDerived, perServingDerived,
    note: form.note || (form.source === "off" ? `Open Food Facts, barcode ${form.barcode}. Checked by you.` : "Entered from the product label."),
  });
  return typeof checked === "string" ? { ok: false, error: checked } : { ok: true, value: checked };
}
