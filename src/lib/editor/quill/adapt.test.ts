import { describe, expect, it } from "vitest";
import Quill from "quill";
import {
  createQuillHost,
  QUILL_FORMATS,
  registerEinnoteFormats,
  resetHistory,
} from "@/lib/editor/quill/adapt";
import { blocksToDelta, deltaToBlocks } from "@/lib/editor/quill/delta";
import type { Block } from "@/types";

/**
 * L’adaptateur, monté sur un vrai moteur.
 *
 * Ce fichier comble le trou du navigateur : les tests d’écran ne peuvent pas
 * taper dans un `contenteditable` sous jsdom, mais ils peuvent vérifier tout le
 * reste si le moteur est réellement instancié. Ce qu’on prouve ici, c’est ce que
 * le produit promet : **l’identifiant de bloc survit** à chaque geste, et le
 * document rendu au carnet reste la même liste de blocs.
 */

function mount(blocks: Block[]) {
  registerEinnoteFormats();
  const element = document.createElement("div");
  document.body.append(element);
  const quill = new Quill(element, {
    theme: "snow",
    modules: { toolbar: false },
    formats: QUILL_FORMATS,
  });
  quill.setContents(blocksToDelta(blocks), "silent");
  resetHistory(quill);
  return { quill, host: createQuillHost(quill) };
}

const block = (patch: Partial<Block> & Pick<Block, "id" | "html">): Block => ({
  kind: "p",
  bullet: false,
  indent: 0,
  ...patch,
});

