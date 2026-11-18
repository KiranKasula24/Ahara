"use client";

import { useEffect, useRef, useState } from "react";
import { AdjustSheet } from "@/components/dashboard/AdjustSheet";
import { PortionPicker } from "@/components/food/PortionPicker";
import { apiFetch } from "@/lib/api";
import { localTime, zonedDateTimeToInstant } from "@/lib/dates";
import { FOOD_SELECT } from "@/lib/food-select";
import { MEALS, type Meal } from "@/lib/meals";
import { supabase } from "@/lib/supabase";
import { USER_TAGS } from "@/lib/tags";
import { availableUnits, parseQuantity, type FoodSummary, type PortionUnit } from "@/lib/units";

export type EditableLog = {
  id: string;
  food_id: string | null;
  name_snapshot: string;
  quantity: number;
  unit: string;
  meal_type: string;
  consumed_at: string;
  local_date: string;
};

type Props = { log: EditableLog; timeZone: string; onClose: () => void; onSaved: () => void; onRemove: () => void };

export function EditEntrySheet({ log, timeZone, onClose, onSaved, onRemove }: Props) {
  const [food, setFood] = useState<FoodSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(log.food_id));
  const [unit, setUnit] = useState<PortionUnit>(log.unit === "g" ? "g" : "serving");
  const [amount, setAmount] = useState(String(Number(log.quantity)));
  const [meal, setMeal] = useState<Meal>((MEALS as readonly string[]).includes(log.meal_type) ? (log.meal_type as Meal) : "snack");
  const [date, setDate] = useState(log.local_date);
  const [time, setTime] = useState(localTime(timeZone, new Date(log.consumed_at)));
  const [tags, setTags] = useState<string[]>([]);
  const [adjusting, setAdjusting] = useState<null | "list" | "fill">(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = useRef(false);

  const close = () => (changed.current ? onSaved() : onClose());

  useEffect(() => {
    const db = supabase();
    if (log.food_id) {
      db.from("foods").select(FOOD_SELECT).eq("id", log.food_id).single().then(({ data }) => {
        setFood(data ? (data as unknown as FoodSummary) : null);
        setLoading(false);
      });
    }
    db.from("food_log_tags").select("tag").eq("log_id", log.id).then(({ data }) => setTags((data ?? []).map((row) => row.tag as string)));
  }, [log.food_id, log.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !adjusting && (changed.current ? onSaved() : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adjusting, onClose, onSaved]);

  const quantity = parseQuantity(amount);
  const canSave = Boolean(food) && availableUnits(food ?? ({} as FoodSummary)).length > 0 && quantity !== null && Boolean(date) && Boolean(time);

  async function save() {
    if (!food || quantity === null) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/logs", {
        method: "PATCH",
        json: { id: log.id, quantity, unit, mealType: meal, consumedAt: zonedDateTimeToInstant(date, time, timeZone).toISOString() },
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your changes couldn’t be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTag(tag: string) {
    const next = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
    try {
      await apiFetch("/api/logs/tags", { method: "PUT", json: { logId: log.id, tags: next } });
      setTags(next);
      changed.current = true;
    } catch {
      setError("That tag couldn’t be saved.");
    }
  }

  return (
    <div className="ax-sheet-backdrop" onClick={close}>
      <div className="ax-sheet" role="dialog" aria-modal="true" aria-label={`Edit ${log.name_snapshot}`} onClick={(event) => event.stopPropagation()}>
        <div className="ax-sheet-head">
          <h2>{log.name_snapshot}</h2>
          <button onClick={close} aria-label="Close">×</button>
        </div>

        {loading ? (
          <div className="skeleton-stack"><div /><div /></div>
        ) : food ? (
          <PortionPicker food={food} unit={unit} amount={amount} onUnitChange={setUnit} onAmountChange={setAmount} />
        ) : (
          <p className="nutrition-note">This food is no longer in the catalogue, so its amount can’t be changed. You can still adjust, tag or remove the entry.</p>
        )}

        {food && (
          <>
            <div className="ax-chips" role="group" aria-label="Meal">
              {MEALS.map((item) => (
                <button key={item} className={`ax-chip ${meal === item ? "selected" : ""}`} aria-pressed={meal === item} onClick={() => setMeal(item)}>{item}</button>
              ))}
            </div>
            <div className="ax-when-fields">
              <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
            </div>
            <p className="muted">Saving re-calculates this entry from the food’s current values, keeping any adjustments.</p>
          </>
        )}

        <div>
          <p className="muted">Tags (they never change calories)</p>
          <div className="ax-chips" role="group" aria-label="Tags">
            {USER_TAGS.map(([value, name]) => (
              <button key={value} className={`ax-chip ${tags.includes(value) ? "selected" : ""}`} aria-pressed={tags.includes(value)} onClick={() => void toggleTag(value)}>{name}</button>
            ))}
          </div>
          {(tags.includes("junk") || tags.includes("sugary_junk")) && (
            <button className="text-link" onClick={() => setAdjusting("fill")}>Add sugar or sodium if you know them</button>
          )}
        </div>

        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="install-actions">
          {food && <button className="button primary" disabled={!canSave || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save changes"}</button>}
          <button className="button secondary" onClick={() => setAdjusting("list")}>Adjust this entry</button>
          <button className="button secondary" onClick={onRemove}>Remove entry</button>
        </div>
      </div>

      {adjusting && (
        <AdjustSheet
          logId={log.id}
          startMode={adjusting}
          onClose={(didChange) => {
            if (didChange) changed.current = true;
            setAdjusting(null);
            if (didChange) onSaved();
          }}
        />
      )}
    </div>
  );
}
