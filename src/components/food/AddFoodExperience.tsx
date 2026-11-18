"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { useSession } from "@/components/app-shell/SessionProvider";
import { BarcodeFlow } from "@/components/food/BarcodeFlow";
import { OwnFoodForm } from "@/components/food/OwnFoodForm";
import { PortionPicker } from "@/components/food/PortionPicker";
import { ApiError, apiFetch } from "@/lib/api";
import { enqueue, removeQueued } from "@/lib/offline-queue";
import { localDate, localTime, zonedDateTimeToInstant } from "@/lib/dates";
import { MEALS, mealForHour, type Meal } from "@/lib/meals";
import type { Adjustment } from "@/lib/nutrition";
import { availableUnits, defaultKcalLabel, formatQuantity, parseQuantity, servingNameFor, type FoodSummary, type PortionUnit } from "@/lib/units";

type Recent = { food: FoodSummary; quantity: number; unit: PortionUnit };
type Quick = { favourites: { food: FoodSummary }[]; recents: Recent[] };
type SearchVersion = { id: string; name: string; adjustments: Adjustment[]; food: FoodSummary };
type Logged = { id: string; name: string; meal: Meal; date: string; warning?: string; queued?: boolean };
const EMPTY_QUICK: Quick = { favourites: [], recents: [] };
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function AddFoodExperience() {
  const session = useSession();
  const params = useSearchParams();
  const timeZone = session?.timeZone ?? "Asia/Kolkata";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSummary[]>([]);
  const [versions, setVersions] = useState<SearchVersion[]>([]);
  const [searching, setSearching] = useState(false);
  const [quick, setQuick] = useState<Quick>(EMPTY_QUICK);
  const [food, setFood] = useState<FoodSummary | null>(null);
  const [version, setVersion] = useState<SearchVersion | null>(null);
  const [unit, setUnit] = useState<PortionUnit>("serving");
  const [amount, setAmount] = useState("1");
  const [meal, setMeal] = useState<Meal>("breakfast");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [showWhen, setShowWhen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastLogged, setLastLogged] = useState<Logged | null>(null);
  const [own, setOwn] = useState(false);
  const [scanning, setScanning] = useState(false);

  const today = date ? localDate(timeZone) : "";

  useEffect(() => {
    const now = new Date();
    const todayDate = localDate(timeZone, now);
    const dateParam = params.get("date");
    const mealParam = params.get("meal");
    const useParamDate = Boolean(dateParam && DATE_PATTERN.test(dateParam) && dateParam <= todayDate);
    setDate(useParamDate ? (dateParam as string) : todayDate);
    setTime(localTime(timeZone, now));
    setMeal(MEALS.includes(mealParam as Meal) ? (mealParam as Meal) : mealForHour(Number(localTime(timeZone, now).slice(0, 2))));
  }, [timeZone, params]);

  useEffect(() => {
    apiFetch<Quick>("/api/foods/quick").then(setQuick).catch(() => setQuick(EMPTY_QUICK));
  }, [lastLogged, own]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setVersions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const data = await apiFetch<{ foods: FoodSummary[]; versions?: SearchVersion[] }>(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        setResults(data.foods);
        setVersions(data.versions ?? []);
      } catch {
        if (!controller.signal.aborted) setError("We couldn’t search right now. Please try again.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const favouriteIds = new Set(quick.favourites.map((item) => item.food.id));

  function choose(next: FoodSummary, preset?: { unit: PortionUnit; quantity: number }, chosenVersion?: SearchVersion) {
    const units = availableUnits(next);
    const usePreset = preset && units.includes(preset.unit);
    const startUnit = usePreset ? preset.unit : units[0] ?? "serving";
    setFood(next);
    setVersion(chosenVersion ?? null);
    setUnit(startUnit);
    setAmount(String(usePreset ? preset.quantity : startUnit === "g" ? 100 : 1));
    setError("");
    setLastLogged(null);
  }


  async function logEntry(target: FoodSummary, logUnit: PortionUnit, quantity: number, withVersion?: SearchVersion | null): Promise<boolean> {     if (!date || !time) return false;     setSaving(true);     setError("");     const id = crypto.randomUUID();     const payload = {       id, foodId: target.id, quantity, unit: logUnit, mealType: meal,       consumedAt: zonedDateTimeToInstant(date, time, timeZone).toISOString(),     };     try {       await apiFetch("/api/logs", { method: "POST", json: payload });       let warning: string | undefined;       if (withVersion) {         try {           await apiFetch("/api/logs/adjustments", { method: "POST", json: { logId: id, adjustments: withVersion.adjustments } });         } catch {           warning = "Logged, but your version’s changes couldn’t be applied. Open the entry from Today to adjust it.";         }       }       setLastLogged({ id, name: withVersion ? withVersion.name : target.canonical_name, meal, date, warning });       return true;     } catch (caught) {       const noAnswer = !(caught instanceof ApiError) || !navigator.onLine;       if (noAnswer && withVersion) {         setError("You’re offline. A saved version needs a connection to apply its changes. Your choices are still here.");         return false;       }       if (noAnswer && session?.userId) {         const kept = enqueue({ userId: session.userId, name: target.canonical_name, queuedAt: new Date().toISOString(), payload });         if (kept) {           setLastLogged({ id, name: target.canonical_name, meal, date, queued: true });           return true;         }         setError("You’re offline and this phone couldn’t keep the entry. Try again when you’re back online.");         return false;       }       setError(caught instanceof Error ? caught.message : "That entry couldn’t be saved. Your choices are still here.");       return false;     } finally {       setSaving(false);     }   }
  async function saveFromSheet() {
    const quantity = parseQuantity(amount);
    if (!food || quantity === null) return;
    if (await logEntry(food, unit, quantity, version)) {
      setFood(null);
      setVersion(null);
      setQuery("");
    }
  }


  async function undo() {
    if (!lastLogged) return;     if (lastLogged.queued) {       removeQueued(lastLogged.id);       setLastLogged(null);       return;     }     try {       await apiFetch(`/api/logs?id=${encodeURIComponent(lastLogged.id)}`, { method: "DELETE" });       setLastLogged(null);     } catch {       setError("That entry couldn’t be removed. You can remove it from Today.");     }   }
  async function toggleFavourite(target: FoodSummary) {
    try {
      await apiFetch("/api/favourites", { method: "POST", json: { foodId: target.id, favourite: !favouriteIds.has(target.id) } });
      setQuick(await apiFetch<Quick>("/api/foods/quick"));
    } catch {
      setError("That favourite couldn’t be saved.");
    }
  }

  const whenBar = (
    <section className="ax-when" aria-label="When did you have it?">
      <div className="ax-chips">
        {MEALS.map((item) => (
          <button key={item} className={`ax-chip ${meal === item ? "selected" : ""}`} aria-pressed={meal === item} onClick={() => setMeal(item)}>{item}</button>
        ))}
      </div>
      <p className="muted">
        {date === today ? "Today" : date} at {time}{" "}
        <button className="text-link" onClick={() => setShowWhen(!showWhen)}>{showWhen ? "Done" : "Change date or time"}</button>
      </p>
      {showWhen && (
        <div className="ax-when-fields">
          <label>Date<input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} /></label>
          <label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        </div>
      )}
    </section>
  );

  if (own) {
    return (
      <>
        <PageHeader eyebrow="Your own food" title="Add a food that isn’t listed" description="Add what you know. Anything you leave blank stays unknown." />
        <OwnFoodForm initialName={query.trim()} onCancel={() => setOwn(false)} onSaved={(saved) => { setOwn(false); choose(saved); }} />
      </>
    );
  }

  if (food) {
    const quantity = parseQuantity(amount);
    const favourite = favouriteIds.has(food.id);
    return (
      <>
        <PageHeader eyebrow="Food diary" title="How much?" />
        <section className="portion-editor">
          <button className="text-link" onClick={() => { setFood(null); setVersion(null); }}>← Change food</button>
          <div className="selected-food-heading">
            <div>
              <p className="eyebrow">{version ? "My version" : "Selected food"}</p>
              <h2>{version ? version.name : food.canonical_name}</h2>
              {version && (
                <p className="muted">
                  Based on {food.canonical_name}, with your saved changes.{" "}
                  <button className="text-link" onClick={() => setVersion(null)}>Use without them</button>
                </p>
              )}
              {food.match_quality === "approximate" && <p className="ax-note">Closest match, not the same dish.</p>}
            </div>
            <button className="favourite-button" aria-pressed={favourite} onClick={() => void toggleFavourite(food)}>{favourite ? "★ Saved" : "☆ Save"}</button>
          </div>
          <PortionPicker food={food} unit={unit} amount={amount} adjustments={version?.adjustments} onUnitChange={setUnit} onAmountChange={setAmount} />
          {availableUnits(food).length > 0 && (
            <>
              {whenBar}
              {error && <p className="inline-error" role="alert">{error}</p>}
              <button className="button primary full-width" disabled={saving || quantity === null || !date || !time} onClick={() => void saveFromSheet()}>
                {saving ? "Adding…" : `Add to ${meal}`}
              </button>
            </>
          )}
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Food diary" title="What did you eat?" description="Search dishes or ingredients, scan a pack, then choose the portion." />
User responded: The build plan ends at P10, so there is no P11. P10 is the last build phase. It is the largest one, so it's in two parts, **A: offline and updates** and **B: export, delete and release checks**. The release checklist at the end covers any "P11" hardening.  None of this has been run, and I'm assuming two things about your repo from earlier phases: - `ApiError` is exported from `@/lib/api`, with a `status` field. - `PwaRegister` is mounted once in the root layout.  I can't see the root layout or `next.config.ts` from here. If a check below doesn't behave as described, send me the error text.  ## What offline can and can't do - **Works offline:** "Log again" and favourites that are already on screen. The entry is saved on the phone with its id and sent when you're back online. A replay can't create a duplicate because the server already treats the same id as a replay. - **Needs a connection:** search, scanning, My versions and adjustments. When the app is closed and you open it offline, you get a plain "You're offline" page instead of a browser error. - **Not cached:** the service worker caches only that offline page. Caching app pages or Supabase data would risk showing stale numbers, so I left it out on purpose. - **Update notice:** "A new version is ready · Update" appears after you deploy. It only runs in a production build, not `npm run dev`.  # Part A: offline queue, offline page, update notice  **New `src/lib/offline-queue.ts`**
      {error && <p className="inline-error" role="alert">{error}</p>}
      {whenBar}

      <section className="search-panel">
        <label htmlFor="food-search">Search dishes or ingredients</label>
        <div className="search-input">
          <input id="food-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try poha, dosa, idli…" autoComplete="off" />
          <button onClick={() => setQuery("")} aria-label="Clear search">×</button>
        </div>
        <button className="button secondary" onClick={() => setScanning(true)}>Scan a barcode</button>
        <p className="search-status" role="status">{searching ? "Searching…" : query.trim().length >= 2 ? `${results.length + versions.length} options found` : ""}</p>

        {query.trim().length >= 2 ? (
          <>
            {versions.length > 0 && (
              <section className="ax-section">
                <h2>My versions</h2>
                <div className="search-results">
                  {versions.map((item) => (
                    <button className="search-result" key={item.id} onClick={() => choose(item.food, undefined, item)}>
                      <span>
                        <b>{item.name}</b>
                        <small>Based on {item.food.canonical_name} · {item.adjustments.map((adjustment) => adjustment.label).join(", ")}</small>
                      </span>
                      <span aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!searching && !results.length && !versions.length && !error && <p className="muted">We couldn’t find that dish. Try another name, scan the pack, or add your own below.</p>}
            <div className="search-results">
              {results.map((result) => {
                const aliasDiffers = result.matched_alias && result.matched_alias.toLowerCase() !== result.canonical_name.toLowerCase();
                return (
                  <button className="search-result" key={result.id} onClick={() => choose(result)}>
                    <span>
                      <b>{result.canonical_name}</b>
                      <small>{defaultKcalLabel(result)}{result.owner_id ? " · Your food" : ""}</small>
                      {(aliasDiffers || result.match_quality === "approximate") && (
                        <small className="ax-note">
                          {aliasDiffers && `Matched “${result.matched_alias}”`}
                          {aliasDiffers && result.match_quality === "approximate" && " · "}
                          {result.match_quality === "approximate" && "Closest match, not the same dish"}
                        </small>
                      )}
                    </span>
                    <span aria-hidden="true">›</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {quick.recents.length > 0 && (
              <section className="ax-section">
                <h2>Recent</h2>
                {quick.recents.map((item) => (
                  <div className="ax-quick-row" key={item.food.id}>
                    <button className="text-link" onClick={() => choose(item.food, { unit: item.unit, quantity: item.quantity })}>
                      <b>{item.food.canonical_name}</b>
                      <small>Last: {formatQuantity(item.quantity)} {item.unit === "g" ? "g" : servingNameFor(item.food)}</small>
                    </button>
                    <button className="button secondary" disabled={saving || !date} onClick={() => void logEntry(item.food, item.unit, item.quantity)}>Log again</button>
                  </div>
                ))}
              </section>
            )}
            {quick.favourites.length > 0 && (
              <section className="ax-section">
                <h2>Favourites</h2>
                {quick.favourites.map((item) => (
                  <div className="ax-quick-row" key={item.food.id}>
                    <button className="text-link" onClick={() => choose(item.food)}>
                      <b>{item.food.canonical_name}</b>
                      <small>{defaultKcalLabel(item.food)}</small>
                    </button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
        <button className="text-link quiet-link" onClick={() => setOwn(true)}>Add a food that isn’t listed</button>
        <p className="muted"><Link href="/my-foods">Manage my foods</Link></p>
      </section>

      {scanning && <BarcodeFlow onClose={() => setScanning(false)} onFood={(scanned) => { setScanning(false); choose(scanned); }} />}
    </>
  );
}
