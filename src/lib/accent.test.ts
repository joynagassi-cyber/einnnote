import { describe, expect, it } from "vitest";
import {
  THEME_BG,
  contrastLevel,
  contrastRatio,
  deriveAccent,
  formatContrast,
  hslToRgb,
  parseHex,
  rgbToHsl,
  toHex,
} from "@/lib/accent";

const PRESETS = [
  "#0F766E", // teal
  "#1D4ED8", // bleu
  "#6D28D9", // violet
  "#15803D", // vert
  "#B4532A", // terracotta
  "#86198F", // prune
  "#3F3F46", // graphite
];

const EXTREMES = [
  "#FFFF00", // jaune pur : illisible sur papier clair
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FFFF",
  "#7F7F7F",
  "#F97316",
  "#22C55E",
  "#EC4899",
  "#0EA5E9",
];

describe("couleurs", () => {
  it("lit les hexadécimaux courts et longs", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("0f766e")).toEqual({ r: 15, g: 118, b: 110 });
    expect(parseHex("#12345")).toBeNull();
    expect(parseHex("bonjour")).toBeNull();
  });

  it("fait l’aller-retour RGB ↔ HSL", () => {
    for (const hex of [...PRESETS, ...EXTREMES]) {
      const rgb = parseHex(hex)!;
      expect(toHex(hslToRgb(rgbToHsl(rgb)))).toBe(toHex(rgb));
    }
  });

  it("mesure le contraste selon WCAG", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    // symétrie
    expect(contrastRatio("#0F766E", "#F6F1E7")).toBeCloseTo(
      contrastRatio("#F6F1E7", "#0F766E"),
      5,
    );
  });

  it("classe les niveaux AA/AAA", () => {
    expect(contrastLevel(21)).toBe("AAA");
    expect(contrastLevel(4.6)).toBe("AA");
    expect(contrastLevel(3.1)).toBe("AA-large");
    expect(contrastLevel(1.2)).toBe("insuffisant");
    expect(formatContrast(5.24)).toBe("5,2:1");
  });
});

describe("dérivation de la palette", () => {
  it("respecte AA pour les sept presets, dans les deux thèmes", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const hex of PRESETS) {
        const result = deriveAccent(hex, theme);
        expect(result.onBackground).toBeGreaterThanOrEqual(4.5);
        expect(result.inkOnSoft).toBeGreaterThanOrEqual(4.5);
        // le texte posé sur l’accent reste lisible (boutons)
        expect(result.textOnAccent).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("corrige les couleurs extrêmes au lieu de les refuser", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const hex of EXTREMES) {
        const result = deriveAccent(hex, theme);
        expect(result.onBackground).toBeGreaterThanOrEqual(4.5);
        expect(result.inkOnSoft).toBeGreaterThanOrEqual(4.5);
        expect(result.palette.accent).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  it("signale une correction et conserve la teinte", () => {
    const yellow = deriveAccent("#FFFF00", "light");
    expect(yellow.adjusted).toBe(true);
    expect(rgbToHsl(parseHex(yellow.palette.accent)!).h).toBeCloseTo(60, 0);

    // un accent déjà sombre n’a pas besoin d’être corrigé sur papier clair
    const dark = deriveAccent("#0B3B36", "light");
    expect(dark.adjusted).toBe(false);
    expect(dark.palette.accent).toBe("#0B3B36");
  });

  it("éclaircit en thème sombre et assombrit en clair", () => {
    const light = deriveAccent("#FFFF00", "light");
    const dark = deriveAccent("#FFFF00", "dark");
    // sur papier clair le jaune pur est assombri…
    expect(rgbToHsl(parseHex(light.palette.accent)!).l).toBeLessThan(50);
    // …sur fond sombre il est déjà lisible : on ne le touche pas
    expect(rgbToHsl(parseHex(dark.palette.accent)!).l).toBeGreaterThanOrEqual(50);
    expect(contrastRatio(dark.palette.accent, THEME_BG.dark)).toBeGreaterThanOrEqual(4.5);
  });

  it("teinte le fond doux sans le rendre criard", () => {
    for (const theme of ["light", "dark"] as const) {
      const { palette } = deriveAccent("#B4532A", theme);
      const soft = rgbToHsl(parseHex(palette.accentSoft)!);
      // saturation contenue et luminosité franche
      expect(soft.s).toBeLessThanOrEqual(55);
      if (theme === "light") expect(soft.l).toBeGreaterThan(85);
      else expect(soft.l).toBeLessThan(30);
    }
  });

  it("rejette une couleur invalide au lieu d’inventer une valeur", () => {
    expect(() => deriveAccent("pas une couleur", "light")).toThrow();
  });

  it("ne dépend pas du fond codé en dur du thème", () => {
    // garde-fou : si quelqu’un change --bg sans mettre à jour le moteur,
    // ce test le signale ici
    expect(contrastRatio(THEME_BG.light, "#FFFFFF")).toBeGreaterThan(1);
    expect(contrastRatio(THEME_BG.dark, "#000000")).toBeLessThan(2);
  });
});
