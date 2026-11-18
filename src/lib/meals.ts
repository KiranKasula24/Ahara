export const MEALS = ["breakfast", "lunch", "snack", "dinner"] as const;
export type Meal = (typeof MEALS)[number];

export function mealForHour(hour: number): Meal {
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 19) return "snack";
  return "dinner";
}
