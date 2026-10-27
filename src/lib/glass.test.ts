import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WALLS } from "@/lib/walls";
import { tokensFor } from "@/lib/themes";
import { deriveAccent } from "@/lib/accent";
import {
  SCREEN_ALPHA,
  WALL_PRESENCE,
  contrastRatio,
  effectiveBlur,
  effectiveVeil,
  glassColor,
  toRgb,
  veilBand,
} from "@/lib/glass";

/**
 * Le verre n’a pas le droit d’être un pari.
 *
 * Une image sous du texte crée deux risques symétriques : trop de fond et le
 * texte flotte ; trop de voile et le fond disparaît. On vérifie ici, sur les 24
 * fonds et leur palette recommandée, que la bande calculée tient les deux
 * promesses — et que la couleur moyenne déclarée correspond bien au SVG.
 */

type RGB = [number, number, number];

/** Couleur moyenne de l’image : fond plein + halos au prorata de leur surface. */
function averageColor(id: string): RGB {
  const svg = readFileSync(join(process.cwd(), "public", "walls", `${id}.svg`), "utf8");
  /* Rampe : les arrêts sont espacés régulièrement, donc la couleur moyenne est
     leur moyenne. Aura : fond plein + halos au prorata de leur surface. */
  const ramp = /<linearGradient[\s\S]*?<\/linearGradient>/.exec(svg)?.[0] ?? "";
  const stops = [...ramp.matchAll(/<stop offset="\d+%" stop-color="(#[0-9A-Fa-f]{3,6})"/g)];
  if (stops.length) {
    const colors = stops.map((match) => toRgb(match[1]));
    return [0, 1, 2].map(
      (channel) => colors.reduce((sum, color) => sum + color[channel], 0) / colors.length,
    ) as RGB;
  }
  const base = toRgb(/<rect width="1600" height="1000" fill="(#[0-9A-Fa-f]{3,6})"/.exec(svg)![1]);
  const halos = [...svg.matchAll(/<circle cx="\d+" cy="\d+" r="(\d+)" fill="(#[0-9A-Fa-f]{3,6})" opacity="([\d.]+)"/g)].map(
    (match) => ({ radius: Number(match[1]), color: toRgb(match[2]), opacity: Number(match[3]) }),
  );

  const total = 1600 * 1000;
  let weight = total;
  let sum = base.map((value) => value * total) as RGB;
  for (const halo of halos) {
    // le flou étale largement le halo : on compte ~2,4 fois son disque
    const haloWeight = Math.min(total * 0.6, Math.PI * halo.radius ** 2 * 2.4) * halo.opacity;
    sum = sum.map((value, index) => value + halo.color[index] * haloWeight) as RGB;
    weight += haloWeight;
  }
  return sum.map((value) => value / weight) as RGB;
}

const hex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

const mix = (a: RGB, b: RGB, weight: number) =>
  a.map((value, index) => value * weight + b[index] * (1 - weight)) as RGB;

const veils = [0, 5, 15, 30, 45, 55, 70, 90];

describe("lisibilité du verre", () => {
  it("déclare une couleur moyenne fidèle à l’image", () => {
    for (const wall of WALLS) {
      const actual = averageColor(wall.id);
      const declared = toRgb(wall.tone);
      actual.forEach((value, index) => {
        expect(
          Math.abs(value - declared[index]),
          `${wall.id} · canal ${index} (moyenne ${hex(actual)}, déclaré ${wall.tone})`,
        ).toBeLessThanOrEqual(6);
      });
    }
  });

  it("garde AA sur l’encre et le texte secondaire, à tous les voiles", () => {
    for (const wall of WALLS) {
      const tokens = tokensFor(wall.palette);
      const bg = toRgb(tokens.bg);
      const tone = toRgb(wall.tone);
      for (const veil of veils) {
        const glass = glassColor(bg, tone, veil / 100);
        expect(contrastRatio(toRgb(tokens.ink), glass), `${wall.id} · ${veil} % · encre`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(toRgb(tokens.muted), glass), `${wall.id} · ${veil} % · secondaire`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("garde AA sur les cartes posées sur le verre", () => {
    for (const wall of WALLS) {
      const tokens = tokensFor(wall.palette);
      const glass = glassColor(toRgb(tokens.bg), toRgb(wall.tone), 0.3);
      const card = mix(toRgb(tokens.surface), glass, 0.76);
      expect(contrastRatio(toRgb(tokens.ink), card), `${wall.id} · carte`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(toRgb(tokens.muted), card), `${wall.id} · carte secondaire`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("recalcule l’accent sur le verre, donc il reste AA partout", () => {
    for (const wall of WALLS) {
      const tokens = tokensFor(wall.palette);
      for (const veil of [veils[0], 30, 55, 90]) {
        const glass = glassColor(toRgb(tokens.bg), toRgb(wall.tone), veil / 100);
        const accent = deriveAccent(tokens.accent, tokens.mode, hex(glass));
        expect(accent.onBackground, `${wall.id} · ${veil} % · accent`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("borne le voile entre lisibilité et présence du fond", () => {
    for (const wall of WALLS) {
      const tokens = tokensFor(wall.palette);
      const band = veilBand(tokens, toRgb(wall.tone));
      expect(band.min, wall.id).toBeLessThanOrEqual(band.max);
      expect(band.min, wall.id).toBeGreaterThanOrEqual(0);
      expect(band.max, wall.id).toBeLessThanOrEqual(90);
      // au plafond, le fond est encore perceptible
      const presence = Math.max(
        ...glassColor(toRgb(tokens.bg), toRgb(wall.tone), band.max / 100).map((value, index) =>
          Math.abs(value - toRgb(tokens.bg)[index]),
        ),
      );
      expect(presence, `${wall.id} · présence à ${band.max} %`).toBeGreaterThanOrEqual(
        WALL_PRESENCE - 0.6,
      );
      // et à la borne basse, le texte tient
      const glass = glassColor(toRgb(tokens.bg), toRgb(wall.tone), band.min / 100);
      expect(contrastRatio(toRgb(tokens.ink), glass), `${wall.id} · plancher`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("ramène un réglage hors bande dans la bande, sans le dénaturer à l’intérieur", () => {
    for (const wall of WALLS) {
      const tokens = tokensFor(wall.palette);
      const tone = toRgb(wall.tone);
      const band = veilBand(tokens, tone);
      expect(effectiveVeil(0, tokens, tone)).toBe(band.min);
      expect(effectiveVeil(90, tokens, tone)).toBe(band.max);
      if (band.max - band.min >= 10) {
        const inside = Math.round((band.min + band.max) / 2);
        expect(effectiveVeil(inside, tokens, tone)).toBe(inside);
      }
    }
  });

  it("garde le flou dans des bornes utiles", () => {
    expect(effectiveBlur(0)).toBe(2);
    expect(effectiveBlur(120)).toBe(18);
    expect(effectiveBlur(8)).toBe(8);
    /* L’écran laisse voir l’image : 40 % de fond, 60 % d’image. */
    expect(SCREEN_ALPHA).toBeLessThanOrEqual(0.45);
  });
});
