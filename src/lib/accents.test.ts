import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACCENT_PRESETS, presetByKey } from "@/lib/accents";
import { contrastRatio, parseHex, toHex } from "@/lib/accent";

const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");

/** Extrait le bloc `:root[data-accent="…"]` (clair) ou sa variante sombre. */
function cssBlock(accent: string, dark = false) {
  const selector = dark
    ? `:root[data-theme="dark"][data-accent="${accent}"]`
    : `:root[data-accent="${accent}"]`;
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  const end = css.indexOf("}", start);
  return css.slice(start, end);
}

function valueIn(block: string, name: string) {
  const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match ? match[1].trim().toUpperCase() : "";
}

describe("presets d’accent", () => {
  it("expose l’indigo Gemini", () => {
    const indigo = presetByKey("indigo");
    expect(indigo).toBeDefined();
    expect(indigo?.label).toBe("Indigo Gemini");
    expect(indigo?.light).toBe("#4257D6");
  });

  it("a un bloc CSS clair et sombre pour chaque preset", () => {
    for (const preset of ACCENT_PRESETS) {
      const light = cssBlock(preset.key);
      const dark = cssBlock(preset.key, true);
      expect(light, `bloc clair manquant : ${preset.key}`).not.toBe("");
      expect(dark, `bloc sombre manquant : ${preset.key}`).not.toBe("");
    }
  });

  it("garde les valeurs CSS identiques aux presets TypeScript", () => {
    for (const preset of ACCENT_PRESETS) {
      const light = cssBlock(preset.key);
      const dark = cssBlock(preset.key, true);
      expect(valueIn(light, "accent"), preset.key).toBe(preset.light);
      expect(valueIn(light, "accent-soft"), preset.key).toBe(preset.softLight);
      expect(valueIn(light, "accent-ink"), preset.key).toBe(preset.inkLight);
      expect(valueIn(dark, "accent"), preset.key).toBe(preset.dark);
      expect(valueIn(dark, "accent-soft"), preset.key).toBe(preset.softDark);
      expect(valueIn(dark, "accent-ink"), preset.key).toBe(preset.inkDark);
    }
  });

  it("garde chaque accent lisible sur le papier clair (AA 4.5:1)", () => {
    for (const preset of ACCENT_PRESETS) {
      const ratio = contrastRatio(preset.light, "#F6F1E7");
      expect(ratio, preset.key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("garde chaque accent lisible sur le fond sombre (AA 4.5:1)", () => {
    for (const preset of ACCENT_PRESETS) {
      const ratio = contrastRatio(preset.dark, "#1E1C19");
      expect(ratio, preset.key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("garde le texte des badges lisible sur le fond doux", () => {
    for (const preset of ACCENT_PRESETS) {
      expect(
        contrastRatio(preset.inkLight, preset.softLight),
        preset.key,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(preset.inkDark, preset.softDark),
        preset.key,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("n’a pas de doublon de clé", () => {
    const keys = ACCENT_PRESETS.map((preset) => preset.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(presetByKey(key)?.key).toBe(key);
  });

  it("normalise les couleurs en hexadécimal à six chiffres", () => {
    for (const preset of ACCENT_PRESETS) {
      for (const value of [
        preset.light,
        preset.dark,
        preset.softLight,
        preset.softDark,
        preset.inkLight,
        preset.inkDark,
      ]) {
        expect(toHex(parseHex(value)!)).toBe(value);
      }
    }
  });
});
