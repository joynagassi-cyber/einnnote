import { describe, expect, it } from "vitest";
import {
  activeTagQuery,
  buildTagIndex,
  findTags,
  normalizeTagName,
  rankTags,
  renameTagInBlocks,
  tagKey,
  tagsInBlocks,
  tagsInText,
} from "@/lib/editor/tags";
import type { Block, Tag } from "@/types";

const block = (html: string): Block => ({
  id: "b1",
  html,
  kind: "p",
  bullet: false,
  indent: 0,
});

const note = (html: string) => ({ blocks: [block(html)] });

const registry = (names: string[]): Tag[] =>
  names.map((name, index) => ({
    id: `t-${index}`,
    name,
    createdAt: "2026-01-01T00:00:00.000Z",
  }));

describe("étiquettes — lecture du texte", () => {
  it("trouve les étiquettes, accents et hiérarchie comprises", () => {
    expect(findTags("Une #idée et #chapitre/3, puis #à-relire.")).toEqual([
      { name: "idée", start: 4, end: 9 },
      { name: "chapitre/3", start: 13, end: 24 },
      { name: "à-relire", start: 31, end: 40 },
    ]);
  });

  it("n’ouvre pas une étiquette au milieu d’un mot", () => {
    expect(tagsInText("C# et prix#2 et foo#bar")).toEqual([]);
  });

  it("accepte une étiquette en début de ligne ou après une ponctuation", () => {
    expect(tagsInText("#début")).toEqual(["début"]);
    expect(tagsInText("(voir #annexe)")).toEqual(["annexe"]);
    expect(tagsInText("«#citation»")).toEqual(["citation"]);
  });

  it("ne confond pas un titre Markdown avec une étiquette", () => {
    expect(tagsInText("# Titre")).toEqual([]);
    expect(tagsInText("## Sous-titre")).toEqual([]);
  });

  it("dédoublonne sans tenir compte de la casse, en gardant la première graphie", () => {
    expect(tagsInText("#Méthode puis #méthode")).toEqual(["Méthode"]);
  });

  it("lit une étiquette dans le HTML stocké, balises comprises", () => {
    const blocks = [block("Un <strong>mot</strong> puis #idée"), block("Encore #idée")];
    expect(tagsInBlocks(blocks)).toEqual(["idée"]);
  });
});

describe("étiquettes — l’étiquette en cours de frappe", () => {
  it("reconnaît le `#` collé au curseur", () => {
    expect(activeTagQuery("Une idée #méth")).toEqual({ start: 9, query: "méth" });
  });

  it("rend une requête vide juste après le `#`", () => {
    expect(activeTagQuery("Texte #")).toEqual({ start: 6, query: "" });
  });

  it("ne s’ouvre pas après une espace, ni au milieu d’un mot", () => {
    expect(activeTagQuery("Une idée #méth ")).toBeNull();
    expect(activeTagQuery("C#")).toBeNull();
    expect(activeTagQuery("rien à voir")).toBeNull();
  });

  it("normalise et valide les noms", () => {
    expect(normalizeTagName("  #Méthode ")).toBe("Méthode");
    expect(normalizeTagName("deux mots")).toBeNull();
    expect(normalizeTagName("ponctuation!")).toBeNull();
    expect(tagKey("#MÉTHODE")).toBe("méthode");
  });
});

describe("étiquettes — la base propose", () => {
  const index = buildTagIndex(
    [note("#idée et #méthode"), note("#méthode")],
    registry(["méthode", "ancienne"]),
  );

  it("compte les notes qui portent chaque étiquette", () => {
    expect(index[0]).toMatchObject({ name: "méthode", count: 2 });
    expect(index[1]).toMatchObject({ name: "idée", count: 1 });
  });

  it("garde une étiquette connue mais plus utilisée, à zéro", () => {
    expect(index.find((tag) => tag.key === "ancienne")?.count).toBe(0);
  });

  it("ignore les notes en corbeille", () => {
    const withTrash = buildTagIndex(
      [{ blocks: [block("#poubelle")], deletedAt: "2026-01-01" }],
      [],
    );
    expect(withTrash).toEqual([]);
  });

  it("propose le préfixe avant le contenu", () => {
    const ranked = rankTags(index, "méth");
    expect(ranked[0].name).toBe("méthode");
  });

  it("rend la liste entière quand rien n’est tapé", () => {
    expect(rankTags(index, "").length).toBe(index.length);
  });

  it("filtre ce qui ne correspond pas", () => {
    expect(rankTags(index, "zzz")).toEqual([]);
  });

  it("borne le nombre de propositions", () => {
    const many = buildTagIndex([], registry(Array.from({ length: 20 }, (_, i) => `t${i}`)));
    expect(rankTags(many, "", 8)).toHaveLength(8);
  });
});

describe("étiquettes — renommage", () => {
  it("réécrit le texte des notes, pas seulement la base", () => {
    const { blocks, changed } = renameTagInBlocks(
      [block("Une #idée, puis #idée.")],
      "idée",
      "concept",
    );
    expect(changed).toBe(2);
    expect(blocks[0].html).toBe("Une #concept, puis #concept.");
  });

  it("ne touche pas un nom plus long qui commence pareil", () => {
    const { blocks, changed } = renameTagInBlocks(
      [block("#artisan et #art")],
      "art",
      "dessin",
    );
    expect(changed).toBe(1);
    expect(blocks[0].html).toBe("#artisan et #dessin");
  });

  it("ne réécrit jamais une adresse dans un attribut", () => {
    const { changed } = renameTagInBlocks(
      [block('<a href="#ancre">lien</a>')],
      "ancre",
      "cible",
    );
    expect(changed).toBe(0);
  });

  it("ne fait rien quand le nom est invalide ou identique", () => {
    expect(renameTagInBlocks([block("#a")], "a", "deux mots").changed).toBe(0);
    expect(renameTagInBlocks([block("#a")], "a", "A").changed).toBe(0);
  });
});
