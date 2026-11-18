"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { MyVersionsSection } from "@/components/food/MyVersionsSection";
import { OwnFoodForm, type OwnFoodRecord } from "@/components/food/OwnFoodForm";
import { apiFetch } from "@/lib/api";
import { defaultKcalLabel } from "@/lib/units";

export default function MyFoodsPage() {
  const [foods, setFoods] = useState<OwnFoodRecord[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ foods: OwnFoodRecord[] }>("/api/foods/mine");
      setFoods(data.foods);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function archive(food: OwnFoodRecord) {
    if (archiving !== food.id) {
      setArchiving(food.id);
      return;
    }
    try {
      await apiFetch(`/api/foods?id=${encodeURIComponent(food.id)}`, { method: "DELETE" });
      setMessage(`${food.canonical_name} was archived. Past diary entries keep their numbers.`);
      setArchiving(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That food couldn’t be archived.");
    }
  }

  return (
    <>
      <PageHeader eyebrow="Your own foods" title="My foods" description="Foods you added yourself. Changing one never changes past diary entries." action={<Link className="button primary" href="/add">Add food</Link>} />
      {message && <p className="success-note" role="status">{message}</p>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      {state === "loading" ? (
        <div className="skeleton-stack"><div /><div /></div>
      ) : state === "error" ? (
        <section className="state-card"><h2>Your foods didn’t load</h2><p>Check your connection and try again.</p><button className="button primary" onClick={() => void load()}>Try again</button></section>
      ) : foods.length === 0 ? (
        <section className="state-card">
          <h2>No foods of your own yet</h2>
          <p>When you can’t find a dish, add it from the Add screen and it will appear here.</p>
          <Link className="button primary" href="/add">Add food</Link>
        </section>
      ) : (
        foods.map((food) =>
          editingId === food.id ? (
            <OwnFoodForm
              key={food.id}
              food={food}
              onCancel={() => setEditingId(null)}
              onSaved={() => { setEditingId(null); setMessage("Saved."); void load(); }}
            />
          ) : (
            <section className="tx-meal" key={food.id}>
              <div className="tx-meal-head">
                <div>
                  <h3>{food.canonical_name}</h3>
                  <small>{defaultKcalLabel(food)}</small>
                </div>
                <div className="install-actions">
                  <button className="button secondary" onClick={() => { setMessage(""); setEditingId(food.id); }}>Edit</button>
                  <button className="button secondary" onClick={() => void archive(food)}>{archiving === food.id ? "Tap again to archive" : "Archive"}</button>
                </div>
              </div>
            </section>
          ),
        )
      )}
      <MyVersionsSection />
    </>
  );
}
