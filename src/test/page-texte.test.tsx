import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useLibraryFilters } from "@/stores/useLibraryFilters";
import { useSessionStore } from "@/stores/useSessionStore";
import { DEFAULT_FILTERS } from "@/lib/libraryFilters";
import { caretAtEndOfNote, indexOfInNote, selectInNote } from "@/test/typing";

/**
 * **La page de texte : ce qui l’entoure, et ce qu’on peut y écrire.**
 *
 * Une capture de la note « Comprendre » montrait quatre défauts : un cadre gris
 * autour du texte, une colonne de 300 px, une barre plus large que le texte et
 * un compteur de mots coupé par le bord. Les trois premiers sont des règles de
 * feuille de style — elles se lisent donc ici, dans le fichier, parce que jsdom
 * ne calcule aucune mise en page. Les deux derniers tests portent sur ce qui
 * manquait : la couleur du texte et les tableaux, dans l’éditeur.
 */

const css = readFileSync(join(process.cwd(), "src", "index.css"), "utf8");

/**
 * Le corps des règles qui déclarent `selector`, concaténé.
 *
 * On lit la **liste de sélecteurs** qui précède l’accolade, pas le texte brut :
 * trois surfaces qui doivent partager une mesure s’écrivent en une seule règle
 * groupée (`.note-sheet, .note-head { … }`), et une recherche naïve de
 * `.note-sheet {` ne la trouverait pas.
 */
function rule(selector: string): string {
  /* Les commentaires sont retirés d’abord : un commentaire collé à une règle
     se retrouverait dans la liste de sélecteurs. */
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const bodies: string[] = [];
  const pattern = /\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const before = source.slice(0, match.index);
    const cut = Math.max(
      before.lastIndexOf("}"),
      before.lastIndexOf("{"),
      before.lastIndexOf(";"),
    );
    const selectors = before
      .slice(cut + 1)
      .split(",")
      .map((item) => item.trim());
    if (selectors.includes(selector)) bodies.push(match[1]);
  }
  return bodies.join("\n");
}

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

const blocksOf = (noteId: string) =>
  useContentStore.getState().notes.find((note) => note.id === noteId)!.blocks;

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useLibraryFilters.setState({ filters: DEFAULT_FILTERS });
  useContentStore.persist.clearStorage();
  useAppStore.setState({ activeProjectId: null });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
  useContentStore.setState({ ...demoContent });
});

