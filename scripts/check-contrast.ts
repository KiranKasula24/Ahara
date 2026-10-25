import { tokens } from "../src/design/tokens";
import { contrastRatio } from "../src/lib/contrast";
const checks: [string, string, string, number][] = [["primary/surface-1", tokens.textPrimary, tokens.surface1, 4.5], ["primary/surface-2", tokens.textPrimary, tokens.surface2, 4.5], ["primary/surface-3", tokens.textPrimary, tokens.surface3, 4.5], ["secondary/surface-2", tokens.textSecondary, tokens.surface2, 4.5], ["orange/surface-2", tokens.orangePrimary, tokens.surface2, 4.5], ["on-orange/orange", tokens.onOrange, tokens.orangePrimary, 4.5]];
let failed = false;
for (const [name, fg, bg, threshold] of checks) { const value = contrastRatio(fg, bg); console.log(`${name}: ${value.toFixed(2)}:1 (minimum ${threshold})`); if (value < threshold) failed = true; }
if (failed) process.exitCode = 1;
