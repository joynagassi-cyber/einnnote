import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useLibraryFilters } from "@/stores/useLibraryFilters";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { caretAtEndOfNote } from "@/test/typing";
import { DEFAULT_FILTERS } from "@/lib/libraryFilters";

/**
 * La barre de mise en forme, vue depuis l’interface.
 *
 * On ne teste pas TipTap : on teste ce que quelqu’un peut **faire** depuis la
 * barre — transformer un bloc, cocher une case, chercher dans la note — et ce
 * qui doit survivre : l’identifiant de bloc, donc l’ancrage des questions.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

function caretAtEnd(container: HTMLElement) {
  const target = container.lastElementChild ?? container;
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
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

describe("Barre de mise en forme", () => {
  it("expose les gestes de base et les menus de transformation", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");

    const barre = screen.getByRole("toolbar", { name: "Mise en forme" });
    expect(barre).toBeTruthy();

    // marques
    for (const label of ["Gras", "Italique", "Souligné", "Barré", "Code en ligne"]) {
      expect(within(barre).getByRole("button", { name: label })).toBeTruthy();
    }
    // listes et structure
    for (const label of [
      "Liste à puces",
      "Liste numérotée",
      "Case à cocher",
      "Décaler à droite",
      "Décaler à gauche",
    ]) {
      expect(within(barre).getByRole("button", { name: label })).toBeTruthy();
    }

    // le menu « Transformer » s’ouvre et propose les six types de bloc
    await user.click(screen.getByRole("button", { name: /^Type de bloc/ }));
    const menu = await screen.findByRole("menu", { name: "Transformer le bloc" });
    expect(menu).toBeTruthy();
    for (const label of ["Texte", "Titre 1", "Titre 2", "Titre 3", "Citation", "Filet"]) {
      /* Les entrées portent `aria-checked` : elles disent aussi le type
         courant, d’où le rôle `menuitemcheckbox` plutôt que `menuitem`. */
      expect(
        within(menu).getByRole("menuitemcheckbox", { name: new RegExp(`^${label}`) }),
      ).toBeTruthy();
    }
  });

  it("transforme un paragraphe en titre 3 sans changer son identifiant", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEnd(screen.getByLabelText("Contenu de la note"));

    await user.click(screen.getByRole("button", { name: /^Type de bloc/ }));
    const menu = await screen.findByRole("menu", { name: "Transformer le bloc" });
    await user.click(
      within(menu).getByRole("menuitemcheckbox", { name: /^Titre 3/ }),
    );

    await waitFor(() => {
      const blocks = blocksOf("n-plan");
      expect(blocks.some((block) => block.kind === "h3")).toBe(true);
    });
    // Les questions ancrées gardent leurs blocs : aucun identifiant n’a bougé.
    const blocks = blocksOf("n-plan");
    const ids = blocks.map((block) => block.id);
    expect(ids).toContain("p2");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("coche une case depuis le bloc lui-même", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    const prose = screen.getByLabelText("Contenu de la note");
    (prose as HTMLElement).focus();
    caretAtEnd(prose);

    const barre = screen.getByRole("toolbar", { name: "Mise en forme" });
    await user.click(within(barre).getByRole("button", { name: "Case à cocher" }));
    await waitFor(() => {
      expect(blocksOf("n-plan").some((block) => block.task)).toBe(true);
    });

    const task = document.querySelector('li[data-list="unchecked"]') as HTMLElement;
    expect(task).not.toBeNull();
    await user.click(task);

    await waitFor(() => {
      const checked = blocksOf("n-plan").find((block) => block.task);
      expect(checked?.checked).toBe(true);
    });
  });

  it("cherche dans la note avec Ctrl+F, sans écrire dedans", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    const prose = screen.getByLabelText("Contenu de la note");
    (prose as HTMLElement).focus();
    const before = prose.innerHTML;

    await user.keyboard("{Control>}f{/Control}");
    const barre = await screen.findByRole("search", {
      name: "Rechercher dans la note",
    });
    expect(barre).toBeTruthy();

    await user.type(
      within(barre).getByLabelText("Texte à chercher"),
      "article",
    );
    await waitFor(() => {
      expect(within(barre).getByText(/\d+ \/ \d+/)).toBeTruthy();
    });

    /* La recherche ne réécrit pas le document : elle **sélectionne** la
       première occurrence. C’est la sélection du moteur qui montre où l’on
       est, pas une décoration ajoutée au texte — donc rien à nettoyer en
       fermant. */
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(window.getSelection()?.toString().toLowerCase()).toBe("article");
    });
    expect(prose.textContent).toContain("article");

    await user.click(within(barre).getByLabelText("Fermer la recherche"));
    await waitFor(() => {
      expect(screen.queryByRole("search", { name: "Rechercher dans la note" })).toBeNull();
    });
    expect(prose.textContent).toBeTruthy();
  });

  it("aligne un bloc à droite par attribut", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    const prose = screen.getByLabelText("Contenu de la note");
    (prose as HTMLElement).focus();
    caretAtEnd(prose);

    await user.click(screen.getByRole("button", { name: "Aligner à droite" }));
    await waitFor(() => {
      expect(blocksOf("n-plan").some((block) => block.align === "right")).toBe(true);
    });
  });
});
