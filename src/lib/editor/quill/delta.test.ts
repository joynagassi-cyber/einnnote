import { describe, expect, it } from "vitest";
import type { Block } from "@/types";
import {
  FORMAT,
  blocksToDelta,
  deltaToBlocks,
  inlineToHtml,
  lineFormats,
  parseInline,
} from "@/lib/editor/quill/delta";

/**
 * Le pont Quill.
 *
 * Ce fichier est la partie **vérifiable sans navigateur** de l’éditeur : un
 * bloc doit traverser l’aller-retour sans perdre son `id`, son type, son
 * retrait ni sa mise en forme. Tout le reste (frappe, souris, sélection) est
 * testé à l’écran.
 */

function block(partial: Partial<Block> & Pick<Block, "id">): Block {
  return {
    html: "",
    kind: "p",
    bullet: false,
    indent: 0,
    ...partial,
  };
}

describe("Blocs → Delta", () => {
  it("met un attribut de ligne par bloc, avec son identité", () => {
    const delta = blocksToDelta([
      block({ id: "b1", kind: "h2", html: "Plan" }),
      block({ id: "b2", html: "Texte" }),
    ]);

    /* L’identité est un attribut de **ligne** : le texte n’a pas à la porter,
       sinon elle serait recopiée à chaque fragment et le Delta grossirait. */
    expect(delta.ops).toEqual([
      { insert: "Plan" },
      { insert: "\n", attributes: { [FORMAT.blockId]: "b1", header: 2 } },
      { insert: "Texte" },
      { insert: "\n", attributes: { [FORMAT.blockId]: "b2" } },
    ]);
  });

  it("traduit les listes et les tâches en formats Quill natifs", () => {
    expect(lineFormats(block({ id: "a", bullet: true })).list).toBe("bullet");
    expect(lineFormats(block({ id: "a", ordered: true })).list).toBe("ordered");
    expect(lineFormats(block({ id: "a", task: true })).list).toBe("unchecked");
    expect(lineFormats(block({ id: "a", task: true, checked: true })).list).toBe("checked");
  });

  it("garde le filet de séparation comme une ligne sans texte", () => {
    const delta = blocksToDelta([block({ id: "rule-1", kind: "rule" })]);
    expect(delta.ops).toEqual([
      { insert: "\n", attributes: { [FORMAT.blockId]: "rule-1", [FORMAT.rule]: true } },
    ]);
  });

  it("produit une ligne vide pour une note vide", () => {
    expect(blocksToDelta([]).ops).toEqual([{ insert: "\n" }]);
  });
});

describe("Delta → blocs", () => {
  it("rend les identités, les types et les attributs", () => {
    const blocks = deltaToBlocks({
      ops: [
        { insert: "Titre" },
        { insert: "\n", attributes: { [FORMAT.blockId]: "b1", header: 1 } },
        { insert: "Citation" },
        { insert: "\n", attributes: { [FORMAT.blockId]: "b2", blockquote: true } },
        { insert: "Une puce" },
        {
          insert: "\n",
          attributes: { [FORMAT.blockId]: "b3", list: "bullet", indent: 2 },
        },
        { insert: "Une tâche" },
        { insert: "\n", attributes: { [FORMAT.blockId]: "b4", list: "checked" } },
      ],
    });

    expect(blocks).toEqual([
      { id: "b1", html: "Titre", kind: "h1", bullet: false, indent: 0 },
      { id: "b2", html: "Citation", kind: "quote", bullet: false, indent: 0 },
      { id: "b3", html: "Une puce", kind: "p", bullet: true, indent: 2 },
      {
        id: "b4",
        html: "Une tâche",
        kind: "p",
        bullet: false,
        task: true,
        checked: true,
        indent: 0,
      },
    ]);
  });

  it("invente un identifiant quand la ligne n’en porte pas", () => {
    const blocks = deltaToBlocks({ ops: [{ insert: "Sans id\n" }] }, () => "neuf");
    expect(blocks[0].id).toBe("neuf");
  });

  it("ne rend jamais zéro bloc", () => {
    expect(deltaToBlocks({ ops: [{ insert: "\n" }] }, () => "vide")).toEqual([
      { id: "vide", html: "", kind: "p", bullet: false, indent: 0 },
    ]);
  });

  it("remonte l’alignement et le marquage", () => {
    const [only] = deltaToBlocks({
      ops: [
        { insert: "Marqué" },
        { insert: "\n", attributes: { [FORMAT.blockId]: "b", align: "center", [FORMAT.marked]: true } },
      ],
    });
    expect(only.align).toBe("center");
    expect(only.marked).toBe(true);
  });
});

