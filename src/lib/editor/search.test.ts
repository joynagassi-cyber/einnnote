import { describe, expect, it } from "vitest";
import { findMatches, replaceAll, stepMatch } from "@/lib/editor/search";

/**
 * La recherche est désormais **pure** : on lui donne du texte, elle rend des
 * intervalles. Ces tests n’ont donc besoin ni de navigateur, ni d’éditeur, ni
 * de DOM — c’est exactement ce qu’on voulait en détachant le moteur.
 */

describe("findMatches", () => {
  it("trouve toutes les occurrences, dans l’ordre", () => {
    expect(findMatches("le chat et le chien", "le")).toEqual([
      { from: 0, to: 2 },
      { from: 11, to: 13 },
    ]);
  });

  it("ignore la casse sans déplacer les intervalles", () => {
    expect(findMatches("Chat, chat, CHAT", "chat")).toEqual([
      { from: 0, to: 4 },
      { from: 6, to: 10 },
      { from: 12, to: 16 },
    ]);
  });

  it("ne chevauche pas deux occurrences", () => {
    expect(findMatches("aaaa", "aa")).toEqual([
      { from: 0, to: 2 },
      { from: 2, to: 4 },
    ]);
  });

  it("accepte les accents et les apostrophes typographiques", () => {
    expect(findMatches("l’élève écrit l’élève", "élève")).toEqual([
      { from: 2, to: 7 },
      { from: 16, to: 21 },
    ]);
    expect(findMatches("l’élève", "l’élève")[0].to).toBe("l’élève".length);
  });

  it("ignore les espaces autour de la requête", () => {
    expect(findMatches("une note", "  note  ")).toEqual([{ from: 4, to: 8 }]);
  });

  it("rend une liste vide pour une requête vide ou absente", () => {
    expect(findMatches("une note", "")).toEqual([]);
    expect(findMatches("une note", "   ")).toEqual([]);
  });

  it("rend une liste vide quand rien ne correspond", () => {
    expect(findMatches("une note", "livre")).toEqual([]);
  });

  it("trouve une occurrence en début et en fin de texte", () => {
    const text = "note au milieu d’une note";
    const matches = findMatches(text, "note");
    expect(matches).toHaveLength(2);
    expect(matches[0].from).toBe(0);
    expect(matches[1].to).toBe(text.length);
    expect(text.slice(matches[1].from, matches[1].to)).toBe("note");
  });

  it("compte les occurrences d’un mot répété sur plusieurs lignes", () => {
    const text = "idée\nidée\nidée";
    const matches = findMatches(text, "idée");
    expect(matches).toHaveLength(3);
    expect(matches.map((match) => text.slice(match.from, match.to))).toEqual([
      "idée",
      "idée",
      "idée",
    ]);
  });
});

describe("stepMatch", () => {
  const matches = findMatches("un deux trois deux", "deux");

  it("avance à l’occurrence suivante", () => {
    expect(stepMatch(matches, 0, 1)).toBe(1);
  });

  it("revient à l’occurrence précédente", () => {
    expect(stepMatch(matches, 1, -1)).toBe(0);
  });

  it("boucle par le début en avançant après la dernière", () => {
    expect(stepMatch(matches, 1, 1)).toBe(0);
  });

  it("boucle par la fin en reculant avant la première", () => {
    expect(stepMatch(matches, 0, -1)).toBe(1);
  });

  it("démarre sur la première quand rien n’est actif", () => {
    expect(stepMatch(matches, -1, 1)).toBe(0);
  });

  it("signale l’absence de résultat par -1", () => {
    expect(stepMatch([], 0, 1)).toBe(-1);
    expect(stepMatch([], -1, -1)).toBe(-1);
  });

  it("reste sur la même occurrence quand il n’y en a qu’une", () => {
    const single = findMatches("note", "note");
    expect(stepMatch(single, 0, 1)).toBe(0);
    expect(stepMatch(single, 0, -1)).toBe(0);
  });
});

describe("replaceAll", () => {
  it("remplace toutes les occurrences et compte", () => {
    expect(replaceAll("le chat, le chien, le rat", "le", "un")).toEqual({
      text: "un chat, un chien, un rat",
      count: 3,
    });
  });

  it("préserve la casse du texte remplacé par la chaîne fournie", () => {
    expect(replaceAll("Note et note", "note", "fiche")).toEqual({
      text: "fiche et fiche",
      count: 2,
    });
  });

  it("accepte un remplacement vide — c’est « tout supprimer »", () => {
    expect(replaceAll("a-b-a", "a", "")).toEqual({ text: "-b-", count: 2 });
  });

  it("gère les accents", () => {
    expect(replaceAll("idée, idée", "idée", "concept")).toEqual({
      text: "concept, concept",
      count: 2,
    });
  });

  it("ne touche à rien quand rien ne correspond", () => {
    expect(replaceAll("une note", "livre", "roman")).toEqual({
      text: "une note",
      count: 0,
    });
  });

  it("ne touche à rien pour une requête vide", () => {
    expect(replaceAll("une note", "", "roman")).toEqual({ text: "une note", count: 0 });
  });

  it("ne remplace pas à l’infini quand le remplacement contient la requête", () => {
    expect(replaceAll("aa", "a", "aa")).toEqual({ text: "aaaa", count: 2 });
  });

  it("laisse les sauts de ligne intacts", () => {
    expect(replaceAll("un\ndeux\nun", "un", "trois")).toEqual({
      text: "trois\ndeux\ntrois",
      count: 2,
    });
  });
});
