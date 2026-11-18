"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { describeChange } from "@/lib/adjustments";
import type { Adjustment } from "@/lib/nutrition";
import { supabase } from "@/lib/supabase";

type Version = { id: string; name: string; base: string; adjustments: Adjustment[] };
type Row = { id: string; name: string; adjustments: Adjustment[]; foods: { canonical_name: string } | { canonical_name: string }[] | null };

export function MyVersionsSection() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase().from("my_versions").select("id,name,adjustments,foods(canonical_name)").order("created_at", { ascending: false });
    setVersions(
      ((data ?? []) as unknown as Row[]).map((row) => {
        const food = Array.isArray(row.foods) ? row.foods[0] : row.foods;
        return { id: row.id, name: row.name, base: food?.canonical_name ?? "a removed food", adjustments: row.adjustments ?? [] };
      }),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(version: Version) {
    if (confirming !== version.id) {
      setConfirming(version.id);
      return;
    }
    try {
      await apiFetch(`/api/versions?id=${encodeURIComponent(version.id)}`, { method: "DELETE" });
      setConfirming(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That version couldn’t be deleted.");
    }
  }

  if (versions.length === 0) return null;
  return (
    <section className="ax-section">
      <h2>My versions</h2>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {versions.map((version) => (
        <div className="tx-meal" key={version.id}>
          <div className="tx-meal-head">
            <div>
              <h3>{version.name}</h3>
              <small>Based on {version.base}: {version.adjustments.map((item) => `${item.label} (${describeChange(item.changes)})`).join("; ")}</small>
            </div>
            <button className="button secondary" onClick={() => void remove(version)}>{confirming === version.id ? "Tap again to delete" : "Delete"}</button>
          </div>
        </div>
      ))}
    </section>
  );
}
