/** Ahara colour tokens. globals.css mirrors these values as CSS variables. */
export const dark = {
  background: "#14110d", surface1: "#1a1612", surface2: "#221d17", surface3: "#2c261f",
  border: "#383026", borderStrong: "#4d4336", textPrimary: "#f6efe4", textSecondary: "#b8ab99", textMuted: "#8f8372",
  brand: "#f2b02e", brandStrong: "#f2b02e", brandText: "#f7c557", brandSoft: "#34270e", onBrand: "#1b1306",
  positive: "#7bd29b", positiveSoft: "#17301f", negative: "#ff8b77", negativeSoft: "#3a1e19",
} as const;

export const light = {
  background: "#faf5eb", surface1: "#fffdf8", surface2: "#f4ecdd", surface3: "#ebdfca",
  border: "#e0d3bb", borderStrong: "#c9b999", textPrimary: "#211b14", textSecondary: "#5f5546", textMuted: "#8a7e6c",
  brand: "#f2b02e", brandStrong: "#a86f00", brandText: "#7a4f00", brandSoft: "#fbe8be", onBrand: "#1b1306",
  positive: "#17653a", positiveSoft: "#dcefd9", negative: "#b3341f", negativeSoft: "#f8ddd6",
} as const;

/** Kept for existing imports. Dark is the default theme. */
export const tokens = dark;
