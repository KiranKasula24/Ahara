import { describe, expect, it } from "vitest";
import { csvCell, logsToCsv } from "./export";
describe("export", () => {
  it("quotes cells and defuses formulas", () => {
    expect(csvCell('Dal, "tadka"')).toBe('"Dal, ""tadka"""');
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(null)).toBe("");
  });
  it("leaves unknown values blank and keeps real zeros", () => {
    const csv = logsToCsv([
      {
        local_date: "2026-11-18",
        meal_type: "lunch",
        name_snapshot: "Test food",
        quantity: 1,
        unit: "serving",
        food_log_nutrients: {
          final_totals: { kcal: 250, proteinG: null, carbsG: 0 },
        },
      },
      {
        local_date: "2026-11-18",
        meal_type: "snack",
        name_snapshot: "Other",
        quantity: 2,
        unit: "serving",
        food_log_nutrients: [{ final_totals: { kcal: null } }],
      },
    ]).split("\n");
    expect(lines(csv)[1]).toBe(
      "2026-11-18,lunch,Test food,1,serving,250,,0,,,",
    );
    expect(lines(csv)[2]).toBe("2026-11-18,snack,Other,2,serving,,,,,,");
  });
});
const lines = (rows: string[]) => rows;
