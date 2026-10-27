import { describe, expect, it } from "vitest";
import { levelsOf, placeColumns, placeFrieze } from "@/lib/mindmap/levels";
import type { TemplateNode } from "@/lib/mindmap/layout";

const deep: TemplateNode = {
  key: "a",
  text: "a",
  children: [
    { key: "b", text: "b", children: [{ key: "c", text: "c", children: [{ key: "d", text: "d" }] }] },
    { key: "e", text: "e", children: [{ key: "f", text: "f" }] },
  ],
};

const SIZE = { width: 208, height: 84 };

describe("niveaux (colonnes, frise)", () => {
  it("descend toute la profondeur, pas seulement deux niveaux", () => {
    const levels = levelsOf(deep);
    expect(levels.map((level) => level.key)).toEqual(["a", "b", "e", "c", "f", "d"]);
    expect(Math.max(...levels.map((level) => level.depth))).toBe(3);
  });

  it("ne boucle pas sur un cycle", () => {
    const cyclic: TemplateNode = { key: "x", text: "x", children: [] };
    cyclic.children = [{ key: "y", text: "y", children: [cyclic] }];
    const levels = levelsOf(cyclic);
    expect(levels.map((level) => level.key)).toEqual(["x", "y"]);
  });

  it("place chaque nœud une seule fois, sans chevauchement", () => {
    for (const place of [placeColumns, placeFrieze]) {
      const boxes = place(deep, SIZE);
      expect(boxes.map((box) => box.key).sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          const overlap =
            a.x < b.x + SIZE.width &&
            a.x + SIZE.width > b.x &&
            a.y < b.y + SIZE.height &&
            a.y + SIZE.height > b.y;
          expect(overlap, `${a.key} ↔ ${b.key}`).toBe(false);
        }
      }
    }
  });

  it("avance d’une colonne par niveau", () => {
    const boxes = placeColumns(deep, SIZE);
    const xByDepth = new Map<number, number>();
    for (const box of boxes) xByDepth.set(box.depth, box.x);
    expect(new Set(xByDepth.values()).size).toBe(4);
  });
});
