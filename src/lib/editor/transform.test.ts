import { describe, expect, it } from "vitest";
import { applyCase, CASE_MODES } from "@/lib/editor/host";
import { todayLabel } from "@/lib/editor/transform";

/**
 * Changer la casse : le passage change de forme, **jamais** de mise en forme.
 * La transformation est désormais une fonction pure du contrat de l’éditeur ;
 * les quatre modes se vérifient donc sans navigateur ni document.
 */

describe("applyCase", () => {
  it("met en majuscules", () => {
    expect(applyCase("une note", "upper")).toBe("UNE NOTE");
  });

  it("met en minuscules", () => {
    expect(applyCase("UNE NOTE", "lower")).toBe("une note");
  });

  it("met une capitale en tête de phrase", () => {
    expect(applyCase("une NOTE à retenir", "sentence")).toBe("Une note à retenir");
  });

  it("met une capitale à chaque mot", () => {
    expect(applyCase("conditions de validité", "capitalize")).toBe(
      "Conditions De Validité",
    );
  });

  it("capitalise aussi après un tiret cadratin et une ponctuation", () => {
    expect(applyCase("l’élève — son accord", "capitalize")).toBe("L’élève — Son Accord");
  });

  it("laisse accents et apostrophes typographiques intacts", () => {
    expect(applyCase("l’élève", "upper")).toBe("L’ÉLÈVE");
  });

  it("accepte une chaîne vide", () => {
    expect(applyCase("", "sentence")).toBe("");
    expect(applyCase("", "capitalize")).toBe("");
  });
});

describe("CASE_MODES", () => {
  it("annonce les quatre modes, en français", () => {
    expect(CASE_MODES.map((item) => item.mode)).toEqual([
      "upper",
      "lower",
      "sentence",
      "capitalize",
    ]);
    for (const item of CASE_MODES) {
      expect(item.label.length).toBeGreaterThan(1);
      expect(item.hint).toContain("→");
    }
  });
});

describe("todayLabel", () => {
  it("écrit la date en toutes lettres, en français", () => {
    expect(todayLabel(new Date("2026-03-09T10:00:00"))).toBe("9 mars 2026");
  });

  it("n’utilise jamais le format machine", () => {
    const label = todayLabel(new Date("2026-03-09T10:00:00"));
    expect(label).not.toContain("2026-03");
    expect(label).not.toContain("/");
  });
});
