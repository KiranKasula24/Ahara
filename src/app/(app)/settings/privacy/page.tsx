"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { SignOutButton } from "@/components/app-shell/SignOutButton";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function PrivacySettingsPage() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/account", { method: "DELETE" });
      await supabase().auth.signOut();
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your account could not be deleted.");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Settings" title="Privacy & data" description="Your personal data stays separate from the shared food catalogue." />
      <section className="form-card">
        <h2>Your data</h2>
        <p className="muted">Download everything Ahara holds about you as a JSON file.</p>
        <Link className="button secondary" href="/export">Export my data</Link>
      </section>
      <section className="form-card">
        <h2>Sign out</h2>
        <SignOutButton />
      </section>
      <section className="form-card">
        <h2>Delete account</h2>
        <p className="muted">This permanently deletes your account and all your entries. It cannot be undone. Type “delete” to confirm.</p>
        <label>Confirmation
          <input value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" />
        </label>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button className="button secondary" disabled={busy || confirm.trim().toLowerCase() !== "delete"} onClick={() => void deleteAccount()}>
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </section>
    </>
  );
}
