import { describe, expect, it } from "vitest";
import { fabFor, fabVisible } from "@/lib/fab";

/**
 * Le bouton flottant ne doit jamais mentir sur ce qu'il crée.
 *
 * Ces tests tiennent la carte page → action : c'est la partie qu'on casse en
 * silence quand une adresse change, et le symptôme serait un « + » qui ouvre
 * une page sans rapport.
 */
describe("bouton de création", () => {
  it("crée un projet à la racine des espaces", () => {
    expect(fabFor("/spaces")).toEqual([
      { kind: "project", label: "Nouveau projet", to: "/spaces?new=1" },
    ]);
  });

  it("crée un vault dans un projet", () => {
    expect(fabFor("/spaces/p-these")).toEqual([
      { kind: "vault", label: "Nouveau vault", to: "/spaces/p-these?new=1" },
    ]);
  });

  it("crée une fiche dans un vault", () => {
    expect(fabFor("/vault/v-eco")).toEqual([
      { kind: "card", label: "Nouvelle fiche", to: "/vault/v-eco/new" },
    ]);
  });

  it("crée une note libre dans la bibliothèque et dans Apprendre", () => {
    for (const path of ["/", "/learn", "/learn/x-1"]) {
      expect(fabFor(path)).toEqual([
        { kind: "note", label: "Nouvelle note", to: "/new" },
      ]);
    }
  });

  it("disparaît là où il n’y a rien à créer", () => {
    for (const path of [
      "/settings",
      "/settings/navigation",
      "/settings/cards",
      "/review",
      "/review/session",
      "/spaces/p-these/graph",
      "/vault/v-eco/graph",
      "/vault/v-eco/new",
      "/note/n-contrats",
      "/new",
      "/preview",
    ]) {
      expect(fabVisible(path)).toBe(false);
    }
  });

  it("ne propose jamais deux fois la même cible sur une page", () => {
    for (const path of ["/", "/learn", "/spaces", "/spaces/p-these", "/vault/v-eco"]) {
      const targets = fabFor(path).map((action) => action.to);
      expect(new Set(targets).size).toBe(targets.length);
    }
  });
});
