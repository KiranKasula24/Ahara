import { dark, light } from "../src/design/tokens";
import { contrastRatio } from "../src/lib/contrast";
type Palette = typeof dark;
const checks: [keyof Palette, keyof Palette, number][] = [["textPrimary", "surface1", 4.5], ["textPrimary", "surface2", 4.5], ["textPrimary", "surface3", 4.5], ["textSecondary", "surface2", 4.5], ["brandText", "surface2", 4.5], ["onBrand", "brand", 4.5], ["positive", "positiveSoft", 3], ["negative", "negativeSoft", 3]];
let failed = false;
for (const [themeName, palette] of Object.entries({ dark, light }) as [string, Palette][]) {
  for (const [foreground, background, threshold] of checks) { const value = contrastRatio(palette[foreground], palette[background]); console.log(`${themeName} ${foreground}/${background}: ${value.toFixed(2)}:1 (minimum ${threshold})`); if (value < threshold) failed = true; }
}
if (failed) process.exitCode = 1;
