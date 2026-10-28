import { describe, expect, it } from "vitest";
import { LOOSE_NODE, projectGraphModel, projectLayout } from "@/lib/graph/project";
import type { ZettelCard, ZettelVault } from "@/types";

/**
 * Le graphe d'un projet relie des **vaults**, pas des fiches.
 *
 * Ce qui doit être vrai : un renvoi qui reste dans le même vault ne crée pas
 * d'arête, un renvoi qui traverse en crée une, et un vault que personne ne cite
 * est signalé comme isolé plutôt que silencieusement retiré.
 */

const card = (
  code: string,
  vaultId: string,
  refs: string[] = [],
): ZettelCard => ({
  id: `id-${code}`,
  code,
  vaultId,
  title: `Fiche ${code}`,
  body: "",
  source: "Source",
  refs,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}) as ZettelCard;

const vault = (id: string, name: string): ZettelVault => ({ id, name, projectId: "p1" });

describe("graphe du projet", () => {
  const vaults = [vault("v1", "Économie"), vault("v2", "Travail"), vault("v3", "Monnaie")];
  const cards = [
    card("#1A", "v1"),
    card("#1A1", "v1", ["#1A"]), // renvoi interne : aucune arête
    card("#2A", "v2", ["#1A"]), // traverse v2 → v1
    card("#2B", "v2", ["#1A1"]), // traverse encore v2 → v1
    card("#3A", "v3", ["#ZZZ"]), // renvoi pendant : ignoré
  ];

  it("fait une arête par vault cité, avec son poids", () => {
    const model = projectGraphModel({ vaults, cards });
    expect(model.edges).toHaveLength(1);
    expect(model.edges[0]).toMatchObject({ from: "v2", to: "v1", weight: 2 });
    // quelques codes pour l'infobulle, jamais tout le vault
    expect(model.edges[0].samples.length).toBeLessThanOrEqual(3);
  });

  it("compte les renvois entrants et sortants de chaque vault", () => {
    const model = projectGraphModel({ vaults, cards });
    const byId = new Map(model.nodes.map((node) => [node.id, node]));
    expect(byId.get("v2")?.outgoing).toBe(2);
    expect(byId.get("v1")?.incoming).toBe(2);
    expect(byId.get("v1")?.count).toBe(2);
  });

  it("signale les vaults qui ne parlent à personne", () => {
    const model = projectGraphModel({ vaults, cards });
    expect(model.isolated).toEqual(["v3"]);
  });

  it("ignore un renvoi qui ne pointe nulle part", () => {
    const model = projectGraphModel({
      vaults,
      cards: [card("#1A", "v1", ["#9Z"])],
    });
    expect(model.edges).toEqual([]);
    expect(model.nodes.every((node) => node.outgoing === 0)).toBe(true);
  });

  it("ajoute les fiches hors vault comme un nœud à part", () => {
    const model = projectGraphModel({
      vaults,
      cards,
      looseCards: [card("#4A", "aucun", ["#1A"])],
    });
    const loose = model.nodes.find((node) => node.id === LOOSE_NODE);
    expect(loose).toMatchObject({ kind: "loose", count: 1, outgoing: 1 });
    expect(model.edges.some((edge) => edge.from === LOOSE_NODE)).toBe(true);
  });

  it("place les isolés sur un cercle plus large", () => {
    const model = projectGraphModel({ vaults, cards });
    const positions = projectLayout(model, { radius: 200 });
    const v3 = positions.get("v3")!;
    const v1 = positions.get("v1")!;
    const distance = (point: { x: number; y: number }) =>
      Math.round(Math.hypot(point.x, point.y));
    expect(distance(v3)).toBeGreaterThan(distance(v1));
  });
});
