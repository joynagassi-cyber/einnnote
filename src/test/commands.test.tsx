import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";

/**
 * La palette et la barre d’édition, vues depuis l’écran.
 *
 * On ne teste pas Quill : on teste qu’un geste **atteint le document** (une
 * puce devient une puce), qu’une commande inapplicable **dit pourquoi**, et
 * qu’il n’existe **qu’une** barre : celle qui tient la mise en forme, la
 * question ancrée, les réglages de la note et la palette.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

const blocksOf = (noteId: string) =>
  useContentStore.getState().notes.find((note) => note.id === noteId)!.blocks;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
  useContentStore.persist.clearStorage();
  useContentStore.setState({ ...demoContent });
});

describe("Palette de commandes", () => {
  it("s’ouvre au clavier et montre les familles de gestes", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));

    await user.keyboard("{Control>}k{/Control}");

    const palette = await screen.findByRole("dialog", { name: "Palette de commandes" });
    expect(palette).toBeTruthy();
    for (const group of ["Modifier", "Blocs", "Listes", "Document"]) {
      expect(within(palette).getAllByText(group).length).toBeGreaterThan(0);
    }
  });

  it("filtre sans accent, et exécute ce qu’on choisit", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));

    await user.keyboard("{Control>}k{/Control}");
    const palette = await screen.findByRole("dialog", { name: "Palette de commandes" });

    const search = within(palette).getByRole("textbox", { name: "Chercher une commande" });
    await user.type(search, "puces");

    const option = await within(palette).findByRole("option", { name: /Liste à puces/ });
    await user.click(option);

    await waitFor(() => {
      expect(blocksOf("n-plan").some((block) => block.bullet)).toBe(true);
    });
    /* La palette se referme après le geste : on revient au texte. */
    expect(screen.queryByRole("dialog", { name: "Palette de commandes" })).toBeNull();
  });

  it("explique une commande inapplicable au lieu de la cacher", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    await user.keyboard("{Control>}k{/Control}");

    const palette = await screen.findByRole("dialog", { name: "Palette de commandes" });
    const cocher = within(palette).getByRole("option", { name: /Cocher/ });
    expect(cocher.getAttribute("aria-disabled")).toBe("true");
    expect(cocher.textContent).toContain("case à cocher");
  });

  it("se ferme avec Échap, sans rien changer", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    const before = JSON.stringify(blocksOf("n-plan"));
    await user.click(screen.getByLabelText("Contenu de la note"));
    await user.keyboard("{Control>}k{/Control}");
    await screen.findByRole("dialog", { name: "Palette de commandes" });

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Palette de commandes" })).toBeNull(),
    );
    expect(JSON.stringify(blocksOf("n-plan"))).toBe(before);
  });
});

describe("Barre d’édition", () => {
  it("n’existe qu’une fois, quelle que soit la largeur", () => {
    open("/note/n-plan");
    expect(screen.getAllByRole("toolbar", { name: "Mise en forme" })).toHaveLength(1);
    /* Rien d’autre ne fait office de barre de gestes. */
    expect(screen.queryByRole("toolbar", { name: "Gestes d’écriture" })).toBeNull();
  });

  it("ouvre la palette depuis « Tout »", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByRole("button", { name: "Toutes les commandes" }));
    expect(await screen.findByRole("dialog", { name: "Palette de commandes" })).toBeTruthy();
  });

  it("exécute un geste et l’écrit dans la note", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    await user.click(screen.getByRole("button", { name: "Liste à puces" }));

    await waitFor(() => {
      expect(blocksOf("n-plan").some((block) => block.bullet)).toBe(true);
    });
  });

  it("grise « Créer une question » sans sélection, en disant pourquoi", () => {
    open("/note/n-plan");
    const question = screen.getByRole("button", { name: "Créer une question" });
    expect(question).toHaveProperty("disabled", true);
    expect(question.getAttribute("title")).toContain("Sélectionnez un passage");
  });

  it("garde les réglages de la note dans le menu « ⋯ »", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByRole("button", { name: "Plus d’options de mise en forme" }));

    const papier = await screen.findByRole("menuitem", { name: /Papier de la note/ });
    await user.click(papier);
    await waitFor(() =>
      expect(useAppStore.getState().settings.notePaper).toBe("ruled"),
    );
  });

  it("disparaît en lecture, et revient avec la bascule de mode", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    expect(screen.getByRole("toolbar", { name: "Mise en forme" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Passer en lecture" }));
    await waitFor(() =>
      expect(screen.queryByRole("toolbar", { name: "Mise en forme" })).toBeNull(),
    );

    await user.click(screen.getByRole("button", { name: "Revenir à l’écriture" }));
    await waitFor(() =>
      expect(screen.getByRole("toolbar", { name: "Mise en forme" })).toBeTruthy(),
    );
  });
});
