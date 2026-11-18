"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSession } from "@/components/app-shell/SessionProvider";
import {
  KIND_LABELS, describeActivity, parseAmount, trackerProgress, trackerSummary,
  type Tracker, type TrackerEntry, type TrackerKind, type Workout,
} from "@/lib/activity";
import { localDate } from "@/lib/dates";
import { addDays } from "@/lib/insights";
import { supabase } from "@/lib/supabase";

const DUPLICATE = "23505"; // the same client id arriving twice is a replay, not an error
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function ActivityExperience() {
  const session = useSession();
  const timeZone = session?.timeZone ?? "Asia/Kolkata";
  const userId = session?.userId;
  const today = localDate(timeZone);

  const [date, setDate] = useState(today);
  const [goal, setGoal] = useState<number | null>(null);
  const [steps, setSteps] = useState<number | null>(null);
  const [stepsText, setStepsText] = useState("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const [wName, setWName] = useState("");
  const [wMinutes, setWMinutes] = useState("");
  const [wKcal, setWKcal] = useState("");
  const [showTrackerForm, setShowTrackerForm] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [readings, setReadings] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const db = supabase();
    const [goalRes, stepsRes, workoutRes, trackerRes, entryRes] = await Promise.all([
      db.from("goal_versions").select("value").eq("kind", "activity_kcal").lte("starts_at", date)
        .or(`ends_at.is.null,ends_at.gte.${date}`).order("starts_at", { ascending: false }).limit(1),
      db.from("daily_steps").select("steps").eq("local_date", date).maybeSingle(),
      db.from("activities").select("id,name,duration_min,kcal").eq("local_date", date).order("created_at"),
      db.from("trackers").select("id,name,kind,unit,step,target").is("archived_at", null).order("created_at"),
      db.from("tracker_entries").select("id,tracker_id,value,created_at").eq("local_date", date).order("created_at"),
    ]);
    const failed = [goalRes, stepsRes, workoutRes, trackerRes, entryRes].find((result) => result.error);
    if (failed) setError("Some of this couldn’t be loaded. Pull to refresh or try again.");
    else setError("");
    const goalValue = (goalRes.data as { value: number }[] | null)?.[0]?.value;
    setGoal(goalValue === undefined ? null : Number(goalValue));
    const stepValue = (stepsRes.data as { steps: number } | null)?.steps ?? null;
    setSteps(stepValue);
    setStepsText(stepValue === null ? "" : String(stepValue));
    setWorkouts(((workoutRes.data ?? []) as Workout[]).map((row) => ({ ...row, kcal: row.kcal === null ? null : Number(row.kcal) })));
    setTrackers(((trackerRes.data ?? []) as Tracker[]).map((row) => ({ ...row, step: row.step === null ? null : Number(row.step), target: row.target === null ? null : Number(row.target) })));
    setEntries(((entryRes.data ?? []) as TrackerEntry[]).map((row) => ({ ...row, value: Number(row.value) })));
    setReady(true);
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => PromiseLike<{ error: { code?: string; message: string } | null }>, failure: string) {
    setError("");
    const { error: failed } = await action();
    if (failed && failed.code !== DUPLICATE) {
      setError(failure);
      return false;
    }
    await load();
    return true;
  }

  async function saveSteps() {
    if (!userId) return;
    if (stepsText.trim() === "") {
      await run(() => supabase().from("daily_steps").delete().eq("local_date", date), "Steps couldn’t be cleared.");
      return;
    }
    const value = parseAmount(stepsText, 200000);
    if (value === null || !Number.isInteger(value)) return setError("Steps must be a whole number from 0 to 200000.");
    await run(() => supabase().from("daily_steps").upsert({ owner_id: userId, local_date: date, steps: value, updated_at: new Date().toISOString() }, { onConflict: "owner_id,local_date" }), "Steps couldn’t be saved.");
  }

  async function addWorkout(event: FormEvent) {
    event.preventDefault();
    if (!userId) return;
    const name = wName.trim();
    const minutes = parseAmount(wMinutes, 1440);
    const kcal = wKcal.trim() === "" ? null : parseAmount(wKcal, 10000);
    if (!name || name.length > 80) return setError("Name the workout in a few words.");
    if (minutes === null || minutes < 1 || !Number.isInteger(minutes)) return setError("Duration must be a whole number of minutes.");
    if (wKcal.trim() !== "" && kcal === null) return setError("Calories must be a number from 0 to 10000, or leave it blank.");
    const ok = await run(() => supabase().from("activities").insert({ id: crypto.randomUUID(), owner_id: userId, local_date: date, name, duration_min: minutes, kcal }), "The workout couldn’t be saved.");
    if (ok) {
      setWName("");
      setWMinutes("");
      setWKcal("");
    }
  }

  const removeWorkout = (id: string) => run(() => supabase().from("activities").delete().eq("id", id), "That workout couldn’t be removed.");

  async function addEntry(tracker: Tracker, value: number) {
    if (!userId) return;
    await run(() => supabase().from("tracker_entries").insert({ id: crypto.randomUUID(), owner_id: userId, tracker_id: tracker.id, local_date: date, value }), "That entry couldn’t be saved.");
  }
  const removeEntry = (id: string) => run(() => supabase().from("tracker_entries").delete().eq("id", id), "That entry couldn’t be removed.");

  async function archive(tracker: Tracker) {
    if (confirmArchive !== tracker.id) return setConfirmArchive(tracker.id);
    setConfirmArchive(null);
    await run(() => supabase().from("trackers").update({ archived_at: new Date().toISOString() }).eq("id", tracker.id), "The tracker couldn’t be archived.");
  }

  const kcalTotal = workouts.reduce((sum, workout) => sum + (workout.kcal ?? 0), 0);
  const barPercent = goal && workouts.some((workout) => workout.kcal !== null) ? Math.min(100, Math.round((kcalTotal / goal) * 100)) : 0;
  const dateLabel = date === today ? "Today" : date;

  return (
    <>
      <div className="ax-daynav">
        <button className="button secondary" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
        <strong>{dateLabel}</strong>
        <button className="button secondary" disabled={date >= today} onClick={() => setDate(addDays(date, 1))} aria-label="Next day">›</button>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {!ready ? (
        <div className="skeleton-stack"><div /><div /><div /></div>
      ) : (
        <>
          <section className="ax-section">
            <h2>Workouts</h2>
            <div className="ax-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={barPercent} aria-label="Workout calories toward your activity target">
              <span style={{ width: `${barPercent}%` }} />
            </div>
            <p className="muted">{describeActivity(workouts, goal)}</p>
            {goal === null && <p className="muted">No activity target set. <Link href="/goals">Set one in Goals</Link>, or leave it off.</p>}
            {workouts.map((workout) => (
              <div className="ax-quick-row" key={workout.id}>
                <span>
                  <b>{workout.name}</b>
                  <small>{workout.duration_min} min · {workout.kcal === null ? "calories not entered" : `${Math.round(workout.kcal)} kcal`}</small>
                </span>
                <button className="text-link" onClick={() => void removeWorkout(workout.id)}>Remove</button>
              </div>
            ))}
            <form className="ax-stack" onSubmit={addWorkout}>
              <label>Workout<input value={wName} onChange={(event) => setWName(event.target.value)} maxLength={80} placeholder="Walk, cricket, yoga…" /></label>
              <div className="ax-when-fields">
                <label>Minutes<input inputMode="numeric" value={wMinutes} onChange={(event) => setWMinutes(event.target.value)} /></label>
                <label>Calories (optional)<input inputMode="decimal" value={wKcal} onChange={(event) => setWKcal(event.target.value)} /></label>
              </div>
              <button className="button primary">Add workout</button>
            </form>
          </section>

          <section className="ax-section">
            <h2>Steps</h2>
            <p className="muted">{steps === null ? "Not entered. This stays unknown, not zero." : `${steps.toLocaleString("en-IN")} steps`}</p>
            <div className="ax-quick-row">
              <input inputMode="numeric" aria-label="Steps" value={stepsText} onChange={(event) => setStepsText(event.target.value)} placeholder="Steps for the day" />
              <button className="button secondary" onClick={() => void saveSteps()}>Save steps</button>
            </div>
          </section>

          <section className="ax-section">
            <h2>My trackers</h2>
            {trackers.length === 0 && <p className="muted">Track anything you like each day: water, tea, a vitamin, weight.</p>}
            {trackers.map((tracker) => {
              const mine = entries.filter((entry) => entry.tracker_id === tracker.id);
              const progress = trackerProgress(tracker, mine);
              const unit = tracker.unit ? ` ${tracker.unit}` : "";
              return (
                <div className="tx-meal" key={tracker.id}>
                  <div className="tx-meal-head">
                    <div>
                      <h3>{tracker.name}</h3>
                      <small>{trackerSummary(tracker, mine)}</small>
                    </div>
                  </div>
                  {progress !== null && <div className="ax-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`${tracker.name} progress`}><span style={{ width: `${progress}%` }} /></div>}
                  <div className="install-actions">
                    {(tracker.kind === "counter" || tracker.kind === "amount") && tracker.step && (
                      <button className="button primary" onClick={() => void addEntry(tracker, tracker.step as number)}>+{tracker.step}{unit}</button>
                    )}
                    {tracker.kind === "yes_no" && (
                      mine.length === 0
                        ? <button className="button primary" onClick={() => void addEntry(tracker, 1)}>Mark done</button>
                        : <button className="button secondary" onClick={() => void removeEntry(mine[mine.length - 1].id)}>Done ✓ (tap to undo)</button>
                    )}
                    {tracker.kind === "measurement" && (
                      <>
                        <input inputMode="decimal" aria-label={`${tracker.name} reading`} value={readings[tracker.id] ?? ""} onChange={(event) => setReadings((old) => ({ ...old, [tracker.id]: event.target.value }))} placeholder={`Reading${unit ? ` (${tracker.unit})` : ""}`} />
                        <button className="button primary" onClick={async () => {
                          const value = parseAmount(readings[tracker.id] ?? "", 1000000);
                          if (value === null) return setError("Enter a reading as a number.");
                          await addEntry(tracker, value);
                          setReadings((old) => ({ ...old, [tracker.id]: "" }));
                        }}>Save reading</button>
                      </>
                    )}
                    {tracker.kind !== "yes_no" && mine.length > 0 && (
                      <button className="button secondary" onClick={() => void removeEntry(mine[mine.length - 1].id)}>Undo last</button>
                    )}
                    <button className="text-link" onClick={() => void archive(tracker)}>{confirmArchive === tracker.id ? "Tap again to archive" : "Archive"}</button>
                  </div>
                </div>
              );
            })}
            {showTrackerForm ? (
              <TrackerForm userId={userId} onDone={async (created) => { setShowTrackerForm(false); if (created) await load(); }} />
            ) : (
              <button className="button secondary" onClick={() => setShowTrackerForm(true)}>Add a tracker</button>
            )}
          </section>
        </>
      )}
    </>
  );
}

function TrackerForm({ userId, onDone }: { userId?: string; onDone: (created: boolean) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TrackerKind>("counter");
  const [unit, setUnit] = useState("");
  const [step, setStep] = useState("1");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const accumulates = kind === "counter" || kind === "amount";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!userId) return;
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 60) return setError("Give the tracker a name of up to 60 characters.");
    const stepValue = accumulates ? parseAmount(step, 1000000) : null;
    if (accumulates && (stepValue === null || stepValue <= 0)) return setError("Each tap must add an amount above 0.");
    const targetValue = accumulates && target.trim() !== "" ? parseAmount(target, 1000000) : null;
    if (accumulates && target.trim() !== "" && (targetValue === null || targetValue <= 0)) return setError("The daily target must be above 0, or leave it blank.");
    setSaving(true);
    const { error: failed } = await supabase().from("trackers").insert({
      owner_id: userId, name: cleanName, kind, unit: unit.trim() || null, step: stepValue, target: targetValue,
    });
    setSaving(false);
    if (failed) return setError(failed.code === DUPLICATE ? "You already have a tracker with that name." : "The tracker couldn’t be saved.");
    onDone(true);
  }

  return (
    <form className="ax-stack" onSubmit={submit}>
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Water, tea, vitamin D, weight…" /></label>
      <div className="ax-chips" role="group" aria-label="Type">
        {(Object.keys(KIND_LABELS) as TrackerKind[]).map((option) => (
          <button type="button" key={option} className={`ax-chip ${kind === option ? "selected" : ""}`} aria-pressed={kind === option} onClick={() => { setKind(option); setStep(option === "amount" ? "250" : "1"); }}>
            {KIND_LABELS[option]}
          </button>
        ))}
      </div>
      {kind !== "yes_no" && <label>Unit (optional)<input value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={20} placeholder={kind === "amount" ? "ml" : kind === "measurement" ? "kg" : "cups"} /></label>}
      {accumulates && (
        <>
          <label>Each tap adds<input inputMode="decimal" value={step} onChange={(event) => setStep(event.target.value)} /></label>
          <label>Daily target (optional)<input inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
        </>
      )}
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="install-actions">
        <button className="button primary" disabled={saving}>{saving ? "Saving…" : "Save tracker"}</button>
        <button type="button" className="button secondary" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </form>
  );
}
