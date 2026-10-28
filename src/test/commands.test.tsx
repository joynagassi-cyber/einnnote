import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { DEFAULT_PUPITRE, readPupitre } from "@/lib/commands/pupitre";

/**
 * La palette et le pupitre, vus depuis l’écran.
 *
 * On ne teste pas TipTap : on teste qu’un geste **atteint le document** (une
 * puce devient une puce), qu’une commande inapplicable **dit pourquoi**, et que
 * le pupitre garde ce qu’on y range — y compris après un rechargement.
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

describe("Pupitre", () => {
  it("affiche les quatre gestes par défaut et le bouton Tout", () => {
    open("/note/n-plan");
    const pupitre = screen.getByRole("toolbar", { name: "Gestes d’écriture" });
    for (const command of DEFAULT_PUPITRE) {
      expect(pupitre.querySelector(`[data-command="${command}"]`)).toBeTruthy();
    }
    expect(within(pupitre).getByRole("button", { name: /Tout/ })).toBeTruthy();
  });

  it("ouvre la palette depuis « Tout »", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    const pupitre = screen.getByRole("toolbar", { name: "Gestes d’écriture" });
    await user.click(within(pupitre).getByRole("button", { name: /Tout/ }));
    expect(await screen.findByRole("dialog", { name: "Palette de commandes" })).toBeTruthy();
  });

  it("exécute un geste et l’écrit dans la note", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));

    const pupitre = screen.getByRole("toolbar", { name: "Gestes d’écriture" });
    await user.click(within(pupitre).getByRole("button", { name: "Liste à puces" }));

    await waitFor(() => {
      expect(blocksOf("n-plan").some((block) => block.bullet)).toBe(true);
    });
  });

  it("se range par appui long, et le rangement survit au rechargement", async () => {
    open("/note/n-plan");
    const pupitre = screen.getByRole("toolbar", { name: "Gestes d’écriture" });
    const tout = within(pupitre).getByRole("button", { name: /Tout/ });

    fireEvent.pointerDown(tout);
    await sleep(600);
    fireEvent.pointerUp(tout);

    const ranger = await screen.findByText("Ranger le pupitre");
    expect(ranger).toBeTruthy();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retirer Liste à puces" }));

    await waitFor(() => expect(readPupitre()).not.toContain("bullet"));
    expect(screen.queryByRole("button", { name: "Retirer Liste à puces" })).toBeNull();

    /* Recharger la note relit le stockage : le geste retiré ne revient pas. */
    cleanup();
    open("/note/n-plan");
    const after = screen.getByRole("toolbar", { name: "Gestes d’écriture" });
    expect(after.querySelector('[data-command="bullet"]')).toBeNull();
  });

  it("déplace un geste au clavier, depuis sa poignée", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    fireEvent.pointerDown(within(screen.getByRole("toolbar", { name: "Gestes d’écriture" })).getByRole("button", { name: /Tout/ }));
    await sleep(600);
    await screen.findByText("Ranger le pupitre");

    const handle = screen.getByRole("button", { name: "Déplacer Surligner · jaune" });
    handle.focus();
    await user.keyboard("{ArrowUp}");

    await waitFor(() => expect(readPupitre()[0]).toBe("highlight-jaune"));
  });

  it("revient aux quatre gestes par défaut", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    const pupitre = screen.getByRole("toolbar", { name: "Gestes d’écriture" });
    fireEvent.pointerDown(within(pupitre).getByRole("button", { name: /Tout/ }));
    await sleep(600);
    await screen.findByText("Ranger le pupitre");

    await user.click(screen.getByRole("button", { name: "Retirer Liste à puces" }));
    await screen.findByRole("button", { name: "Réinitialiser" });
    await user.click(screen.getByRole("button", { name: "Réinitialiser" }));

    await waitFor(() => expect(readPupitre()).toEqual(DEFAULT_PUPITRE));
  });
});
