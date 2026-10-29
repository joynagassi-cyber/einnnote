import { describe, expect, it } from "vitest";
import {
  blocksToMarkdown,
  blocksToPlainText,
  escapeHtml,
  sanitizeHtml,
} from "@/lib/editor/blocks";
import type { Block } from "@/types";

/**
 * Ce fichier ne teste plus le pont vers l’éditeur : ce pont est dans
 * `quill/delta.test.ts`, avec le seul moteur qui le comprend. Ici on tient les
 * fonctions qui survivent à tous les changements d’éditeur — nettoyage et
 * export — parce qu’elles décident de ce qui entre et de ce qui sort du produit.
 */

const block = (patch: Partial<Block> & Pick<Block, "id" | "html">): Block => ({
  kind: "p",
  bullet: false,
  indent: 0,
  ...patch,
});

describe("escapeHtml", () => {
  it("neutralise les quatre caractères dangereux", () => {
    expect(escapeHtml('<a href="x"> & </a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt; &amp; &lt;/a&gt;",
    );
  });

  it("laisse le texte français intact", () => {
    expect(escapeHtml("l’élève — « déjà »")).toBe("l’élève — « déjà »");
  });
});

describe("sanitizeHtml", () => {
  it("supprime les balises actives et leur contenu", () => {
    const html = sanitizeHtml('Bonjour <script>alert("x")</script> monde');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
    expect(html).toContain("Bonjour");
  });

  it("supprime les gestionnaires d’événements en ligne", () => {
    const html = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("neutralise un href javascript:", () => {
    const html = sanitizeHtml('<a href="javascript:alert(1)">lien</a>');
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="#"');
  });

  it("conserve les balises de mise en forme autorisées", () => {
    const html = "<strong>gras</strong> <em>italique</em> <mark>surligné</mark>";
    expect(sanitizeHtml(html)).toBe(html);
  });
});

describe("blocksToPlainText", () => {
  it("rend une ligne par bloc, sans balise", () => {
    expect(
      blocksToPlainText([
        block({ id: "b1", html: "Un <strong>mot</strong>" }),
        block({ id: "b2", html: "Deux<br>lignes" }),
      ]),
    ).toBe("Un mot\nDeux lignes");
  });

  it("décode les entités qu’il a lui-même produites", () => {
    expect(blocksToPlainText([block({ id: "b1", html: "A &amp; B&nbsp;;" })])).toBe(
      "A & B ;",
    );
  });
});

describe("blocksToMarkdown", () => {
  it("rend chaque type de bloc dans sa syntaxe", () => {
    expect(
      blocksToMarkdown([
        block({ id: "b1", html: "Titre", kind: "h1" }),
        block({ id: "b2", html: "Sous-titre", kind: "h2" }),
        block({ id: "b3", html: "Détail", kind: "h3" }),
        block({ id: "b4", html: "Une citation", kind: "quote" }),
        block({ id: "b5", html: "", kind: "rule" }),
        block({ id: "b6", html: "Puce", bullet: true }),
        block({ id: "b7", html: "Numéroté", ordered: true }),
        block({ id: "b8", html: "Fait", task: true, checked: true }),
        block({ id: "b9", html: "À faire", task: true }),
      ]),
    ).toBe(
      [
        "# Titre",
        "## Sous-titre",
        "### Détail",
        "> Une citation",
        "---",
        "- Puce",
        "1. Numéroté",
        "- [x] Fait",
        "- [ ] À faire",
      ].join("\n\n"),
    );
  });

  it("traduit les marques en syntaxe Markdown", () => {
    const markdown = blocksToMarkdown([
      block({
        id: "b1",
        html: '<strong>gras</strong> <em>italique</em> <mark>surligné</mark> <a href="https://exemple.org">lien</a>',
      }),
    ]);
    expect(markdown).toBe(
      "**gras** *italique* ==surligné== [lien](https://exemple.org)",
    );
  });

  it("indente de deux espaces par niveau de retrait", () => {
    expect(
      blocksToMarkdown([block({ id: "b1", html: "Puce", bullet: true, indent: 2 })]),
    ).toBe("    - Puce");
  });

  it("conserve un renvoi de note tel quel", () => {
    expect(blocksToMarkdown([block({ id: "b1", html: "Voir [[Contrats]]" })])).toBe(
      "Voir [[Contrats]]",
    );
  });
});
