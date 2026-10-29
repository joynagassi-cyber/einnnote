import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFS,
  activePrefCount,
  columnsFor,
  columnsLabel,
  compareValues,
  groupItems,
  sortItems,
  type DisplayFields,
} from "@/lib/display";

interface Row {
  id: string;
  title: string;
  project: string;
  due: number;
  updated: string;
}

const rows: Row[] = [
  { id: "a", title: "Zébu", project: "Thèse", due: 3, updated: "2026-10-01T10:00:00.000Z" },
  { id: "b", title: "abricot", project: "Perso", due: 0, updated: "2026-10-20T10:00:00.000Z" },
  { id: "c", title: "Cèdre", project: "Thèse", due: 3, updated: "2026-10-10T10:00:00.000Z" },
];

const fields: DisplayFields<Row> = {
  title: { label: "Titre", value: (row) => row.title },
  project: { label: "Projet", value: (row) => row.project },
  due: { label: "À revoir", value: (row) => row.due, type: "number" },
  updated: { label: "Modifié", value: (row) => row.updated, type: "date" },
};

const ids = (list: Row[]) => list.map((row) => row.id);

describe("affichage et tri", () => {
  it("trie le texte en français, accents et casse ignorés", () => {
    expect(ids(sortItems(rows, fields, ["title"]))).toEqual(["b", "c", "a"]);
  });

  it("trie les nombres et les dates dans le bon sens", () => {
    expect(ids(sortItems(rows, fields, ["due"]))).toEqual(["b", "a", "c"]);
    expect(ids(sortItems(rows, fields, ["updated"]))).toEqual(["a", "c", "b"]);
  });

  it("applique le tri secondaire seulement à égalité", () => {
    const ordered = sortItems(rows, fields, ["due", "title"]);
    expect(ids(ordered)).toEqual(["b", "c", "a"]);
  });

  it("reste stable quand tout est égal", () => {
    const same = rows.map((row) => ({ ...row, due: 1 }));
    expect(ids(sortItems(same, fields, ["due"]))).toEqual(["a", "b", "c"]);
  });

  it("ignore une clé inconnue au lieu de casser", () => {
    expect(ids(sortItems(rows, fields, ["inconnu"]))).toEqual(["a", "b", "c"]);
    expect(ids(sortItems(rows, fields, [null, undefined]))).toEqual(["a", "b", "c"]);
  });

  it("regroupe sans perdre l’ordre interne", () => {
    const groups = groupItems(rows, fields, "project");
    expect(groups.map((group) => group.label)).toEqual(["Perso", "Thèse"]);
    expect(ids(groups[1].items)).toEqual(["a", "c"]);
  });

  it("rend un groupe unique quand aucun regroupement n’est demandé", () => {
    const groups = groupItems(rows, fields, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(3);
    expect(groupItems([], fields, null)).toEqual([]);
  });

  it("regroupe les valeurs vides sous un séparateur lisible", () => {
    const withEmpty = [...rows, { ...rows[0], id: "d", project: "" }];
    const groups = groupItems(withEmpty, fields, "project");
    expect(groups.some((group) => group.label === "—")).toBe(true);
  });

  it("borne les colonnes et lit « auto »", () => {
    expect(columnsFor({ ...DEFAULT_PREFS, columns: "auto" }, { fallback: 2 })).toBe(2);
    expect(columnsFor({ ...DEFAULT_PREFS, columns: 9 }, { fallback: 2, max: 4 })).toBe(4);
    expect(columnsFor({ ...DEFAULT_PREFS, columns: 0 }, { fallback: 2, min: 1 })).toBe(1);
    expect(columnsLabel({ ...DEFAULT_PREFS, columns: 3 })).toBe("3 col.");
    expect(columnsLabel(DEFAULT_PREFS)).toBe("auto");
  });

  it("compte les écarts au réglage par défaut", () => {
    expect(activePrefCount(DEFAULT_PREFS, DEFAULT_PREFS)).toBe(0);
    expect(
      activePrefCount(
        { ...DEFAULT_PREFS, columns: 3, groupBy: "project" },
        DEFAULT_PREFS,
      ),
    ).toBe(2);
  });

  it("compare sans jamais produire NaN", () => {
    expect(compareValues("a", "b", "text")).toBeLessThan(0);
    expect(compareValues(2, 10, "number")).toBeLessThan(0);
    expect(compareValues(Number.NaN, 0, "number")).toBe(0);
    expect(compareValues("2026-01-01", "2026-02-01", "date")).toBeLessThan(0);
  });
});