describe("La page de texte", () => {
  it("n’enferme plus le texte dans un cadre", () => {
    /* `quill.snow.css` pose une bordure de 1 px sur son conteneur : c’est le
       cadre de la capture. Il est annulé, et la zone de texte ne défile plus
       dans une boîte à elle. */
    expect(rule(".note-prose.ql-container.ql-snow")).toMatch(/border:\s*0/);
    expect(rule(".note-prose .ql-editor")).toMatch(/overflow:\s*visible/);
  });

  it("aligne la barre d’outils sur la colonne du texte", () => {
    expect(rule(".note-sheet")).toMatch(
      /max-width:\s*calc\(var\(--reading-width\) \+ 114px\)/,
    );
    expect(rule(".editor-bar")).toMatch(
      /max-width:\s*calc\(var\(--reading-width\) \+ 114px\)/,
    );
    expect(rule(".editor-bar")).toMatch(/margin-inline:\s*auto/);
  });

  it("laisse les outils défiler et garde les issues à droite", () => {
    /* Sans `min-width: 0`, un enfant de flex refuse de rétrécir : la rangée
       de boutons débordait de la colonne et poussait le compteur hors écran. */
    expect(rule(".editor-toolbar-scroll")).toMatch(/min-width:\s*0/);
    expect(rule(".editor-toolbar-scroll")).toMatch(/overflow-x:\s*auto/);
    expect(rule(".editor-bar-tail")).toMatch(/flex:\s*none/);
    expect(css).toMatch(/\.editor-words\s*\{[^}]*display:\s*none/);
  });

  it("ne met le côté des questions dans la colonne qu’à partir de 1180 px", () => {
    expect(css).not.toMatch(/@media \(min-width: 768px\) \{\s*\.editor-aside/);
    expect(css).toMatch(/@media \(min-width: 1180px\) \{\s*\.editor-aside/);
  });

  it("dessine un tableau avec les filets de la page", () => {
    expect(rule(".note-prose .ql-editor td")).toMatch(/border:\s*1px solid var\(--line\)/);
    expect(rule(".note-prose .ql-editor table")).toMatch(/width:\s*100%/);
  });
});

describe("La couleur du texte", () => {
  it("colore le passage sélectionné et le garde en mémoire", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");

    const from = indexOfInNote("article");
    selectInNote(from, from + "article".length, "user");

    await user.click(screen.getByRole("button", { name: "Couleur du texte" }));
    const menu = await screen.findByRole("menu", { name: "Couleur du texte" });
    await user.click(within(menu).getByRole("button", { name: "Écrire en rouge" }));

    await waitFor(() => {
      const blocks = blocksOf("n-plan");
      expect(blocks.some((block) => /color:\s*#b3261e/i.test(block.html))).toBe(true);
    });

    /* La couleur est du **texte**, pas une décoration : elle est dans le HTML
       du bloc, donc elle survit au rechargement de la note. */
    const html = document.querySelector(".ql-editor")?.innerHTML ?? "";
    expect(html).toMatch(/color:\s*rgb\(179,\s*38,\s*30\)|color:\s*#b3261e/i);
  });

  it("revient à la couleur du thème", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");

    const from = indexOfInNote("article");
    selectInNote(from, from + "article".length, "user");
    await user.click(screen.getByRole("button", { name: "Couleur du texte" }));
    let menu = await screen.findByRole("menu", { name: "Couleur du texte" });
    await user.click(within(menu).getByRole("button", { name: "Écrire en bleu" }));
    await waitFor(() =>
      expect(blocksOf("n-plan").some((block) => /color:/i.test(block.html))).toBe(true),
    );

    selectInNote(from, from + "article".length, "user");
    await user.click(screen.getByRole("button", { name: "Couleur du texte" }));
    menu = await screen.findByRole("menu", { name: "Couleur du texte" });
    await user.click(within(menu).getByRole("button", { name: "Couleur du thème" }));

    await waitFor(() =>
      expect(blocksOf("n-plan").some((block) => /color:/i.test(block.html))).toBe(false),
    );
  });
});

describe("Les tableaux", () => {
  it("insère un tableau, et le garde dans la note", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    caretAtEndOfNote();

    await user.click(screen.getByRole("button", { name: "Tableau" }));
    const menu = await screen.findByRole("menu", { name: "Tableau" });
    await user.click(
      within(menu).getByRole("button", {
        name: "Insérer un tableau 2 lignes et 2 colonnes",
      }),
    );

    await waitFor(() => {
      expect(document.querySelector(".ql-editor table")).not.toBeNull();
    });
    expect(document.querySelectorAll(".ql-editor tr")).toHaveLength(2);
    expect(document.querySelectorAll(".ql-editor td")).toHaveLength(4);

    /* Quatre cellules, deux rangées : la note garde de quoi redessiner le
       tableau au rechargement, et les identifiants de bloc restent uniques. */
    const cells = blocksOf("n-plan").filter((block) => block.table);
    expect(cells).toHaveLength(4);
    expect(new Set(cells.map((cell) => cell.table)).size).toBe(2);
    const ids = blocksOf("n-plan").map((block) => block.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ajoute une ligne, ajoute une colonne, puis supprime le tableau", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    caretAtEndOfNote();

    await user.click(screen.getByRole("button", { name: "Tableau" }));
    let menu = await screen.findByRole("menu", { name: "Tableau" });
    await user.click(
      within(menu).getByRole("button", {
        name: "Insérer un tableau 2 lignes et 2 colonnes",
      }),
    );
    await waitFor(() => expect(document.querySelector(".ql-editor table")).not.toBeNull());

    /* Dans une cellule, les gestes de rangée s’activent : le curseur y est
       posé par l’insertion elle-même. */
    await user.click(screen.getByRole("button", { name: "Tableau" }));
    menu = await screen.findByRole("menu", { name: "Tableau" });
    await user.click(
      within(menu).getByRole("menuitem", { name: /Insérer une ligne en dessous/ }),
    );
    await waitFor(() => expect(document.querySelectorAll(".ql-editor tr")).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "Tableau" }));
    menu = await screen.findByRole("menu", { name: "Tableau" });
    await user.click(
      within(menu).getByRole("menuitem", { name: /Insérer une colonne à droite/ }),
    );
    await waitFor(() => expect(document.querySelectorAll(".ql-editor td")).toHaveLength(9));

    await user.click(screen.getByRole("button", { name: "Tableau" }));
    menu = await screen.findByRole("menu", { name: "Tableau" });
    await user.click(within(menu).getByRole("menuitem", { name: /Supprimer le tableau/ }));
    await waitFor(() => expect(document.querySelector(".ql-editor table")).toBeNull());
    expect(blocksOf("n-plan").some((block) => block.table)).toBe(false);
  });
});
