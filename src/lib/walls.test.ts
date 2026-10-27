import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIGNATURES, WALLS, wallById, wallUrl } from "@/lib/walls";
import { PALETTES, paletteByKey } from "@/lib/themes";

const WALL_DIR = join(process.cwd(), "public", "walls");

describe("fonds « verre »", () => {
  it("propose les deux familles de fonds", () => {
    expect(WALLS.filter((wall) => wall.kind === "ramp").length).toBeGreaterThanOrEqual(6);
    expect(WALLS.filter((wall) => !wall.kind || wall.kind === "aura").length).toBeGreaterThanOrEqual(18);
    for (const wall of WALLS.filter((entry) => entry.kind === "ramp")) {
      expect(wall.mode, wall.id).toMatch(/^(light|dark)$/);
    }
  });

  it("en propose au moins dix-huit, tous uniques", () => {
    expect(WALLS.length).toBeGreaterThanOrEqual(18);
    expect(new Set(WALLS.map((wall) => wall.id)).size).toBe(WALLS.length);
    expect(new Set(WALLS.map((wall) => wall.label)).size).toBe(WALLS.length);
  });

  it("a un fichier réel pour chaque fond, et aucun orphelin", () => {
    for (const wall of WALLS) {
      const file = join(WALL_DIR, `${wall.id}.svg`);
      expect(existsSync(file), wall.id).toBe(true);
      const svg = readFileSync(file, "utf8");
      expect(svg.startsWith("<svg"), wall.id).toBe(true);
      /* Deux façons de faire un fond : des halos flous, ou une rampe. */
      if (wall.kind === "ramp") {
        expect(svg, wall.id).toContain("linearGradient");
        expect(svg.match(/<stop /g)?.length, wall.id).toBeGreaterThanOrEqual(5);
      } else {
        expect(svg, wall.id).toContain("feGaussianBlur");
      }
      expect(svg.length, wall.id).toBeLessThan(12_000);
    }
    // aucun fichier sans entrée : la galerie ne doit pas mentir
    for (const wall of WALLS) {
      expect(wallUrl(wall.id)).toContain(`/walls/${wall.id}.svg`);
    }
  });

  it("équilibre les fonds clairs et sombres", () => {
    const dark = WALLS.filter((wall) => wall.mode === "dark").length;
    const light = WALLS.filter((wall) => wall.mode === "light").length;
    expect(dark).toBeGreaterThanOrEqual(6);
    expect(light).toBeGreaterThanOrEqual(8);
  });

  it("recommande une palette qui existe", () => {
    for (const wall of WALLS) {
      expect(
        PALETTES.some((palette) => palette.key === wall.palette),
        `${wall.id} → ${wall.palette}`,
      ).toBe(true);
    }
  });

  it("résout un fond par identifiant, et rien pour l’absence", () => {
    expect(wallById("aurore")?.label).toBe("Aurore");
    expect(wallById(null)).toBeUndefined();
    expect(wallById("inconnu")).toBeUndefined();
  });

  it("compose des signatures cohérentes", () => {
    expect(SIGNATURES.length).toBeGreaterThanOrEqual(6);
    for (const signature of SIGNATURES) {
      expect(paletteByKey(signature.palette).key, signature.id).toBe(signature.palette);
      if (signature.wallpaper) {
        expect(wallById(signature.wallpaper), signature.id).toBeDefined();
      }
    }
  });
});