describe("createQuillHost", () => {
  it("rend les blocs tels qu’ils sont entrés", () => {
    const blocks: Block[] = [
      block({ id: "b1", html: "Conditions de <strong>validité</strong>", kind: "h2" }),
      block({ id: "b2", html: "Consentement", bullet: true }),
      block({ id: "b3", html: "Capacité", bullet: true, indent: 1 }),
      block({ id: "b4", html: "Une citation", kind: "quote" }),
      block({ id: "b5", html: "", kind: "rule" }),
    ];
    const { host } = mount(blocks);
    expect(host.blocks()).toEqual(blocks);
  });

  it("donne un identifiant à une ligne créée par Entrée, et le garde", () => {
    const { quill, host } = mount([block({ id: "b1", html: "Première" })]);
    quill.insertText(quill.getLength() - 1, "\nSeconde", {}, "api");

    const first = host.blocks();
    expect(first).toHaveLength(2);
    expect(first[0].id).toBe("b1");
    expect(first[1].id).toMatch(/^b/);

    /* Deux lectures de suite ne doivent pas changer l’identifiant : sinon une
       question perdrait son ancre à chaque enregistrement. */
    expect(host.blocks()).toEqual(first);
  });

  it("transforme un paragraphe en titre sans changer son identifiant", () => {
    const { host } = mount([block({ id: "b1", html: "Détail" })]);
    host.selectRange(0, 0);
    expect(host.turnInto("h3")).toBe(true);

    const [result] = host.blocks();
    expect(result.kind).toBe("h3");
    expect(result.id).toBe("b1");
  });

  it("coche une case par son identifiant de bloc", () => {
    const { host } = mount([block({ id: "b1", html: "À faire", task: true })]);
    expect(host.toggleCheckedById("b1")).toBe(true);

    const [result] = host.blocks();
    expect(result.task).toBe(true);
    expect(result.checked).toBe(true);
  });

  it("ajoute une puce sans perdre le texte", () => {
    const { host } = mount([block({ id: "b1", html: "Un point" })]);
    host.selectRange(0, 0);
    expect(host.toggleMeta("bullet")).toBe(true);

    const [result] = host.blocks();
    expect(result.bullet).toBe(true);
    expect(result.html).toBe("Un point");
  });

  it("décale et réaligne un bloc", () => {
    const { host } = mount([block({ id: "b1", html: "Un point", bullet: true })]);
    host.selectRange(0, 0);
    host.changeIndent(1);
    host.setAlign("center");

    const [result] = host.blocks();
    expect(result.indent).toBe(1);
    expect(result.align).toBe("center");
  });

  it("déplace, duplique et supprime des blocs", () => {
    const { host } = mount([
      block({ id: "b1", html: "Un" }),
      block({ id: "b2", html: "Deux" }),
    ]);

    host.selectRange(0, 0);
    expect(host.moveBlock(1)).toBe(true);
    expect(host.blocks().map((item) => item.html)).toEqual(["Deux", "Un"]);

    host.selectRange(0, 0);
    expect(host.duplicateBlock()).toBe(true);
    const duplicated = host.blocks();
    expect(duplicated).toHaveLength(3);
    expect(duplicated[1].html).toBe("Deux");
    expect(duplicated[1].id).not.toBe(duplicated[0].id);

    host.selectRange(0, 0);
    expect(host.deleteBlock()).toBe(true);
    /* Il restait « Deux / Deux / Un » : on supprime le premier. */
    expect(host.blocks().map((item) => item.html)).toEqual(["Deux", "Un"]);
  });

  it("insère un filet, qui reste un bloc à part entière", () => {
    const { host } = mount([block({ id: "b1", html: "Avant" })]);
    host.selectRange(0, 0);
    expect(host.insertRule()).toBe(true);

    const blocks = host.blocks();
    expect(blocks.map((item) => item.kind)).toEqual(["p", "rule", "p"]);
  });

  it("applique une marque et la relit", () => {
    const { quill, host } = mount([block({ id: "b1", html: "Un mot" })]);
    quill.setSelection(0, 6, "api");
    host.toggleMark("bold");

    const [result] = host.blocks();
    expect(result.html).toBe("<strong>Un mot</strong>");
  });

  it("change la casse sans perdre la mise en forme", () => {
    const { quill, host } = mount([
      block({ id: "b1", html: "un <strong>mot</strong> important" }),
    ]);
    quill.setSelection(0, quill.getLength() - 1, "api");
    expect(host.changeCase("upper")).toBe(true);
    expect(host.blocks()[0].html).toBe("UN <strong>MOT</strong> IMPORTANT");
  });

  it("compte les mots et rend le texte de la note", () => {
    const { host } = mount([
      block({ id: "b1", html: "Deux mots" }),
      block({ id: "b2", html: "et trois" }),
    ]);
    expect(host.words()).toBe(4);
    expect(host.text()).toContain("Deux mots");
  });

  it("remplace tout, et dit combien", () => {
    const { host } = mount([block({ id: "b1", html: "un chat et un chien" })]);
    expect(host.replaceAll("un", "le")).toBe(2);
    expect(host.blocks()[0].html).toBe("le chat et le chien");
  });

  it("annule et rétablit", () => {
    const { quill, host } = mount([block({ id: "b1", html: "Un" })]);
    quill.insertText(quill.getLength() - 1, " texte", {}, "user");
    const after = host.blocks()[0].html;
    host.undo();
    expect(host.blocks()[0].html).not.toBe(after);
    host.redo();
    expect(host.blocks()[0].html).toBe(after);
  });

  it("relit le document sans le réécrire", () => {
    const { quill, host } = mount([block({ id: "b1", html: "Stable" })]);
    const before = quill.getContents();
    host.blocks();
    host.words();
    host.text();
    expect(quill.getContents()).toEqual(before);
  });

  it("retrouve l’identifiant du bloc sous le curseur", () => {
    const { quill, host } = mount([
      block({ id: "b1", html: "Un" }),
      block({ id: "b2", html: "Deux" }),
    ]);
    quill.setSelection(quill.getLength() - 2, 0, "api");
    expect(host.blockIdAtCursor()).toBe("b2");
    expect(host.attrs().kind).toBe("p");
  });
});

describe("deltaToBlocks", () => {
  it("crée un bloc vide plutôt qu’une note sans bloc", () => {
    const blocks = deltaToBlocks({ ops: [{ insert: "\n" }] });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].html).toBe("");
    expect(blocks[0].kind).toBe("p");
  });

  it("accepte un identifiant neuf fourni par l’appelant", () => {
    const blocks = deltaToBlocks({ ops: [{ insert: "Texte\n" }] }, () => "b-neuf");
    expect(blocks[0].id).toBe("b-neuf");
  });
});
