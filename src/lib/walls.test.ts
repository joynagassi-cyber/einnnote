import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIGNATURES, WALLS, wallById, wallFile, wallUrl, wallsBySeries } from "@/lib/walls";
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
      const file = join(WALL_DIR, wallFile(wall.id, wall.kind));
      expect(existsSync(file), wall.id).toBe(true);

      /* Trois façons de faire un fond : des halos flous, une rampe, une photo. */
      if (wall.kind === "photo" || wall.kind === "illustration") {
        const png = readFileSync(file);
        // signature PNG : le fichier est bien une image, pas un SVG renommé
        expect([...png.subarray(0, 4)], wall.id).toEqual([0x89, 0x50, 0x4e, 0x47]);
        const width = png.readUInt32BE(16);
        const height = png.readUInt32BE(20);
        expect(width, `${wall.id} · largeur HD`).toBeGreaterThanOrEqual(1280);
        expect(height / width, `${wall.id} · cadrage paysage`).toBeGreaterThan(0.5);
        // une photographie de fond reste légère : elle est floutée de toute façon
        expect(png.length, `${wall.id} · poids`).toBeLessThan(900_000);
        continue;
      }

      const svg = readFileSync(file, "utf8");
      expect(svg.startsWith("<svg"), wall.id).toBe(true);
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
      expect(wallUrl(wall.id)).toContain(`/walls/${wallFile(wall.id, wall.kind)}`);
    }
  });

  it("livre des illustrations éditoriales, rangées en séries", () => {
    const illustrations = WALLS.filter((wall) => wall.kind === "illustration");
    expect(illustrations.length).toBeGreaterThanOrEqual(10);
    for (const wall of illustrations) {
      expect(wallUrl(wall.id), wall.id).toMatch(/\.png$/);
      expect(wall.series, wall.id).toBeDefined();
    }
    // trois séries nommées, comme un choix de couvertures
    const series = wallsBySeries();
    expect(series.map((entry) => entry.id)).toEqual([
      "horizons",
      "matieres",
      "saisons",
      "villes",
      "photos",
      "halos",
      "degrades",
    ]);
    for (const entry of series) {
      expect(entry.walls.length, entry.id).toBeGreaterThan(0);
      expect(entry.label.length).toBeGreaterThan(3);
    }
    // aucune série ne mélange les familles de fabrication
    // cinq horizons, cinq lumières distinctes
    const horizons = series.find((entry) => entry.id === "horizons")!;
    expect(horizons.walls.map((wall) => wall.id)).toEqual([
      "aube-mer",
      "desert",
      "montagne",
      "brume-lac",
      "noir-blanc",
    ]);
    const saisons = series.find((entry) => entry.id === "saisons")!;
    expect(saisons.walls.map((wall) => wall.id)).toEqual([
      "printemps",
      "ete",
      "automne",
      "hiver",
    ]);
  });

  it("livre des photographies en plus des fonds dessinés", () => {
    const photos = WALLS.filter((wall) => wall.kind === "photo");
    expect(photos.length).toBeGreaterThanOrEqual(10);
    for (const wall of photos) {
      expect(wallUrl(wall.id), wall.id).toMatch(/\.png$/);
      expect(wall.label.length, wall.id).toBeGreaterThan(3);
      expect(wall.tone, wall.id).toMatch(/^#[0-9a-f]{6}$/i);
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
