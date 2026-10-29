import { describe, expect, it } from "vitest";
import Quill from "quill";
import Table from "quill/modules/table";
import type { Block } from "@/types";
import { blocksToDelta, deltaToBlocks } from "./delta";
import { QUILL_FORMATS, registerEinnoteFormats } from "./adapt";

/**
 * Deux formats ajoutés après coup, et le seul endroit où ils peuvent se perdre :
 * le pont entre le carnet et le moteur.
 *
 * Un tableau Quill n’est pas un objet inséré — c’est une suite de lignes qui
 * portent chacune l’identité de leur **rangée**. Une couleur n’est pas une
 * balise : c’est un `style`. Dans les deux cas, si le pont ne les connaît pas,
 * ils disparaissent au premier enregistrement, sans erreur et sans bruit.
 */

const block = (patch: Partial<Block> & { id: string; html: string }): Block => ({
  kind: "p",
  bullet: false,
  indent: 0,
  ...patch,
});

function engine() {
  registerEinnoteFormats();
  const host = document.createElement("div");
  document.body.appendChild(host);
  return new Quill(host, {
    theme: "snow",
    modules: { toolbar: false, table: true },
    formats: QUILL_FORMATS,
  });
}

describe("Le pont garde ce qu’il ne comprend pas tout seul", () => {
  it("une couleur traverse les blocs et revient telle quelle", () => {
    const blocks = [
      block({ id: "a", html: '<span style="color: #c0392b">Rouge</span> et du texte.' }),
    ];
    const back = deltaToBlocks(blocksToDelta(blocks));
    expect(back[0].html).toBe('<span style="color: #c0392b">Rouge</span> et du texte.');
  });

  it("une couleur écrite en rgb() revient en hexadécimal", () => {
    const back = deltaToBlocks(
      blocksToDelta([block({ id: "a", html: '<span style="color: rgb(192, 57, 43)">Rouge</span>' })]),
    );
    expect(back[0].html).toBe('<span style="color: #c0392b">Rouge</span>');
  });

  it("un tableau garde ses rangées et ses colonnes", () => {
    const blocks = [
      block({ id: "a", html: "Colonne A", table: "row-1" }),
      block({ id: "b", html: "Colonne B", table: "row-1" }),
      block({ id: "c", html: "Valeur A", table: "row-2" }),
      block({ id: "d", html: "Valeur B", table: "row-2" }),
      block({ id: "e", html: "Après le tableau" }),
    ];
    const back = deltaToBlocks(blocksToDelta(blocks));
    expect(back.map((item) => item.table ?? null)).toEqual([
      "row-1",
      "row-1",
      "row-2",
      "row-2",
      null,
    ]);
    expect(back.map((item) => item.html)).toEqual([
      "Colonne A",
      "Colonne B",
      "Valeur A",
      "Valeur B",
      "Après le tableau",
    ]);
  });
});

describe("Le moteur reconnaît ce que les blocs décrivent", () => {
  it("un tableau en blocs redevient un <table> à l’écran", () => {
    const quill = engine();
    quill.setContents(
      blocksToDelta([
        block({ id: "a", html: "Gauche", table: "row-1" }),
        block({ id: "b", html: "Droite", table: "row-1" }),
        block({ id: "c", html: "", table: "row-2" }),
        block({ id: "d", html: "", table: "row-2" }),
      ]),
      "silent",
    );

    const table = quill.root.querySelector("table");
    expect(table).toBeTruthy();
    expect(quill.root.querySelectorAll("tr")).toHaveLength(2);
    expect(quill.root.querySelectorAll("td")).toHaveLength(4);
  });

  it("la taille du tableau se choisit, et suit les gestes de ligne", () => {
    const quill = engine();
    quill.setText("Texte\n");
    quill.setSelection(0, 0);
    const module = quill.getModule("table") as Table;

    module.insertTable(3, 2);
    expect(quill.root.querySelectorAll("tr")).toHaveLength(3);
    expect(quill.root.querySelectorAll("td")).toHaveLength(6);

    /* Le curseur est dans le tableau après l’insertion : les gestes portent
       sur la rangée et la colonne où il se trouve, pas sur le document. */
    expect(module.getTable()[2]).not.toBeNull();
    module.insertRowBelow();
    expect(quill.root.querySelectorAll("tr")).toHaveLength(4);
    module.insertColumnRight();
    expect(quill.root.querySelectorAll("td")).toHaveLength(12);

    module.deleteTable();
    expect(quill.root.querySelector("table")).toBeNull();
  });
});
