import { describe, expect, it } from "vitest";
import {
  AA,
  contrast,
  deepTone,
  extractColors,
  hueDistance,
  luminance,
  pickOnAccent,
  rotate,
  shadcnVars,
} from "@/lib/palette";
import { parseHex, rgbToHsl } from "@/lib/accent";

/**
 * Le contrat des couleurs tirées du fond.
 *
 * Ce qui casse en silence dans un extracteur de palette, c’est toujours la même
 * chose : une image sans couleur franche (`NaN` partout), un accent que l’image
 * ne contient pas, un texte de bouton illisible sur son bouton. Les tests
 * portent donc sur les **propriétés**, pas sur des valeurs recopiées.
 */

/** Fabrique un flux de pixels RVB : 48 × 48, comme le canvas réel. */
function image(colours: { hex: string; share: number }[]): number[] {
  const total = 48 * 48;
  const out: number[] = [];
  let written = 0;
  colours.forEach((entry, index) => {
    const rgb = parseHex(entry.hex)!;
    const count =
      index === colours.length - 1 ? total - written : Math.round(total * entry.share);
    for (let i = 0; i < count; i += 1) out.push(rgb.r, rgb.g, rgb.b);
    written += count;
  });
  return out;
}

const OPTIONS = { mode: "dark" as const, background: "#2E3440" };

const hue = (hex: string) => rgbToHsl(parseHex(hex)!).h;

describe("extraction", () => {
  it("retrouve la teinte dominante d’une image", () => {
    const colors = extractColors(image([{ hex: "#1F6FEB", share: 1 }]), OPTIONS);
    expect(hueDistance(hue(colors.accent), 212)).toBeLessThan(18);
    expect(colors.confidence).toBeGreaterThan(0.9);
  });

  it("choisit une secondaire réellement différente", () => {
    const colors = extractColors(
      image([
        { hex: "#1F6FEB", share: 0.7 },
        { hex: "#E8933A", share: 0.3 },
      ]),
      OPTIONS,
    );
    expect(hueDistance(hue(colors.accent), hue(colors.secondary))).toBeGreaterThanOrEqual(55);
    expect(hueDistance(hue(colors.secondary), 32)).toBeLessThan(25);
  });

  it("fabrique une secondaire quand l’image n’en a qu’une", () => {
    const colors = extractColors(image([{ hex: "#2E7D5B", share: 1 }]), OPTIONS);
    expect(hueDistance(hue(colors.accent), hue(colors.secondary))).toBeGreaterThan(30);
    expect(colors.secondary).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("ne rend jamais un gris sans couleur franche inutilisable", () => {
    const colors = extractColors(image([{ hex: "#8A8A8A", share: 1 }]), OPTIONS);
    for (const value of [colors.accent, colors.secondary, colors.deep]) {
      expect(value, value).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Number.isNaN(luminance(value))).toBe(false);
    }
    expect(colors.confidence).toBe(0);
  });

  it("tient sur une image vide ou corrompue", () => {
    const colors = extractColors([], OPTIONS);
    expect(colors.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.deep).toMatch(/^#[0-9a-f]{6}$/i);
    const broken = extractColors([Number.NaN, 12, 40, 3, 5], OPTIONS);
    expect(broken.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("est déterministe : mêmes pixels, mêmes couleurs", () => {
    const pixels = image([
      { hex: "#4C6EF5", share: 0.5 },
      { hex: "#F59F00", share: 0.3 },
      { hex: "#12B886", share: 0.2 },
    ]);
    expect(extractColors(pixels, OPTIONS)).toEqual(extractColors(pixels, OPTIONS));
  });

  it("choisit la teinte la plus présente, pas la plus vive", () => {
    const colors = extractColors(
      image([
        { hex: "#1D3F66", share: 0.78 },
        { hex: "#FF2D55", share: 0.22 },
      ]),
      OPTIONS,
    );
    expect(hueDistance(hue(colors.accent), hue("#1D3F66"))).toBeLessThan(25);
  });
});

describe("lisibilité", () => {
  it("garde l’accent au-dessus de AA sur le verre", () => {
    for (const background of ["#2E3440", "#F6F1E7", "#1E1C19", "#4C545F"]) {
      for (const hex of ["#1F6FEB", "#E8933A", "#2E7D5B", "#8A8A8A", "#FF2D55", "#111111"]) {
        const colors = extractColors(image([{ hex, share: 1 }]), {
          mode: background === "#F6F1E7" ? "light" : "dark",
          background,
        });
        expect(colors.contrast, `${hex} sur ${background}`).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it("choisit un texte de bouton qui passe AA, toujours", () => {
    for (let value = 0; value <= 255; value += 5) {
      const grey = `#${[value, value, value]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`;
      const picked = pickOnAccent(grey);
      expect(picked.contrast, grey).toBeGreaterThanOrEqual(AA);
      expect(["#FFFFFF", "#000000"]).toContain(picked.color);
    }
  });

  it("suit le principe WCAG : blanc sur fond sombre, noir sur fond clair", () => {
    expect(pickOnAccent("#0B2B26").color).toBe("#FFFFFF");
    expect(pickOnAccent("#F6E3A1").color).toBe("#000000");
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
  });
});

describe("teinte du voile", () => {
  it("est sombre, même sur une image claire", () => {
    const pixels = image([{ hex: "#F2E6D0", share: 1 }]);
    const colors = extractColors(pixels, OPTIONS);
    expect(luminance(colors.deep)).toBeLessThanOrEqual(0.05);
  });

  it("garde l’orientation de teinte de l’image", () => {
    const blue = deepTone([{ rgb: { r: 20, g: 60, b: 140 }, weight: 1 }]);
    const warm = deepTone([{ rgb: { r: 140, g: 70, b: 30 }, weight: 1 }]);
    expect(hueDistance(hue(blue), 220)).toBeLessThan(25);
    expect(hueDistance(hue(warm), 28)).toBeLessThan(25);
    // et il est toujours sombre : c’est un voile, pas une couleur de fond
    expect(luminance(blue)).toBeLessThan(0.06);
    expect(luminance(warm)).toBeLessThan(0.06);
  });
});

describe("variables CSS", () => {
  it("écrit les jetons shadcn comme de vraies couleurs", () => {
    const colors = extractColors(image([{ hex: "#1F6FEB", share: 1 }]), OPTIONS);
    const vars = shadcnVars(colors);
    for (const [name, value] of Object.entries(vars)) {
      // une couleur, pas un triplet HSL : c’est ce qui permet @property + color-mix
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(vars["--primary"]).toBe(vars["--ring"]);
    expect(vars["--accent"]).toBe(vars["--primary"]);
    expect(vars["--tint"]).toBe(colors.deep); // thème sombre : la teinte sombre
    // thème clair : la couleur moyenne, sinon le voile tue le contraste
    expect(shadcnVars(colors, "light")["--tint"]).toBe(colors.tone);
    expect(vars["--on-accent"]).toBe(colors.onAccent);
  });

  it("sait tourner une teinte sans la rendre grise", () => {
    const turned = rotate("#1F6FEB", 42);
    expect(hueDistance(hue(turned), hue("#1F6FEB"))).toBeGreaterThan(30);
    expect(rgbToHsl(parseHex(turned)!).s).toBeGreaterThan(20);
  });
});
