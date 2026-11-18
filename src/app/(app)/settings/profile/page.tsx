"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { useSession } from "@/components/app-shell/SessionProvider";
import { DEFAULT_TIME_ZONE, isValidTimeZone } from "@/lib/dates";
import { supabase } from "@/lib/supabase";

const COMMON_ZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];

export default function ProfileSettingsPage() {
  const session = useSession();
  const router = useRouter();
  const [name, setName] = useState(session?.displayName ?? "");
  const [timeZone, setTimeZone] = useState(session?.timeZone ?? DEFAULT_TIME_ZONE);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    const zone = timeZone.trim();
    if (name.trim().length > 60) {
      setState("error");
      setMessage("Keep your name to 60 characters or fewer.");
      return;
    }
    if (!isValidTimeZone(zone)) {
      setState("error");
      setMessage("That time zone was not recognised. Pick one from the list, such as Asia/Kolkata.");
      return;
    }
    setState("saving");
    const { error } = await supabase()
      .from("profiles")
      .upsert({ id: session.userId, display_name: name.trim() || null, timezone: zone }, { onConflict: "id" });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("saved");
    setMessage("Profile saved.");
    router.refresh();
  }

  return (
    <>
      <PageHeader eyebrow="Settings" title="Profile" description="Your time zone decides which day a new entry belongs to." />
      <form className="form-card" onSubmit={save}>
        <label>Email
          <input value={session?.email ?? ""} readOnly aria-readonly="true" />
        </label>
        <label>Display name
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Optional" />
        </label>
        <label>Time zone
          <input list="time-zones" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} />
          <datalist id="time-zones">{COMMON_ZONES.map((zone) => <option key={zone} value={zone} />)}</datalist>
        </label>
        <p className="muted">Changing it affects new entries only. Past entries keep the day they were saved on.</p>
        {state === "error" && <p className="inline-error" role="alert">{message}</p>}
        {state === "saved" && <p className="success-note" role="status">{message}</p>}
        <button className="button primary" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save profile"}</button>
      </form>
    </>
  );
}
