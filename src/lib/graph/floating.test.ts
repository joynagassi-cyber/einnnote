import { describe, expect, it } from "vitest";
import {
  borderPoint,
  floatingCurve,
  floatingParams,
  ribbonPath,
  stepPath,
  type Box,
} from "@/lib/graph/floating";

const box = (x: number, y: number, width = 200, height = 80): Box => ({
  x,
  y,
  width,
  height,
});

const onBorder = (point: { x: number; y: number }, target: Box, epsilon = 0.001) => {
  const left = Math.abs(point.x - target.x);
  const right = Math.abs(point.x - (target.x + target.width));
  const top = Math.abs(point.y - target.y);
  const bottom = Math.abs(point.y - (target.y + target.height));
  const horizontals = Math.min(left, right);
  const verticals = Math.min(top, bottom);
  return Math.min(horizontals, verticals) <= epsilon;
};

describe("arêtes flottantes", () => {
  it("sort par le bord droit quand la cible est à droite", () => {
    const a = box(0, 0);
    const b = box(400, 0);
    const { point, side } = borderPoint(a, b);
    expect(side).toBe("right");
    expect(point.x).toBeCloseTo(200, 5);
    expect(point.y).toBeCloseTo(40, 5);
  });

  it("sort par le haut quand la cible est au-dessus", () => {
    const { point, side } = borderPoint(box(0, 0), box(0, -400));
    expect(side).toBe("top");
    expect(point.y).toBeCloseTo(0, 5);
    expect(point.x).toBeCloseTo(100, 5);
  });

  it("utilise la largeur de CHAQUE boîte, pas celle du voisin", () => {
    // L’exemple React Flow d’origine réutilise la largeur de la source pour la
    // cible : avec deux tailles différentes, le point d’arrivée sort de la boîte.
    const small = box(0, 0, 80, 80);
    const wide = box(600, 200, 400, 100);
    const { sx, sy, tx, ty } = floatingParams(small, wide);
    expect(onBorder({ x: sx, y: sy }, small)).toBe(true);
    expect(onBorder({ x: tx, y: ty }, wide)).toBe(true);
  });

  it("reste stable si les deux boîtes sont au même endroit", () => {
    const { sx, sy, tx, ty } = floatingParams(box(10, 10), box(10, 10));
    for (const value of [sx, sy, tx, ty]) expect(Number.isFinite(value)).toBe(true);
    expect(floatingCurve({ sx, sy, tx, ty, sourceSide: "right", targetSide: "left" })).not.toMatch(
      /NaN/,
    );
  });

  it("dessine une courbe cubique qui part et arrive aux deux bords", () => {
    const params = floatingParams(box(0, 0), box(400, 300));
    const path = floatingCurve(params);
    const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(numbers[0]).toBeCloseTo(params.sx, 1);
    expect(numbers[1]).toBeCloseTo(params.sy, 1);
    expect(numbers[numbers.length - 2]).toBeCloseTo(params.tx, 1);
    expect(numbers[numbers.length - 1]).toBeCloseTo(params.ty, 1);
    expect(path.match(/C/g)).toHaveLength(1);
  });

  it("produit un chemin orthogonal fermé pour les styles « circuit »", () => {
    const path = stepPath(floatingParams(box(0, 0), box(400, 300)));
    expect(path.startsWith("M ")).toBe(true);
    expect(path).toContain("Q");
    expect(path).not.toMatch(/NaN|Infinity/);
  });

  it("produit un ruban refermé, plus large au départ qu’à l’arrivée", () => {
    const path = ribbonPath(floatingParams(box(0, 0), box(400, 200)), {
      startWidth: 10,
      endWidth: 2,
      steps: 8,
    });
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).not.toMatch(/NaN/);
    // 2 × (steps + 1) sommets
    expect(path.match(/[ML] /g)).toHaveLength(18);
  });

  it("reste fini pour un déplacement purement vertical ou horizontal", () => {
    const cases: [Box, Box][] = [
      [box(0, 0), box(0, 500)],
      [box(0, 0), box(500, 0)],
      [box(0, 0), box(0.0000001, 0)],
    ];
    for (const [a, b] of cases) {
      const params = floatingParams(a, b);
      expect(floatingCurve(params)).not.toMatch(/NaN|Infinity/);
      expect(ribbonPath(params)).not.toMatch(/NaN|Infinity/);
    }
  });
});
