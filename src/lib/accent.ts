/**
 * Moteur d’accent.
 *
 * Le thème repose sur trois variables dérivées d’une seule couleur :
 * `--accent` (action), `--accent-soft` (fond teinté) et `--accent-ink`
 * (texte sur ce fond), plus `--on-accent` (texte posé sur l’accent).
 * Les presets sont écrits à la main dans `index.css` ; une couleur libre est
 * dérivée ici, puis corrigée jusqu’à respecter les seuils WCAG AA.
 *
 * Rien n’est deviné : chaque valeur renvoyée est mesurée (ratio de contraste)
 * et peut être affichée à l’utilisateur.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface AccentPalette {
  accent: string;
  accentSoft: string;
  accentInk: string;
  onAccent: string;
}

export interface AccentResult {
  palette: AccentPalette;
  /** contraste accent / fond de page */
  onBackground: number;
  /** contraste texte d’accent / fond teinté */
  inkOnSoft: number;
  /** contraste texte posé sur l’accent */
  textOnAccent: number;
  /** la couleur a-t-elle été assombrie ou éclaircie pour passer AA ? */
  adjusted: boolean;
  /** niveaux atteints : AA = 4.5 pour du texte normal, AA large = 3 */
  level: "AAA" | "AA" | "AA-large" | "insuffisant";
}

export const THEME_BG = { light: "#F6F1E7", dark: "#1E1C19" } as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/* ------------------------------------------------------------------ */
/* Couleurs de base                                                     */
/* ------------------------------------------------------------------ */

export function parseHex(input: string): Rgb | null {
  const value = input.trim().replace(/^#/, "");
  const short = /^[0-9a-f]{3}$/i.test(value);
  const long = /^[0-9a-f]{6}$/i.test(value);
  if (!short && !long) return null;
  const full = short
    ? value
        .split("")
        .map((char) => char + char)
        .join("")
    : value;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function isHex(input: string) {
  return parseHex(input) !== null;
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  const [r1, g1, b1] =
    hn < 60
      ? [c, x, 0]
      : hn < 120
        ? [x, c, 0]
        : hn < 180
          ? [0, c, x]
          : hn < 240
            ? [0, x, c]
            : hn < 300
              ? [x, 0, c]
              : [c, 0, x];
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/* ------------------------------------------------------------------ */
/* Contraste WCAG 2.1                                                    */
/* ------------------------------------------------------------------ */

function channel(value: number) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b)
  );
}

/** Ratio de contraste entre deux couleurs hexadécimales, de 1 à 21. */
export function contrastRatio(a: string, b: string): number {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return 1;
  const la = relativeLuminance(first);
  const lb = relativeLuminance(second);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export function contrastLevel(ratio: number): AccentResult["level"] {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "insuffisant";
}

/** Format court et lisible pour l’interface : « 5,2:1 ». */
export function formatContrast(ratio: number): string {
  return `${ratio.toFixed(1).replace(".", ",")}:1`;
}

/* ------------------------------------------------------------------ */
/* Dérivation                                                          */
/* ------------------------------------------------------------------ */

const AA_TEXT = 4.5;
const AA_UI = 3;

/**
 * Décale la luminosité par pas de 2 % jusqu’à atteindre le contraste voulu,
 * en conservant teinte et saturation. Retourne la couleur corrigée.
 */
export function ensureContrast(
  color: string,
  against: string,
  target: number,
  direction: 1 | -1,
): { color: string; adjusted: boolean } {
  let hsl = rgbToHsl(parseHex(color)!);
  let current = toHex(hslToRgb(hsl));
  let adjusted = false;

  for (let step = 0; step < 50; step += 1) {
    if (contrastRatio(current, against) >= target) break;
    const next = clamp(hsl.l + direction * 2, 0, 100);
    if (next === hsl.l) break;
    hsl = { ...hsl, l: next };
    current = toHex(hslToRgb(hsl));
    adjusted = true;
  }
  return { color: current, adjusted };
}

export function bestTextOn(background: string): string {
  const light = "#FFFFFF";
  const dark = "#141210";
  const lightRatio = contrastRatio(light, background);
  const darkRatio = contrastRatio(dark, background);
  return lightRatio >= darkRatio ? light : dark;
}

/**
 * Construit la palette complète à partir d’une couleur libre.
 * `theme` décide du fond de référence : en clair on assombrit, en sombre on
 * éclaircit, sinon l’accent disparaîtrait dans le papier.
 */
export function deriveAccent(
  input: string,
  theme: "light" | "dark",
  /** fond réel : un thème peut avoir un papier très différent du nôtre */
  backgroundOverride?: string,
): AccentResult {
  const base = parseHex(input);
  if (!base) throw new Error(`Couleur invalide : ${input}`);

  const background = backgroundOverride ?? THEME_BG[theme];
  const direction = theme === "light" ? -1 : 1;

  const accentStep = ensureContrast(toHex(base), background, AA_TEXT, direction);
  const accent = accentStep.color;

  const hsl = rgbToHsl(parseHex(accent)!);
  const softHsl: Hsl =
    theme === "light"
      ? { h: hsl.h, s: clamp(hsl.s * 0.55, 24, 52), l: 92 }
      : { h: hsl.h, s: clamp(hsl.s * 0.45, 16, 38), l: 20 };
  const accentSoft = toHex(hslToRgb(softHsl));

  const inkDirection = theme === "light" ? -1 : 1;
  const inkStep = ensureContrast(accent, accentSoft, AA_TEXT, inkDirection);
  const accentInk = inkStep.color;

  const onAccent = bestTextOn(accent);

  const onBackground = contrastRatio(accent, background);
  return {
    palette: { accent, accentSoft, accentInk, onAccent },
    onBackground,
    inkOnSoft: contrastRatio(accentInk, accentSoft),
    textOnAccent: contrastRatio(onAccent, accent),
    adjusted: accentStep.adjusted,
    level:
      onBackground >= AA_TEXT && contrastRatio(onAccent, accent) >= AA_UI
        ? contrastLevel(onBackground)
        : "insuffisant",
  };
}

/** Variables CSS prêtes à poser sur `<html>` (ou sur un aperçu isolé). */
export function accentVars(result: AccentResult): Record<string, string> {
  return {
    "--accent": result.palette.accent,
    "--accent-soft": result.palette.accentSoft,
    "--accent-ink": result.palette.accentInk,
    "--on-accent": result.palette.onAccent,
  };
}
