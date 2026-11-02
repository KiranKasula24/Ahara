"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState, SignInRequired } from "@/components/RouteStates";
import { supabase } from "@/lib/supabase";

type FoodLog = { id: string; name_snapshot: string; quantity: number; unit: string; meal_type: string; food_log_nutrients: { final_totals: { kcal: number | null } }[] };
const mealOrder = ["breakfast", "lunch", "dinner", "snack"];
const localToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const previewLogs: FoodLog[] = [
  { id: "demo-poha", name_snapshot: "Poha", quantity: 1, unit: "serving", meal_type: "breakfast", food_log_nutrients: [{ final_totals: { kcal: 260 } }] },
  { id: "demo-dosa", name_snapshot: "Plain dosa", quantity: 2, unit: "pieces", meal_type: "lunch", food_log_nutrients: [{ final_totals: { kcal: 340 } }] },
];

export function TodayDashboard() {
  const db = useMemo(supabase, []); const search = useSearchParams(); const preview = search.get("preview") === "1";
  const [user, setUser] = useState<{ id: string } | null>(null); const [date, setDate] = useState(localToday()); const [logs, setLogs] = useState<FoodLog[]>([]); const [goal, setGoal] = useState<number | null>(null); const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => { db.auth.getUser().then(({ data }) => setUser(data.user)); const { data } = db.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null)); return () => data.subscription.unsubscribe(); }, [db]);
  useEffect(() => { if (!user || preview) return; void load(); }, [user, date, preview]);
  async function load() { setStatus("loading"); const [goalResult, logsResult] = await Promise.all([db.from("goal_versions").select("value").eq("kind", "intake_kcal").is("ends_at", null).maybeSingle(), db.from("food_logs").select("id,name_snapshot,quantity,unit,meal_type,food_log_nutrients(final_totals)").eq("local_date", date).order("created_at")]); if (goalResult.error || logsResult.error) { setStatus("error"); return; } setGoal(goalResult.data ? Number(goalResult.data.value) : null); setLogs((logsResult.data ?? []) as FoodLog[]); setStatus("ready"); }
  if (!user && !preview) return <><PageHeader eyebrow="Daily dashboard" title="Today" description="Your private food diary, one day at a time." /><SignInRequired /></>;
  const shownLogs = preview ? previewLogs : logs; const shownGoal = preview ? 1900 : goal; const total = shownLogs.reduce((sum, log) => sum + (log.food_log_nutrients[0]?.final_totals.kcal ?? 0), 0); const progress = shownGoal ? Math.min(100, Math.round((total / shownGoal) * 100)) : 0;
  return <><PageHeader eyebrow={preview ? "Demo data — not saved" : "Daily dashboard"} title="Today" description="Review your day and choose the next small action." action={<Link className="button primary" href="/add">Add food</Link>} /><div className="date-row"><label htmlFor="today-date">Date</label><input id="today-date" type="date" value={date} max={localToday()} onChange={(event) => setDate(event.target.value)} /></div>{status === "loading" && !preview ? <div className="skeleton-stack"><div /><div /><div /></div> : status === "error" ? <CapabilityState title="Today could not load" detail="Your diary was not changed. Check your connection and try again." action="Try again" href="/today" /> : <><section className="summary-card"><div><p className="eyebrow">Today&apos;s intake</p><p className="big-number">{Math.round(total)} <span>kcal</span></p><p>{shownGoal === null ? "No personal target is set." : total <= shownGoal ? `${Math.round(shownGoal - total)} kcal remaining` : `${Math.round(total - shownGoal)} kcal above your target`}</p></div><div className="progress-wrap"><div className="progress-ring" style={{ "--progress": `${progress}%` } as React.CSSProperties}><span>{shownGoal ? `${progress}%` : "—"}</span></div><span className="muted">{shownGoal ? `${shownGoal} kcal target` : "Target unavailable"}</span></div></section><section className="content-section"><div className="section-heading"><h2>Meals</h2><Link href="/log">View diary</Link></div>{shownLogs.length === 0 ? <CapabilityState title="Nothing logged yet" detail="Add your first food when you are ready." href="/add" action="Add food" /> : mealOrder.map((meal) => { const entries = shownLogs.filter((log) => log.meal_type === meal); if (!entries.length) return null; return <section className="meal-card" key={meal}><h3>{meal}</h3>{entries.map((log) => <div className="food-row" key={log.id}><span><b>{log.name_snapshot}</b><small>{log.quantity} {log.unit}</small></span><strong>{Math.round(log.food_log_nutrients[0]?.final_totals.kcal ?? 0)} kcal</strong></div>)}</section>; })}</section><section className="quick-actions"><Link href="/add">＋ Add food</Link><Link href="/activity">↗ Log activity</Link><Link href="/insights">⌁ View insights</Link></section></>}</>;
}
