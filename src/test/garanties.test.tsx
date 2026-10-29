import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { DEFAULT_SETTINGS, useAppStore } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { caretAtEndOfNote, noteLength, selectInNote, typeInNote } from "@/test/typing";

/**
 * **Les garanties du produit, écrites comme des tests.**
 *
 * Un audit externe a reproché au prototype d’origine (commit `7783e57`) de ne
 * rien conserver, de ne jamais recharger le texte et de ne pas relier les
 * questions aux passages. Ces trois promesses existent aujourd’hui ; ce fichier
 * les **exécute** au lieu de les affirmer.
 *
 * Le « rechargement » est simulé comme il se produit réellement : on démonte
 * l’application (`cleanup`), on **garde `localStorage`**, puis on la remonte.
 * Si une seule écriture manquait au stockage, le test tomberait.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

const note = (id: string) => useContentStore.getState().notes.find((item) => item.id === id)!;

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS, activeProjectId: null });
  useContentStore.persist.clearStorage();
  useContentStore.setState({ ...demoContent });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
});

describe("Garanties — persistance", () => {
  it("garde le texte écrit après un rechargement complet", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote("\nUn paragraphe ajouté pour la vérification.");

    await waitFor(() =>
      expect(note("n-plan").blocks.some((block) => block.html.includes("vérification"))).toBe(
        true,
      ),
    );
    const before = note("n-plan").blocks.map((block) => block.html);

    /* Rechargement : l’application est démontée, le stockage reste. */
    cleanup();
    open("/note/n-plan");

    await waitFor(() => {
      expect(screen.getByLabelText("Contenu de la note").textContent).toContain("vérification");
    });
    expect(note("n-plan").blocks.map((block) => block.html)).toEqual(before);
  });
});

describe("Garanties — questions ancrées", () => {
  it("crée une question liée au bloc, et la retrouve après rechargement", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();

    /* Une sélection d’un mot, comme un glissement de souris. */
    selectInNote(Math.max(0, noteLength() - 6), noteLength());
    await user.click(await screen.findByRole("button", { name: "Créer une question" }));

    const sheet = await screen.findByRole("dialog", { name: "Ajouter une question" });
    await user.type(
      within(sheet).getByRole("textbox"),
      "Que faut-il retenir de ce passage ?",
    );
    await user.click(within(sheet).getByRole("button", { name: "Créer la carte" }));

    const question = await waitFor(() => {
      const created = useContentStore
        .getState()
        .questions.find((item) => item.text === "Que faut-il retenir de ce passage ?");
      expect(created).toBeTruthy();
      return created!;
    });

    /* L’ancre est un **identifiant de bloc**, et ce bloc existe encore.
       La question ne porte pas l’ancre : c’est le lien qui la porte, ce qui
       permet à une même question de viser plusieurs passages. */
    const link = useContentStore.getState().links.find((item) => item.questionId === question.id);
    expect(link).toBeTruthy();
    expect(link!.blockId).toBeTruthy();
    expect(note("n-plan").blocks.some((block) => block.id === link!.blockId)).toBe(true);
    expect(link!.cardId).toBeTruthy();

    cleanup();
    open("/note/n-plan");

    await waitFor(() => {
      expect(
        useContentStore.getState().questions.some((item) => item.id === question.id),
      ).toBe(true);
    });
    /* La pastille de gouttière reparaît sur le bloc qui porte la question. */
    await waitFor(() => {
      expect(document.querySelector(".gutter-badge")).not.toBeNull();
    });
  });
});

describe("Garanties — notes reliées", () => {
  it("garde un renvoi et son rétro-lien après rechargement", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote(" Voir [[Contrats commerciaux]].");

    await waitFor(() =>
      expect(note("n-plan").blocks.map((block) => block.html).join("")).toContain(
        "[[Contrats commerciaux]]",
      ),
    );

    cleanup();
    open("/note/n-contrats");
    await user.click(screen.getByRole("button", { name: "Fiche de la note" }));

    const fiche = await screen.findByRole("dialog", { name: /Cette note/ });
    expect(within(fiche).getByText(/Citée par/)).toBeTruthy();
    expect(within(fiche).getByText("Plan du chapitre 3")).toBeTruthy();
  });
});
