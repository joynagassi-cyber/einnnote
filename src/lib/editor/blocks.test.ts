import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { BlockMeta } from "@/lib/editor/extensions";
import {
  blocksToHtml,
  blocksToMarkdown,
  blocksToPlainText,
  docToBlocks,
  escapeHtml,
  nodeText,
  type PmNode,
} from "@/lib/editor/blocks";
import type { Block } from "@/types";

/** Même schéma que l’éditeur réel, sans interface. */
function parse(blocks: Block[]): PmNode {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
      }),
      BlockMeta,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
    ],
    content: blocksToHtml(blocks),
  });
  const json = editor.getJSON() as PmNode;
  editor.destroy();
  return json;
}

const roundTrip = (blocks: Block[]) => docToBlocks(parse(blocks));

const block = (patch: Partial<Block> & Pick<Block, "id" | "html">): Block => ({
  kind: "p",
  bullet: false,
  indent: 0,
  ...patch,
});

describe("pont blocs ↔ éditeur", () => {
  it("conserve identifiants, types, puces et retraits", () => {
    const blocks: Block[] = [
      block({ id: "b1", html: "Conditions de validité", kind: "h2" }),
      block({ id: "b2", html: "Consentement", bullet: true }),
      block({ id: "b3", html: "Capacité", bullet: true, indent: 1 }),
      block({ id: "b4", html: "Une citation", kind: "quote" }),
      block({ id: "b5", html: "Effets du contrat" }),
    ];
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it("conserve gras, italique, souligné, barré, code", () => {
    const blocks = [
      block({
        id: "b1",
        html: "Un <strong>mot</strong> <em>important</em> <u>souligné</u> <s>barré</s> <code>code</code>",
      }),
    ];
    expect(roundTrip(blocks)[0].html).toBe(blocks[0].html);
  });

  it("conserve la couleur d’un surlignage", () => {
    const blocks = [
      block({ id: "b1", html: '<mark data-color="#F6E3A1">passage</mark>' }),
    ];
    const result = roundTrip(blocks)[0].html;
    expect(result).toContain("<mark");
    expect(result).toContain("passage");
    expect(result).toMatch(/#F6E3A1/i);
  });

  it("conserve un lien et son adresse", () => {
    const blocks = [
      block({
        id: "b1",
        html: 'Voir <a href="https://example.org" rel="noopener noreferrer" target="_blank">le cours</a>',
      }),
    ];
    const html = roundTrip(blocks)[0].html;
    expect(html).toContain('href="https://example.org"');
    expect(html).toContain("le cours");
  });

  it("donne un identifiant neuf à un bloc créé dans l’éditeur", () => {
    const parsed = parse([block({ id: "b1", html: "Première ligne" })]);
    // simule la frappe : un second paragraphe sans data-block-id
    parsed.content = [
      ...(parsed.content ?? []),
      { type: "paragraph", attrs: { blockId: null }, content: [{ type: "text", text: "Seconde ligne" }] },
    ];
    const result = docToBlocks(parsed);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("b1");
    expect(result[1].id).toMatch(/^b-auto-/);
    expect(result[1].html).toBe("Seconde ligne");
  });

  it("conserve un titre de niveau 3, un filet et un exposant", () => {
    const blocks = [
      block({ id: "b1", html: "Détail", kind: "h3" }),
      block({ id: "b2", html: "E = mc<sup>2</sup> et H<sub>2</sub>O" }),
      block({ id: "b3", html: "", kind: "rule" }),
    ];
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it("conserve liste numérotée, case à cocher et alignement", () => {
    const blocks: Block[] = [
      block({ id: "b1", html: "Premier", ordered: true }),
      block({ id: "b2", html: "À faire", task: true }),
      block({ id: "b3", html: "Fait", task: true, checked: true }),
      block({ id: "b4", html: "Centré", align: "center" }),
    ];
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it("n’écrit pas de clés facultatives sur un bloc nu", () => {
    const [result] = roundTrip([block({ id: "b1", html: "Texte" })]);
    expect(result).toEqual({ id: "b1", html: "Texte", kind: "p", bullet: false, indent: 0 });
  });

  it("ne laisse pas passer de HTML actif", () => {
    const html = blocksToHtml([
      block({ id: "b1", html: 'Bonjour <script>alert("x")</script> <img src=x onerror=alert(1)>' }),
    ]);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).toContain("Bonjour");
  });

  it("échappe les caractères réservés du texte", () => {
    expect(escapeHtml('a & b < c > d "e"')).toBe(
      "a &amp; b &lt; c &gt; d &quot;e&quot;",
    );
  });

  it("extrait le texte brut d’un nœud", () => {
    expect(
      nodeText({
        type: "paragraph",
        content: [
          { type: "text", text: "a" },
          { type: "hardBreak" },
          { type: "text", text: "b" },
        ],
      }),
    ).toBe("a b");
  });
});

describe("exports", () => {
  const blocks: Block[] = [
    block({ id: "b1", html: "Titre", kind: "h1" }),
    block({ id: "b2", html: "Sous-titre", kind: "h2" }),
    block({ id: "b3", html: "<strong>Puce</strong>", bullet: true }),
    block({ id: "b4", html: "Puce décalée", bullet: true, indent: 1 }),
    block({ id: "b5", html: "Citation", kind: "quote" }),
    block({ id: "b6", html: "Texte avec <mark>surlignage</mark>" }),
  ];

  it("produit du Markdown lisible par Obsidian", () => {
    const markdown = blocksToMarkdown(blocks);
    expect(markdown).toContain("# Titre");
    expect(markdown).toContain("## Sous-titre");
    expect(markdown).toContain("- **Puce**");
    expect(markdown).toContain("  - Puce décalée");
    expect(markdown).toContain("> Citation");
    expect(markdown).toContain("==surlignage==");
  });

  it("exporte le filet, la case et l’exposant en syntaxe étendue", () => {
    const markdown = blocksToMarkdown([
      block({ id: "b1", html: "Détail", kind: "h3" }),
      block({ id: "b2", html: "À faire", task: true }),
      block({ id: "b3", html: "Fait", task: true, checked: true }),
      block({ id: "b4", html: "", kind: "rule" }),
      block({ id: "b5", html: "E = mc<sup>2</sup>" }),
    ]);
    expect(markdown).toContain("### Détail");
    expect(markdown).toContain("- [ ] À faire");
    expect(markdown).toContain("- [x] Fait");
    expect(markdown).toContain("---");
    expect(markdown).toContain("^2^");
  });

  it("produit du texte brut pour les passages de question", () => {
    expect(blocksToPlainText(blocks).split("\n")[0]).toBe("Titre");
    expect(blocksToPlainText(blocks)).toContain("Texte avec surlignage");
  });
});
