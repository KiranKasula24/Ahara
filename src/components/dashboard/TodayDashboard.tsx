"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EditEntrySheet, type EditableLog } from "@/components/dashboard/EditEntrySheet";
import { IntakeRing } from "@/components/dashboard/IntakeRing";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { useSession } from "@/components/app-shell/SessionProvider";
import { CapabilityState } from "@/components/RouteStates";
import { apiFetch } from "@/lib/api";
import { describeIntake } from "@/lib/day-status";
import { localDate, shiftDate } from "@/lib/dates";
import { MEALS } from "@/lib/meals";
import { supabase } from "@/lib/supabase";
import { finalKcal, finalValue, sumKnown } from "@/lib/totals";
import { useUndoableDelete } from "@/lib/use-undo-delete";
import { formatQuantity } from "@/lib/units";

type Log = EditableLog & { food_log_nutrients: unknown };
const SELECT = "id,food_id,name_snapshot,quantity,unit,meal_type,consumed_at,local_date,food_log_nutrients(final_totals)";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const quantityText = (log: Log) => (log.unit === "g" ? `${formatQuantity(Number(log.quantity))} g` : `${formatQuantity(Number(log.quantity))} ${log.unit}`);
const weekday = (date: string) => new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const kcalText = (total: ReturnType<typeof sumKnown>) => (total.total === null ? "Calories unknown" : `${total.partial ? "≥ " : ""}${Math.round(total.total)} kcal`);

