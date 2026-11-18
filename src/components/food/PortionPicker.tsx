"use client";

import { calculateAdjusted, type Adjustment } from "@/lib/nutrition";
import {
  availableUnits, formatQuantity, minQuantity, parseQuantity, previewPortion, quantityChips, quantityStep, servingNameFor,
  type FoodSummary, type PortionUnit,
} from "@/lib/units";

type Props = {
  food: FoodSummary;
  unit: PortionUnit;
  amount: string;
  adjustments?: Adjustment[];
  onUnitChange: (unit: PortionUnit) => void;
  onAmountChange: (amount: string) => void;
};

export function PortionPicker({ food, unit, amount, adjustments, onUnitChange, onAmountChange }: Props) {
  const units = availableUnits(food);
  const quantity = parseQuantity(amount);
  const base = quantity ? previewPortion(food, unit, quantity) : null;
  const shown = base?.ok ? (adjustments?.length ? calculateAdjusted(base.nutrients, quantity as number, adjustments).totals : base.nutrients) : null;

  function nudge(direction: 1 | -1) {
    const current = parseQuantity(amount) ?? 0;
    onAmountChange(String(Math.max(minQuantity(unit), Math.round((current + direction * quantityStep(unit)) * 100) / 100)));
  }

  if (units.length === 0) return <p className="nutrition-note">This food has no usable nutrition data, so it can’t be logged.</p>;

  return (
    <>
      {units.length > 1 && (
        <div className="ax-chips" role="group" aria-label="Unit">
          {units.map((option) => (
            <button
              key={option}
              className={`ax-chip ${unit === option ? "selected" : ""}`}
              aria-pressed={unit === option}
              onClick={() => {
                onUnitChange(option);
                onAmountChange(option === "g" ? "100" : "1");
              }}
            >
              {option === "g" ? "grams" : servingNameFor(food)}
            </button>
          ))}
        </div>
      )}
      <fieldset>
        <legend>{unit === "g" ? "Amount (g)" : `How many ${servingNameFor(food)}?`}</legend>
        <div className="ax-chips">
          {quantityChips(unit).map((value) => (
            <button key={value} className={`ax-chip ${quantity === value ? "selected" : ""}`} onClick={() => onAmountChange(String(value))}>
              {unit === "g" ? `${value} g` : formatQuantity(value)}
            </button>
          ))}
        </div>
        <div className="quantity-stepper">
          <button onClick={() => nudge(-1)} aria-label="Decrease amount">−</button>
          <input value={amount} inputMode="decimal" onChange={(event) => onAmountChange(event.target.value)} aria-label="Amount" />
          <button onClick={() => nudge(1)} aria-label="Increase amount">+</button>
        </div>
      </fieldset>
      {shown ? (
        <section className="nutrition-preview" aria-live="polite">
          <h3>Nutrition for this portion{adjustments?.length ? " (with your version)" : ""}</h3>
          <div className="nutrition-grid">
            {([["Calories", shown.kcal, "kcal"], ["Protein", shown.proteinG, "g"], ["Carbs", shown.carbsG, "g"], ["Fat", shown.fatG, "g"]] as const).map(([name, value, suffix]) => (
              <div key={name}><span>{name}</span><strong>{value === null ? "—" : `${Math.round(value * 10) / 10}${suffix}`}</strong></div>
            ))}
          </div>
          {shown.kcal === null && <p className="muted">Calories aren’t available for this food. It is logged as unknown, not zero.</p>}
        </section>
      ) : (
        <p className="nutrition-note">{quantity ? "Nutrition isn’t available for this amount." : "Enter an amount above zero."}</p>
      )}
    </>
  );
}
