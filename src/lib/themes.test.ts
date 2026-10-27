import { describe, expect, it } from "vitest";
import { contrastRatio, parseHex, toHex } from "@/lib/accent";
import {
  PALETTES,
  buildTheme,
  paletteByKey,
  siblingOf,
  themeVars,
  tokensFor,
} from "@/lib/themes";

/**
 * Audit automatique : chaque palette est recalculée, chaque paire de couleurs
 * qui porte du texte est mesurée. Un thème « premium » qui devient illisible
 * n’est pas un thème premium — c’est un bug de contraste.
 */
const TEXT_PAIRS: { fg: keyof ReturnType<typeof buildTheme>; bg: keyof ReturnType<typeof buildTheme>; min: number; label: string }[] = [
  { fg: "ink", bg: "bg", min: 7, label: "texte / fond" },
  { fg: "ink", bg: "surface", min: 4.5, label: "texte / carte" },
  { fg: "muted", bg: "bg", min: 4.5, label: "texte discret / fond" },
  { fg: "muted", bg: "surface", min: 4.5, label: "texte discret / carte" },
  { fg: "accent", bg: "bg", min: 4.5, label: "accent / fond" },
  { fg: "accent", bg: "surface", min: 4.5, label: "accent / carte" },
  { fg: "accentInk", bg: "accentSoft", min: 4.5, label: "encre accent / fond doux" },
  { fg: "onAccent", bg: "accent", min: 4.5, label: "texte / bouton accent" },
  { fg: "danger", bg: "bg", min: 4.5, label: "danger / fond" },
  { fg: "ink", bg: "highlight", min: 4.5, label: "texte / surlignage" },
];

describe("palettes", () => {
  it("en propose au moins douze, toutes uniques", () => {
    expect(PALETTES.length).toBeGreaterThanOrEqual(12);
    const keys = PALETTES.map((palette) => palette.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("cite une source et une licence pour chaque palette", () => {
    for (const palette of PALETTES) {
      expect(palette.source.url, palette.key).toMatch(/^https:\/\//);
      expect(palette.source.license, palette.key).not.toBe("");
    }
  });

  it("déclare un mode et une jumelle cohérente", () => {
    for (const palette of PALETTES) {
      expect(["light", "dark"]).toContain(palette.mode);
      if (palette.sibling) {
        const sibling = paletteByKey(palette.sibling);
        expect(sibling.key, `${palette.key} → ${palette.sibling}`).toBe(
          palette.sibling,
        );
        expect(sibling.mode).not.toBe(palette.mode);
      }
    }
  });

  it("trouve une jumelle dans le mode demandé", () => {
    expect(paletteByKey(siblingOf("mocha", "light")).key).toBe("latte");
    expect(paletteByKey(siblingOf("latte", "dark")).key).toBe("mocha");
    expect(paletteByKey(siblingOf("nord", "light")).mode).toBe("light");
    expect(paletteByKey(siblingOf("papier", "dark")).mode).toBe("dark");
  });

  it("respecte les seuils de contraste sur toutes les paires de texte", () => {
    const failures: string[] = [];
    for (const palette of PALETTES) {
      const tokens = buildTheme(palette);
      for (const pair of TEXT_PAIRS) {
        const ratio = contrastRatio(
          tokens[pair.fg] as string,
          tokens[pair.bg] as string,
        );
        if (ratio < pair.min) {
          failures.push(
            `${palette.key}: ${pair.label} ${ratio.toFixed(2)} < ${pair.min}`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("garde les traits visibles sans être criards", () => {
    for (const palette of PALETTES) {
      const tokens = buildTheme(palette);
      const line = contrastRatio(tokens.line, tokens.bg);
      expect(line, palette.key).toBeGreaterThan(1.05);
      expect(line, palette.key).toBeLessThan(4.6);
    }
  });

  it("produit seize variables CSS hexadécimales valides", () => {
    for (const palette of PALETTES) {
      const vars = themeVars(tokensFor(palette.key));
      expect(Object.keys(vars)).toHaveLength(16);
      for (const [name, value] of Object.entries(vars)) {
        expect(name.startsWith("--"), name).toBe(true);
        const parsed = parseHex(value);
        expect(parsed, `${palette.key} ${name}=${value}`).not.toBeNull();
        expect(toHex(parsed!)).toBe(value.toUpperCase());
      }
    }
  });

  it("explique pourquoi Solarized dévie de sa valeur officielle", () => {
    // Bleu Solarized officiel sur papier Solarized : 3,41:1, sous AA.
    expect(contrastRatio("#268BD2", "#FDF6E3")).toBeLessThan(4.5);
    const tokens = buildTheme(paletteByKey("solarized-clair"));
    expect(tokens.accent.toUpperCase()).not.toBe("#268BD2");
    expect(contrastRatio(tokens.accent, tokens.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("enregistre chaque teinte corrigée, avec son ratio", () => {
    const adjusted = PALETTES.flatMap((palette) =>
      buildTheme(palette).adjustments.map((item) => ({ palette: palette.key, ...item })),
    );
    expect(adjusted.length).toBeGreaterThan(0);
    for (const item of adjusted) {
      expect(item.ratio).toBeGreaterThanOrEqual(4.5);
      expect(item.from.toUpperCase()).not.toBe(item.to.toUpperCase());
    }
  });

  it("conserve les teintes déjà conformes", () => {
    const mocha = buildTheme(paletteByKey("mocha"));
    expect(mocha.bg.toUpperCase()).toBe("#1E1E2E");
    expect(mocha.surface.toUpperCase()).toBe("#313244");
    expect(mocha.adjustments.map((item) => item.token)).not.toContain("bg");
  });
});
