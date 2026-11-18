"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { ProductForm, type ProductPrefill } from "@/components/food/ProductForm";
import { apiFetch } from "@/lib/api";
import { isValidBarcode, type ParsedProduct } from "@/lib/off";
import type { FoodSummary } from "@/lib/units";

type Lookup =
  | { source: "saved"; food: FoodSummary }
  | { source: "off"; product: ParsedProduct }
  | { source: "none"; barcode: string; unreachable?: boolean };
type Step = "scan" | "looking" | "manual" | "form";

export function BarcodeFlow({ onFood, onClose }: { onFood: (food: FoodSummary) => void; onClose: () => void }) {
  const [step, setStep] = useState<Step>("scan");
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState("");
  const [prefill, setPrefill] = useState<ProductPrefill | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lookup = useCallback(
    async (code: string) => {
      setStep("looking");
      setMessage("");
      try {
        const result = await apiFetch<Lookup>(`/api/products/lookup?barcode=${encodeURIComponent(code)}`);
        if (result.source === "saved") return onFood(result.food);
        if (result.source === "off") setPrefill({ barcode: code, source: "off", product: result.product });
        else {
          setPrefill({ barcode: code, source: "manual" });
          setMessage(result.unreachable ? "Couldn’t reach Open Food Facts. Enter the label values yourself." : "This product isn’t on Open Food Facts. Enter the label values yourself.");
        }
        setStep("form");
      } catch (caught) {
        setMessage(caught instanceof Error ? caught.message : "The lookup failed.");
        setStep("manual"); // never go back to scanning automatically, or the same barcode would be looked up again and again
      }
    },
    [onFood],
  );

  function submitTyped(event: FormEvent) {
    event.preventDefault();
    const code = typed.replace(/\s/g, "");
    if (!isValidBarcode(code)) return setMessage("A barcode is 8 to 14 digits, with no letters.");
    void lookup(code);
  }

  return (
    <div className="ax-sheet-backdrop" onClick={onClose}>
      <div className="ax-sheet" role="dialog" aria-modal="true" aria-label="Scan a barcode" onClick={(event) => event.stopPropagation()}>
        <div className="ax-sheet-head">
          <h2>Scan a barcode</h2>
          <button onClick={onClose} aria-label="Close">×</button>
        </div>

        {step === "scan" && (
          <>
            <BarcodeScanner
              onDetected={(code) => void lookup(code)}
              onUnavailable={(reason) => {
                setMessage(reason);
                setStep("manual");
              }}
            />
            <button className="text-link" onClick={() => setStep("manual")}>Type the barcode instead</button>
          </>
        )}
        {step === "looking" && <p className="muted" role="status">Looking up this product…</p>}
        {step === "manual" && (
          <form className="ax-stack" onSubmit={submitTyped}>
            <label>Barcode number
              <input inputMode="numeric" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Digits under the barcode" autoComplete="off" />
            </label>
            <div className="install-actions">
              <button className="button primary">Look up</button>
              <button type="button" className="button secondary" onClick={() => { setMessage(""); setStep("scan"); }}>Use camera</button>
            </div>
            <button type="button" className="text-link" onClick={() => { setPrefill({ barcode: null, source: "manual" }); setMessage(""); setStep("form"); }}>
              Add a packaged food without a barcode
            </button>
          </form>
        )}
        {step === "form" && prefill && <ProductForm prefill={prefill} onSaved={onFood} onCancel={onClose} />}

        {message && step !== "looking" && <p className={step === "form" ? "muted" : "inline-error"} role="status">{message}</p>}
      </div>
    </div>
  );
}
