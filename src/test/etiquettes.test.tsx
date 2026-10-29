import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent, demoTags } from "@/test/fixtures";
import { DEFAULT_SETTINGS, useAppStore } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { editingEngine } from "@/lib/editor/quill/bridge";
import {
  caretAtEndOfNote,
  indexOfInNote,
  selectInNote,
  typeInNote,
} from "@/test/typing";

/**
 * **Les étiquettes dans l’éditeur.**
 *
 * Trois promesses, exécutées plutôt qu’affirmées :
 *
 * 1. taper `#` ouvre la liste des étiquettes **déjà disponibles** ;
 * 2. choisir une proposition écrit `#nom` dans la note, et le nom est habillé ;
 * 3. ce qu’on écrit finit dans la base, donc sera proposé la fois suivante.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

const tags = () => useContentStore.getState().tags;

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS, activeProjectId: null });
  useContentStore.persist.clearStorage();
  useContentStore.setState({ ...demoContent });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
});

describe("étiquettes — le menu de #", () => {
  it("montre les étiquettes déjà disponibles dès qu’on tape #", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote("\nUn passage #");

    const list = await screen.findByRole("listbox", { name: "Étiquettes disponibles" });
    for (const tag of demoTags) {
      expect(within(list).getByRole("option", { name: new RegExp(tag.name) })).toBeTruthy();
    }
  });

  it("ne propose que ce qui correspond à ce qu’on tape", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote("\nUn passage #lec");

    const list = await screen.findByRole("listbox", { name: "Étiquettes disponibles" });
    expect(within(list).getByRole("option", { name: /lecture/ })).toBeTruthy();
    expect(within(list).queryByRole("option", { name: /source/ })).toBeNull();
  });

  it("écrit l’étiquette choisie à la place du #début", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote("\nVoir #sou");

    const list = await screen.findByRole("listbox", { name: "Étiquettes disponibles" });
    await user.click(within(list).getByRole("option", { name: /source/ }));

    await waitFor(() =>
      expect(screen.getByLabelText("Contenu de la note").textContent).toContain("#source"),
    );
    expect(screen.getByLabelText("Contenu de la note").textContent).not.toContain("#sou ");
    /* Le menu se referme seul : on continue sa phrase. */
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("se choisit au clavier : Entrée prend la première proposition", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote("\nVoir #sou");

    await screen.findByRole("listbox", { name: "Étiquettes disponibles" });
    fireEvent.keyDown(document.querySelector(".ql-editor")!, { key: "Enter" });

    await waitFor(() =>
      expect(screen.getByLabelText("Contenu de la note").textContent).toContain("#source"),
    );
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("habille l’étiquette, sans jamais la remplacer par un nœud", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote("\nVoir #source");

    await waitFor(() =>
      expect(document.querySelector(".note-prose .tag-item")).toBeTruthy(),
    );
    expect(screen.getByLabelText("Contenu de la note").textContent).toContain("#source");
  });

  it("remplace l’étiquette entière, même si le curseur est au milieu du mot", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote("\nVoir #sourc");
    /* le curseur revient après « #so », la fin du mot reste à droite */
    selectInNote(indexOfInNote("#so") + 3, 0, "user");

    const list = await screen.findByRole("listbox", { name: "Étiquettes disponibles" });
    await user.click(within(list).getByRole("option", { name: /source/ }));

    await waitFor(() => expect(editingEngine()!.getText()).toContain("Voir #source "));
  });

  it("ajoute à la base l’étiquette qu’on vient d’écrire", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote("\nUne idée #inédite ");

    await waitFor(() =>
      expect(tags().map((tag) => tag.name)).toContain("inédite"),
    );
  });

  it("n’ouvre pas de menu pour un titre Markdown ni au milieu d’un mot", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    await user.click(screen.getByLabelText("Contenu de la note"));
    caretAtEndOfNote();
    typeInNote("\n## Sous-titre");

    await waitFor(() =>
      expect(screen.getByLabelText("Contenu de la note").textContent).toContain("Sous-titre"),
    );
    expect(screen.queryByRole("listbox")).toBeNull();

    typeInNote(" puis C#");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
