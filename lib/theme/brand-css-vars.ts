import type { OrganizationBranding } from "@/types/domain";

/** Accepts #rgb or #rrggbb. Returns null for anything else. */
export function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const v = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Pick white or navy text for legibility on an arbitrary brand color. */
export function readableForeground(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const L = relativeLuminance(rgb);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastNavy = (L + 0.05) / 0.0165; // navy #0f1b3d ≈ L 0.0115
  return contrastWhite >= 3 || contrastWhite >= contrastNavy ? "#ffffff" : "#0f1b3d";
}

export type BrandCssVars = Record<`--${string}`, string>;

/** Map tenant branding onto the CSS custom properties consumed by globals.css. */
export function brandCssVars(branding: OrganizationBranding): BrandCssVars {
  const vars: BrandCssVars = {
    "--brand-primary": branding.primaryColor,
    "--brand-primary-foreground": readableForeground(branding.primaryColor),
    "--brand-secondary": branding.secondaryColor,
    "--brand-secondary-foreground": readableForeground(branding.secondaryColor),
    "--brand-accent": branding.accentColor,
    "--brand-accent-foreground": readableForeground(branding.accentColor),
  };
  if (branding.successColor) vars["--brand-success"] = branding.successColor;
  if (branding.warningColor) vars["--brand-warning"] = branding.warningColor;
  if (branding.dangerColor) vars["--brand-danger"] = branding.dangerColor;
  return vars;
}
