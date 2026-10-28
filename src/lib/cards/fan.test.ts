import { describe, expect, it } from "vitest";
import {
  fanLayout,
  fanMultiplier,
  fanPerSide,
  slotGeometry,
} from "@/lib/cards/fan";

/**
 * Géométrie de l’éventail : c’est la partie qu’on peut vérifier sans
 * navigateur, et celle qui casse en silence (cartes hors cadre, ordre inversé,
 * centre perdu). Le rendu, lui, se juge à l’œil.
 */
describe("slotGeometry", () => {
  it("pose la carte centrale droite, à l’échelle 1, au premier plan", () => {
    expect(slotGeometry(0, 3)).toMatchObject({
      rotation: 0,
      x: 0,
      y: 0,
      scale: 1,
      zIndex: 10,
    });
  });

  it("incline et rétrécit davantage à mesure qu’on s’éloigne", () => {
    const near = slotGeometry(1, 3);
    const far = slotGeometry(3, 3);
    expect(Math.abs(far.rotation)).toBeGreaterThan(Math.abs(near.rotation));
    expect(far.scale).toBeLessThan(near.scale);
    expect(far.zIndex).toBeLessThan(near.zIndex);
  });

  it("reste symétrique : gauche et droite sont opposées", () => {
    const left = slotGeometry(-2, 3);
    const right = slotGeometry(2, 3);
    expect(left.rotation).toBe(-right.rotation);
    expect(left.x).toBe(-right.x);
    expect(left.y).toBe(right.y);
    expect(left.scale).toBe(right.scale);
  });

  it("borne l’arc : au-delà de la portée, la carte ne part pas plus loin", () => {
    expect(slotGeometry(9, 3)).toEqual(slotGeometry(3, 3));
    expect(slotGeometry(-9, 3)).toEqual(slotGeometry(-3, 3));
  });

  it("ne divise jamais par zéro", () => {
    expect(slotGeometry(2, 0)).toMatchObject({ rotation: 0, x: 0, scale: 1 });
  });
});

describe("fanLayout", () => {
  it("répartit tout l’arc quand il y a peu de fiches", () => {
    const layout = fanLayout(3, 0, 3);
    expect(layout).toHaveLength(3);
    expect(layout.map((entry) => entry.index)).toEqual([0, 1, 2]);
    // trois fiches : une à gauche, une au centre, une à droite
    expect(layout[0].geometry.rotation).toBeLessThan(0);
    expect(layout[1].geometry.rotation).toBe(0);
    expect(layout[2].geometry.rotation).toBeGreaterThan(0);
  });

  it("fait le tour du coffre sans jamais dépasser la taille", () => {
    const layout = fanLayout(10, 0, 3);
    // la carte au centre est l’index 0 ; à sa gauche, la dernière du coffre
    expect(layout[3].index).toBe(0);
    expect(layout[2].index).toBe(9);
    expect(layout.every((entry) => entry.index >= 0 && entry.index < 10)).toBe(true);
  });

  it("avance d’une fiche quand le centre avance", () => {
    const first = fanLayout(12, 0, 3).map((entry) => entry.index);
    const next = fanLayout(12, 1, 3).map((entry) => entry.index);
    expect(next[3]).toBe(1);
    expect(first[3]).toBe(0);
  });

  it("affiche sept cartes sur bureau, cinq sur téléphone", () => {
    expect(fanLayout(20, 0, 3)).toHaveLength(7);
    expect(fanLayout(20, 0, 2)).toHaveLength(5);
  });

  it("ne renvoie rien pour un coffre vide", () => {
    expect(fanLayout(0, 0, 3)).toEqual([]);
  });
});

describe("responsive", () => {
  it("resserre l’éventail sur un écran étroit", () => {
    expect(fanMultiplier(390)).toBeLessThan(fanMultiplier(768));
    expect(fanMultiplier(1440)).toBe(1);
  });

  it("réduit le nombre de cartes visibles sur téléphone", () => {
    expect(fanPerSide(390)).toBe(2);
    expect(fanPerSide(1280)).toBe(3);
  });
});
