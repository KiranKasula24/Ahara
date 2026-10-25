export function luminance(hex: string): number {
  const rgb = hex.match(/\w\w/g);
  if (!rgb || rgb.length !== 3) throw new Error(`Expected a six-digit hex colour, got ${hex}`);
  const channels = rgb.map((value) => parseInt(value, 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
export function contrastRatio(foreground: string, background: string): number { const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a); return (light + 0.05) / (dark + 0.05); }
