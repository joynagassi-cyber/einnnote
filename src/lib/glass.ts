import type { ThemeTokens } from "@/lib/themes";

/**
 * Le verre n’a pas le droit d’être un pari.
 *
 * Une image sous du texte, c’est deux risques symétriques :
 *
 * - **trop de fond** → l’encre perd son contraste (le texte « flotte ») ;
 * - **trop de voile** → le fond disparaît et le réglage devient décoratif.
 *
 * Ce module calcule, pour un couple (thème, fond), la bande de voile où les
 * deux tiennent : plancher = AA sur l’encre et le texte secondaire ; plafond =
 * le fond reste perceptible. Entre les deux, l’utilisateur choisit.
 *
 * L’accent n’est pas dans le plancher : il est **recalculé sur le verre**
 * (`deriveAccent`, voir `useAppStore`), donc il reste AA à tous les voiles au
 * lieu de contraindre le réglage.
 *
 * Les valeurs sont celles du CSS (`src/index.css`) : l’écran laisse passer
 * l’image (34 % de fond seulement), le voile est posé sur l’image floutée, et
 * **ce sont les surfaces** (cartes, feuilles) qui portent la lisibilité du
 * texte — pas un voile épais sur toute la page. C’est la différence entre un
 * fond qu’on voit et un fond qu’on devine.
 */

export type RGB = [number, number, number];

/** Opacité de `.screen` sur le verre — doit rester synchronisée avec le CSS. */
export const SCREEN_ALPHA = 0.4;
/** Le flou reste doux : l’image doit rester une image, pas une tache. */
export const WALL_BLUR_MIN = 2;
export const WALL_BLUR_MAX = 18;
/** Contraste minimal du texte (AA, texte normal). */
export const WALL_AA = 4.5;
/** Écart minimal (sur 255) entre le verre et le fond du thème : le fond se voit. */
export const WALL_PRESENCE = 3;

export function toRgb(value: string): RGB {
  const clean = value.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as RGB;
}

export function relativeLuminance([r, g, b]: RGB): number {
  const channel = (value: number) => {
    const x = value / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [x, y] = [relativeLuminance(a) + 0.05, relativeLuminance(b) + 0.05];
  return x > y ? x / y : y / x;
}

function mix(a: RGB, b: RGB, weight: number): RGB {
  return a.map((value, index) => value * weight + b[index] * (1 - weight)) as RGB;
}

/** Couleur réelle d’un écran translucide posé sur un fond flouté. */
export function glassColor(bg: RGB, tone: RGB, veil: number): RGB {
  const veiled = mix(bg, tone, veil);
  return mix(bg, veiled, SCREEN_ALPHA);
}

/** Écart maximal par canal entre le verre et le fond du thème (0–255). */
export function wallPresence(bg: RGB, tone: RGB, veil: number): number {
  const glass = glassColor(bg, tone, veil);
  return Math.max(...glass.map((value, index) => Math.abs(value - bg[index])));
}

/**
 * Voile minimal pour que l’encre et le texte secondaire gardent AA sur le
 * verre. Recherche linéaire : 91 valeurs, instantané, et relisible à la main.
 */
export function veilFloor(tokens: ThemeTokens, tone: RGB): number {
  const bg = toRgb(tokens.bg);
  const inks = [tokens.ink, tokens.muted].map(toRgb);
  for (let veil = 0; veil <= 1.0001; veil += 0.01) {
    const glass = glassColor(bg, tone, veil);
    if (inks.every((ink) => contrastRatio(ink, glass) >= WALL_AA)) {
      return Math.round(veil * 100);
    }
  }
  return 100;
}

/** Voile maximal où le fond reste perceptible (au moins `WALL_PRESENCE`). */
export function veilCeiling(tokens: ThemeTokens, tone: RGB): number {
  const bg = toRgb(tokens.bg);
  for (let veil = 0.9; veil >= -0.0001; veil -= 0.01) {
    if (wallPresence(bg, tone, veil) >= WALL_PRESENCE) {
      return Math.round(veil * 100);
    }
  }
  return 0;
}

export interface VeilBand {
  /** voile minimal : lisibilité */
  min: number;
  /** voile maximal : présence du fond */
  max: number;
  /** vrai quand la lisibilité mange toute la place (bande réduite) */
  tight: boolean;
}

/**
 * Bande utile de voile. La lisibilité gagne toujours : si les deux bornes se
 * croisent, `max` est ramené à `min` et `tight` le signale à l’écran.
 */
export function veilBand(tokens: ThemeTokens, tone: RGB): VeilBand {
  const min = veilFloor(tokens, tone);
  const ceiling = veilCeiling(tokens, tone);
  const max = Math.max(min, ceiling);
  return { min, max, tight: ceiling < min };
}

/** Voile effectivement appliqué : le réglage, ramené dans la bande utile. */
export function effectiveVeil(setting: number, tokens: ThemeTokens, tone: RGB): number {
  const band = veilBand(tokens, tone);
  return Math.min(band.max, Math.max(band.min, Math.round(setting)));
}

export function effectiveBlur(setting: number): number {
  return Math.min(WALL_BLUR_MAX, Math.max(WALL_BLUR_MIN, Math.round(setting)));
}
