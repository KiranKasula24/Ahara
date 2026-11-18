"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
export function ExportPanel() {
  const [busy, setBusy] = useState<"csv" | "json" | null>(null);
  const [message, setMessage] = useState("");
  async function download(format: "csv" | "json") {
    setBusy(format);
    setMessage("");
    try {
      const { data } = await supabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch(`/api/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error(
          (
            (await response.json().catch(() => null)) as {
              error?: string;
            } | null
          )?.error ?? "The export failed.",
        );
      const blob = await response.blob();
      const name =
        /filename="([^"]+)"/.exec(
          response.headers.get("Content-Disposition") ?? "",
        )?.[1] ?? `ahara-export.${format}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      if (format === "json") {
        const parsed = JSON.parse(await blob.text()) as {
          incomplete?: Record<string, string>;
        };
        setMessage(
          parsed.incomplete
            ? `Downloaded, but some parts couldn’t be read: ${Object.keys(parsed.incomplete).join(", ")}.`
            : "Downloaded.",
        );
      } else {
        setMessage("Downloaded.");
      }
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "The export failed.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="ax-stack">
      {" "}
      <div className="tx-meal">
        {" "}
        <h3>Diary (CSV)</h3>{" "}
        <p className="muted">
          One row per entry, for a spreadsheet. A blank cell means unknown, not
          zero.
        </p>{" "}
        <button
          className="button primary"
          disabled={busy !== null}
          onClick={() => void download("csv")}
        >
          {busy === "csv" ? "Preparing…" : "Download diary"}
        </button>{" "}
      </div>{" "}
      <div className="tx-meal">
        {" "}
        <h3>Everything (JSON)</h3>{" "}
        <p className="muted">
          Your diary with its saved nutrition values and adjustments, your
          foods, versions, goals, steps, workouts and trackers.
        </p>{" "}
        <button
          className="button secondary"
          disabled={busy !== null}
          onClick={() => void download("json")}
        >
          {busy === "json" ? "Preparing…" : "Download everything"}
        </button>{" "}
      </div>{" "}
      {message && (
        <p className="muted" role="status">
          {message}
        </p>
      )}{" "}
    </section>
  );
}
