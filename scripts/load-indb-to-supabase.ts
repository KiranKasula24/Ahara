import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

type Row = Record<string, unknown>;
type Normalized = { source_code: string; raw_row: Row; checksum: string; canonical_name: string; aliases: string[]; group: string; serving_mode: "count" | "household" | "grams_only"; serving_unit: string | null; flags: string[] };
function numberOrNull(row: Row, key: string) { const value = row[key]; return value === null || value === undefined || value === "" ? null : Number(value); }
function env(contents: string, key: string) { return contents.split(/\r?\n/).find(l => l.startsWith(`${key}=`))?.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, ""); }
async function batches<T>(items: T[], size: number, fn: (batch: T[], index: number) => Promise<void>) { for (let index = 0; index < items.length; index += size) await fn(items.slice(index, index + size), index); }
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const contents = await fs.readFile(".env.local", "utf8"); const url = env(contents,"NEXT_PUBLIC_SUPABASE_URL"); const serviceKey = env(contents,"SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
  const records = JSON.parse(await fs.readFile(path.join("data","output","indb-normalized.json"),"utf8")) as Normalized[];
  if (records.some(r => !r.source_code)) throw new Error("Every source row must have food_code before importing.");
  if (dryRun) { console.log(`Dry run: would upsert ${records.length} source records, foods, nutrients and parsed aliases.`); return; }
  // Supabase JS initialises Realtime even though this import only uses REST.
  // Node 20 has no browser WebSocket, so provide the compatible implementation.
  if (!(globalThis as { WebSocket?: unknown }).WebSocket) (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log("Upserting data source…");
  const { data: source, error: sourceError } = await client.from("data_sources").upsert({ provider:"INDB", dataset:"Anuvaad_INDB", version:"2024.11", url:null, licence_note:"Personal project reference dataset; reassess terms before public distribution.", retrieved_at:new Date().toISOString() }, { onConflict:"provider,dataset,version" }).select("id").single();
  if (sourceError || !source) throw sourceError ?? new Error("Could not create data source");
  console.log("Upserting source records…"); await batches(records, 20, async (batch, index) => { console.log(`  rows ${index + 1}-${index + batch.length}`); const { error } = await client.from("source_records").upsert(batch.map(r => ({source_id:source.id,source_code:r.source_code,raw_row:r.raw_row,checksum:r.checksum})),{onConflict:"source_id,source_code"}); if (error) throw error; });
  const { data: sourceRows, error: recordsError } = await client.from("source_records").select("id,source_code").eq("source_id",source.id); if (recordsError || !sourceRows) throw recordsError ?? new Error("Source records missing after upsert");
  const ids = new Map(sourceRows.map(r => [r.source_code,r.id]));
  await batches(records, 100, async batch => { const { error } = await client.from("foods").upsert(batch.map(r => ({source_record_id:ids.get(r.source_code),canonical_name:r.canonical_name,kind:"prepared_dish",serving_mode:r.serving_mode,source_kind:"reference",review_flags:r.flags})),{onConflict:"source_record_id"}); if (error) throw error; });
  const { data: foods, error: foodsError } = await client.from("foods").select("id,source_record_id").not("source_record_id","is",null); if (foodsError || !foods) throw foodsError ?? new Error("Foods missing after upsert"); const foodByRecord = new Map(foods.map(f => [f.source_record_id,f.id]));
  for (const record of records) { const foodId = foodByRecord.get(ids.get(record.source_code)!); if (!foodId) throw new Error(`Food missing for ${record.source_code}`); const row = record.raw_row; const { error: deleteError } = await client.from("food_aliases").delete().eq("food_id",foodId).eq("alias_type","source"); if (deleteError) throw deleteError; const aliases = [record.canonical_name,...record.aliases].filter((value,index,all)=>all.indexOf(value)===index); const { error: aliasError } = await client.from("food_aliases").insert(aliases.map(alias=>({food_id:foodId,alias,language:"en",script:"latin",alias_type:"source",verified:true,match_quality:"exact"}))); if(aliasError) throw aliasError; }
  console.log(`Loaded ${records.length} INDB reference foods into Supabase.`);
}
main().catch(error => { console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2)); process.exitCode = 1; });
