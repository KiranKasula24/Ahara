import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import type { NormalizedRow } from "./import-indb/core";

type Row = Record<string, unknown>;
function value(row: Row, key: string): number | null { const raw = row[key]; if (raw === null || raw === undefined || raw === "") return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; }
function env(contents: string, key: string): string | undefined { return contents.split(/\r?\n/).find((line) => line.startsWith(`${key}=`))?.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, ""); }
async function batches<T>(items: T[], size: number, fn: (batch: T[]) => Promise<void>) { for (let index = 0; index < items.length; index += size) await fn(items.slice(index, index + size)); }
function nutrientPayload(foodId: string, basis: "per_100g" | "per_serving", servingId: string | null, row: Row, prefix = "") {
  const raw = (key: string) => value(row, `${prefix}${key}`);
  const extra: Record<string, { value: number | null; unit: string }> = {};
  for (const [key, item] of Object.entries(row)) if (key.startsWith(prefix) && /_(mg|ug|g)$/.test(key) && !["carb_g", "protein_g", "fat_g", "freesugar_g", "fibre_g", "sfa_mg", "sodium_mg"].includes(key.slice(prefix.length))) extra[key.slice(prefix.length)] = { value: item === null || item === "" ? null : Number(item), unit: key.endsWith("_ug") ? "µg" : key.endsWith("_mg") ? "mg" : "g" };
  const sfa = raw("sfa_mg");
  return { food_id: foodId, basis, serving_id: servingId, kcal: raw("energy_kcal"), protein_g: raw("protein_g"), carbs_g: raw("carb_g"), fat_g: raw("fat_g"), sat_fat_g: sfa === null ? null : sfa / 1000, fibre_g: raw("fibre_g"), free_sugars_g: raw("freesugar_g"), total_sugars_g: null, sodium_mg: raw("sodium_mg"), extra };
}

async function main() {
  if (!process.argv.includes("--apply")) throw new Error("Refusing to write. Run npm run load:indb -- --apply after reviewing data/output/indb-validation-report.json.");
  const contents = await fs.readFile(".env.local", "utf8"); const url = env(contents, "NEXT_PUBLIC_SUPABASE_URL"); const serviceKey = env(contents, "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
  const records = JSON.parse(await fs.readFile(path.join("data", "output", "indb-normalized.json"), "utf8")) as NormalizedRow[];
  if (records.some((record) => !record.source_code)) throw new Error("Every source row must have a stable food_code.");
  if (!(globalThis as { WebSocket?: unknown }).WebSocket) (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: source, error: sourceError } = await client.from("data_sources").upsert({ provider: "INDB", dataset: "Anuvaad_INDB", version: "2024.11", url: null, licence_note: "Reference data imported unchanged; review licence before public distribution.", retrieved_at: new Date().toISOString() }, { onConflict: "provider,dataset,version" }).select("id").single();
  if (sourceError || !source) throw sourceError ?? new Error("Could not upsert data source");
  await batches(records, 50, async (batch) => { const { error } = await client.from("source_records").upsert(batch.map((record) => ({ source_id: source.id, source_code: record.source_code, raw_row: record.raw_row, checksum: record.checksum })), { onConflict: "source_id,source_code" }); if (error) throw error; });
  const { data: sourceRows, error: sourceRowsError } = await client.from("source_records").select("id,source_code").eq("source_id", source.id); if (sourceRowsError || !sourceRows) throw sourceRowsError ?? new Error("Could not read source records");
  const sourceIdByCode = new Map(sourceRows.map((sourceRow) => [sourceRow.source_code, sourceRow.id]));
  await batches(records, 100, async (batch) => { const { error } = await client.from("foods").upsert(batch.map((record) => ({ source_record_id: sourceIdByCode.get(record.source_code), canonical_name: record.canonical_name, kind: "prepared_dish", serving_mode: record.serving_mode, source_kind: "reference", review_flags: record.flags })), { onConflict: "source_record_id" }); if (error) throw error; });
  const { data: foods, error: foodsError } = await client.from("foods").select("id,source_record_id").not("source_record_id", "is", null); if (foodsError || !foods) throw foodsError ?? new Error("Could not read imported foods");
  const foodIdBySourceId = new Map(foods.map((food) => [food.source_record_id, food.id]));
  for (const record of records) {
    const foodId = foodIdBySourceId.get(sourceIdByCode.get(record.source_code)!); if (!foodId) throw new Error(`Food was not created for ${record.source_code}`);
    const deleteRelations = [client.from("food_aliases").delete().eq("food_id", foodId).eq("alias_type", "source"), client.from("food_nutrients").delete().eq("food_id", foodId), client.from("food_servings").delete().eq("food_id", foodId)];
    for (const request of deleteRelations) { const { error } = await request; if (error) throw error; }
    const aliases = [...new Set([record.canonical_name, ...record.aliases])]; const { error: aliasesError } = await client.from("food_aliases").insert(aliases.map((alias) => ({ food_id: foodId, alias, language: "en", script: "latin", alias_type: "source", verified: true, match_quality: "exact" }))); if (aliasesError) throw aliasesError;
    const raw = record.raw_row; const servingEnergy = value(raw, "unit_serving_energy_kcal"); let servingId: string | null = null;
    if (record.serving_unit && servingEnergy !== null && servingEnergy !== 0) { const { data: serving, error: servingError } = await client.from("food_servings").insert({ food_id: foodId, name: record.serving_unit, unit_class: record.serving_mode === "count" ? "count" : "household", grams: record.serving_mode === "household" ? record.derived_serving_grams : null, derived: record.serving_mode === "household" && record.derived_serving_grams !== null, source: "INDB" }).select("id").single(); if (servingError || !serving) throw servingError ?? new Error("Could not create serving"); servingId = serving.id; }
    const nutrientRows = [nutrientPayload(foodId, "per_100g", null, raw)]; if (servingId) nutrientRows.push(nutrientPayload(foodId, "per_serving", servingId, raw, "unit_serving_"));
    const { error: nutrientsError } = await client.from("food_nutrients").insert(nutrientRows); if (nutrientsError) throw nutrientsError;
  }
  console.log(`Loaded ${records.length} INDB foods, source rows, aliases, servings, and nutrient snapshots without altering published values.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