export function TodayDashboard() {
  const session = useSession();
  const timeZone = session?.timeZone ?? "Asia/Kolkata";
  const db = useMemo(supabase, []);
  const params = useSearchParams();
  const today = localDate(timeZone);
  const paramDate = params.get("date");
  const [date, setDate] = useState(() => (paramDate && DATE_PATTERN.test(paramDate) && paramDate <= today ? paramDate : today));
  const [logs, setLogs] = useState<Log[]>([]);
  const [intakeGoal, setIntakeGoal] = useState<number | null>(null);
  const [activityGoal, setActivityGoal] = useState<number | null>(null);
  const [previousCount, setPreviousCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<Log | null>(null);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    const [goalsResult, logsResult, previousResult] = await Promise.all([
      db.from("goal_versions").select("kind,value").lte("starts_at", date).or(`ends_at.is.null,ends_at.gt.${date}`),
      db.from("food_logs").select(SELECT).eq("local_date", date).order("consumed_at"),
      db.from("food_logs").select("id", { count: "exact", head: true }).eq("local_date", shiftDate(date, -1)),
    ]);
    if (goalsResult.error || logsResult.error) {
      setStatus("error");
      return;
    }
    const goals = (goalsResult.data ?? []) as { kind: string; value: number }[];
    const find = (kind: string) => {
      const row = goals.find((goal) => goal.kind === kind);
      return row ? Number(row.value) : null;
    };
    setIntakeGoal(find("intake_kcal"));
    setActivityGoal(find("activity_kcal"));
    setLogs((logsResult.data ?? []) as unknown as Log[]);
    setPreviousCount(previousResult.count ?? 0);
    setStatus("ready");
  }, [db, date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const reload = () => void load();
    window.addEventListener("ahara:synced", reload);
    return () => window.removeEventListener("ahara:synced", reload);
  }, [load]);

  const { pending, start: startRemove, undo } = useUndoableDelete<Log>(async (log) => {
    try {
      await apiFetch(`/api/logs?id=${encodeURIComponent(log.id)}`, { method: "DELETE" });
    } catch {
      setError("That entry couldn’t be removed.");
      void load();
    }
  });

  function remove(log: Log) {
    setEditing(null);
    setLogs((old) => old.filter((item) => item.id !== log.id));
    startRemove(log);
  }
  function restore() {
    const item = undo();
    if (item) setLogs((old) => [...old, item].sort((a, b) => a.consumed_at.localeCompare(b.consumed_at)));
  }

  async function copyPrevious() {
    setCopying(true);
    setError("");
    try {
      await apiFetch("/api/logs/copy-yesterday", { method: "POST", json: { fromDate: shiftDate(date, -1), toDate: date } });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not copy those entries.");
    } finally {
      setCopying(false);
    }
  }

  const kcal = sumKnown(logs.map((log) => finalKcal(log.food_log_nutrients)));
  const view = describeIntake(kcal, intakeGoal);
  const fraction = intakeGoal && kcal.total !== null ? kcal.total / intakeGoal : 0;
  const ringLabel = kcal.total === null ? "?" : `${kcal.partial ? "≥" : ""}${Math.round(kcal.total).toLocaleString("en-IN")}`;
  const ringSub = kcal.total === null ? "unknown" : intakeGoal ? `of ${intakeGoal.toLocaleString("en-IN")} kcal` : "kcal";
  const macro = (key: "proteinG" | "carbsG" | "fatG") => sumKnown(logs.map((log) => finalValue(log.food_log_nutrients, key)));
  const macroText = (total: ReturnType<typeof sumKnown>) => (total.total === null ? "—" : `${total.partial ? "≥ " : ""}${Math.round(total.total)} g`);

  const stripEnd = shiftDate(date, 3) < today ? shiftDate(date, 3) : today;
  const stripDays = Array.from({ length: 7 }, (_, index) => shiftDate(stripEnd, index - 6));

  return (
    <>
      <PageHeader eyebrow="Daily dashboard" title={date === today ? "Today" : date} action={<Link className="button primary" href={`/add?date=${date}`}>Add food</Link>} />

      <div className="tx-strip" role="group" aria-label="Choose a day">
        {stripDays.map((day) => (
          <button key={day} className={`tx-day ${day === date ? "selected" : ""}`} aria-pressed={day === date} onClick={() => setDate(day)}>
            <small>{weekday(day)}</small>
            <b>{Number(day.slice(8))}</b>
          </button>
        ))}
      </div>
      <div className="date-row">
        <label htmlFor="today-date">Jump to a date</label>
        <input id="today-date" type="date" value={date} max={today} onChange={(event) => event.target.value && setDate(event.target.value)} />
      </div>

      {status === "loading" ? (
        <div className="skeleton-stack"><div /><div /><div /></div>
      ) : status === "error" ? (
        <CapabilityState title="This day could not load" detail="Your diary was not changed. Check your connection and try again." action="Try again" href="/today" />
      ) : (
        <>
          <section className="tx-summary">
            <IntakeRing fraction={fraction} state={view.state} label={ringLabel} sublabel={ringSub} />
            <div>
              <p className="eyebrow">Intake</p>
              <p className="tx-status"><span aria-hidden="true">{view.icon} </span>{view.text}</p>
              {kcal.partial && <p className="tx-status">{kcal.unknownCount} entr{kcal.unknownCount === 1 ? "y has" : "ies have"} unknown calories.</p>}
              {activityGoal !== null && <p className="tx-status">Activity target: {activityGoal} kcal</p>}
            </div>
          </section>

          <section className="tx-macros" aria-label="Macros">
            <div className="tx-macro"><span>Protein</span><strong>{macroText(macro("proteinG"))}</strong></div>
            <div className="tx-macro"><span>Carbs</span><strong>{macroText(macro("carbsG"))}</strong></div>
            <div className="tx-macro"><span>Fat</span><strong>{macroText(macro("fatG"))}</strong></div>
          </section>

          {intakeGoal === null && activityGoal === null && (
            <section className="state-card">
              <h2>Set your daily targets</h2>
              <p>Add a food target and an activity target. Both are optional and personal.</p>
              <Link className="button secondary" href="/goals">Set targets</Link>
            </section>
          )}
          {error && <p className="inline-error" role="alert">{error}</p>}

          {logs.length === 0 && previousCount > 0 && (
            <button className="button secondary" disabled={copying} onClick={() => void copyPrevious()}>
              {copying ? "Copying…" : `Copy ${previousCount} entr${previousCount === 1 ? "y" : "ies"} from ${shiftDate(date, -1)}`}
            </button>
          )}

          {MEALS.map((meal) => {
            const entries = logs.filter((log) => log.meal_type === meal);
            const subtotal = sumKnown(entries.map((log) => finalKcal(log.food_log_nutrients)));
            return (
              <section className="tx-meal" key={meal}>
                <div className="tx-meal-head">
                  <div>
                    <h3>{meal}</h3>
                    <small>{entries.length === 0 ? "Nothing yet" : kcalText(subtotal)}</small>
                  </div>
                  <Link className="tx-add" href={`/add?meal=${meal}&date=${date}`} aria-label={`Add food to ${meal}`}>+</Link>
                </div>
                {entries.map((log) => {
                  const entryKcal = finalKcal(log.food_log_nutrients);
                  return (
                    <button className="tx-entry" key={log.id} onClick={() => setEditing(log)}>
                      <span><b>{log.name_snapshot}</b><small>{quantityText(log)}</small></span>
                      <strong>{entryKcal === null ? "Calories unknown" : `${Math.round(entryKcal)} kcal`}</strong>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </>
      )}

      {editing && (
        <EditEntrySheet
          key={editing.id}
          log={editing}
          timeZone={timeZone}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
          onRemove={() => remove(editing)}
        />
      )}
      {pending && (
        <div className="tx-undo" role="status">
          <span>{pending.name_snapshot} removed.</span>
          <button className="button secondary" onClick={restore}>Undo</button>
        </div>
      )}
    </>
  );
}
