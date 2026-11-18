"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";

type Goal = { kind: string; value: number };

function parse(text: string): number | null | "invalid" {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 && value <= 10000 ? value : "invalid";
}

export function GoalSetupForm({ compact = true }: { compact?: boolean }) {
  const [intake, setIntake] = useState("");
  const [activity, setActivity] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch<{ goals: Goal[] }>("/api/goals")
      .then(({ goals }) => {
        setIntake(String(goals.find((goal) => goal.kind === "intake_kcal")?.value ?? ""));
        setActivity(String(goals.find((goal) => goal.kind === "activity_kcal")?.value ?? ""));
      })
      .catch(() => {});
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    const intakeKcal = parse(intake);
    const activityKcal = parse(activity);
    if (intakeKcal === "invalid" || activityKcal === "invalid") {
      setState("error");
      setMessage("Enter a number between 1 and 10,000, or leave the field empty.");
      return;
    }
    if (intakeKcal === null && activityKcal === null) {
      setState("error");
      setMessage("Enter at least one target to save.");
      return;
    }
    setState("saving");
    try {
      await apiFetch("/api/goals", { method: "POST", json: { intakeKcal, activityKcal } });
      setState("saved");
      setMessage("Your targets were saved. Earlier days keep the target they had.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Your targets could not be saved.");
    }
  }

  return (
    <form className={compact ? "form-card goal-form compact" : "form-card goal-form"} onSubmit={save}>
      <div>
        <p className="eyebrow">Personal targets</p>
        <h2>Your daily targets</h2>
        <p className="muted">Both are optional. They are personal targets, not medical advice.</p>
      </div>
      <label>Daily food-energy target (kcal)
        <input value={intake} onChange={(event) => setIntake(event.target.value)} inputMode="numeric" placeholder="For example, 2000" />
      </label>
      <label>Daily activity-energy target (kcal)
        <input value={activity} onChange={(event) => setActivity(event.target.value)} inputMode="numeric" placeholder="For example, 300" />
      </label>
      <p className="goal-note">Ahara never subtracts activity from food or shows “net calories”.</p>
      {state === "error" && <p className="inline-error" role="alert">{message}</p>}
      {state === "saved" && <p className="success-note" role="status">{message}</p>}
      <button className="button primary full-width" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save targets"}</button>
    </form>
  );
}
