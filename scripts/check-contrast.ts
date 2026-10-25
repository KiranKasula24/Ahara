const tokens = {
  background: "#090909", surface1: "#111111", surface2: "#171717", surface3: "#222222",
  primary: "#f5f5f5", secondary: "#a1a1aa", orange: "#ff6a00", onOrange: "#090909"
};
function luminance(hex: string) { const rgb = hex.match(/\w\w/g)!.map(x => parseInt(x, 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; }
function ratio(a: string, b: string) { const [x, y] = [luminance(a), luminance(b)].sort((a, b) => b - a); return (x + .05) / (y + .05); }
const checks: [string, string, string, number][] = [["primary/surface-1", tokens.primary, tokens.surface1, 4.5], ["primary/surface-2", tokens.primary, tokens.surface2, 4.5], ["primary/surface-3", tokens.primary, tokens.surface3, 4.5], ["secondary/surface-2", tokens.secondary, tokens.surface2, 4.5], ["orange/surface-2", tokens.orange, tokens.surface2, 4.5], ["on-orange/orange", tokens.onOrange, tokens.orange, 4.5]];
let failed = false;
for (const [name, fg, bg, threshold] of checks) { const value = ratio(fg, bg); console.log(`${name}: ${value.toFixed(2)}:1 (minimum ${threshold})`); if (value < threshold) failed = true; }
if (failed) process.exitCode = 1;