describe("Mise en forme en ligne", () => {
  it("reconnaît nos balises et rend les formats Quill", () => {
    const pieces = parseInline("<strong>gras</strong> et <em>penché</em>");
    expect(pieces).toEqual([
      { text: "gras", formats: { bold: true } },
      { text: " et ", formats: {} },
      { text: "penché", formats: { italic: true } },
    ]);
  });

  it("lit la couleur d’un surlignage", () => {
    expect(parseInline('<mark data-color="#f6e3a1">jaune</mark>')).toEqual([
      { text: "jaune", formats: { background: "#f6e3a1" } },
    ]);
  });

  it("lit un lien et son adresse", () => {
    expect(parseInline('<a href="https://exemple.fr">lien</a>')).toEqual([
      { text: "lien", formats: { link: "https://exemple.fr" } },
    ]);
  });

  it("ne laisse pas entrer une balise inconnue", () => {
    expect(parseInline("a<script>b</script>c")).toEqual([
      { text: "a", formats: {} },
      { text: "b", formats: {} },
      { text: "c", formats: {} },
    ]);
  });

  it("écrit un HTML stable, dans un ordre d’imbrication fixe", () => {
    expect(
      inlineToHtml([
        { text: "x", formats: { bold: true, italic: true, link: "https://a.fr" } },
      ]),
    ).toBe('<a href="https://a.fr"><strong><em>x</em></strong></a>');
  });

  it("convertit un rgb() de Quill en hexadécimal", () => {
    const [only] = deltaToBlocks({
      ops: [
        { insert: "surligné", attributes: { background: "rgb(246, 227, 161)" } },
        { insert: "\n" },
      ],
    });
    expect(only.html).toBe('<mark data-color="#f6e3a1">surligné</mark>');
  });

  it("ramène un saut de ligne interne à une espace — un bloc est une ligne", () => {
    expect(inlineToHtml(parseInline("avant<br>après"))).toBe("avant après");
  });
});

describe("Aller-retour", () => {
  const notes: Block[] = [
    block({ id: "a", kind: "h1", html: "Titre &amp; sous-titre" }),
    block({ id: "b", html: "<strong>gras</strong> et <em>penché</em>" }),
    block({ id: "c", html: '<mark data-color="#f6e3a1">jaune</mark>' }),
    block({ id: "d", html: '<a href="https://exemple.fr">lien</a>' }),
    block({ id: "e", html: "x<sup>2</sup> et H<sub>2</sub>O" }),
    block({ id: "f", kind: "quote", html: "Citation" }),
    block({ id: "g", bullet: true, indent: 1, html: "Puce" }),
    block({ id: "h", kind: "rule" }),
    block({ id: "i", task: true, checked: true, html: "Fait" }),
    block({ id: "j", align: "right", marked: true, html: "Marqué" }),
  ];

  it("rend exactement les mêmes blocs", () => {
    expect(deltaToBlocks(blocksToDelta(notes))).toEqual(notes);
  });

  it("survit à deux passages, sans dérive", () => {
    const once = deltaToBlocks(blocksToDelta(notes));
    const twice = deltaToBlocks(blocksToDelta(once));
    expect(twice).toEqual(once);
  });
});
