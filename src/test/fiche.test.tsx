import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { DEFAULT_SETTINGS, useAppStore } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";

/**
 * La fiche et la lecture.
 *
 * Ce qu’on vérifie : la fiche **range sans réécrire**, elle **dit pourquoi** une
 * ligne ne s’applique pas, elle ne supprime jamais en un clic, et la lecture
 * retire bien tout ce qui sollicite — sans perdre une virgule du texte.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

function withDesktop<T>(run: () => Promise<T> | T): Promise<T> {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches:
      query.includes("min-width: 1024px") ||
      query.includes("min-width: 768px") ||
      query.includes("color-scheme"),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  return Promise.resolve(run()).finally(() => {
    window.matchMedia = original;
  });
}

const noteById = (id: string) =>
  useContentStore.getState().notes.find((note) => note.id === id)!;

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useContentStore.persist.clearStorage();
  useContentStore.setState({ ...demoContent });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
});

describe("Fiche de la note", () => {
  it("s’ouvre depuis l’en-tête et groupe ses actions", async () => {
    const user = userEvent.setup();
    await withDesktop(async () => {
      open("/note/n-plan");
      await user.click(screen.getByRole("button", { name: /Fiche de la note/ }));

      const fiche = await screen.findByRole("dialog", { name: "Fiche de la note" });
      for (const section of ["Ranger", "Lire", "Sortir", "Gérer"]) {
        expect(within(fiche).getByRole("heading", { name: section })).toBeTruthy();
      }
      expect(within(fiche).getByRole("button", { name: /Exporter en Markdown/ })).toBeTruthy();
    });
  });

  it("s’ouvre au clavier avec Ctrl + . et se referme avec Échap", async () => {
    const user = userEvent.setup();
    await withDesktop(async () => {
      open("/note/n-plan");
      await user.click(screen.getByLabelText("Contenu de la note"));

      await user.keyboard("{Control>}.{/Control}");
      expect(await screen.findByRole("dialog", { name: "Fiche de la note" })).toBeTruthy();

      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Fiche de la note" })).toBeNull(),
      );
    });
  });

  it("range la note dans un vault sans toucher à son texte", async () => {
    const user = userEvent.setup();
    await withDesktop(async () => {
      open("/note/n-plan");
      const before = JSON.stringify(noteById("n-plan").blocks);

      await user.click(screen.getByRole("button", { name: /Fiche de la note/ }));
      const fiche = await screen.findByRole("dialog", { name: "Fiche de la note" });
      const vault = within(fiche).getByLabelText("Vault de la note");

      const option = within(vault as HTMLSelectElement).getAllByRole("option")[1];
      await user.selectOptions(vault, (option as HTMLOptionElement).value);

      await waitFor(() => expect(noteById("n-plan").vaultId).toBeTruthy());
      expect(JSON.stringify(noteById("n-plan").blocks)).toBe(before);
    });
  });

  it("lie une note depuis la fiche, sans quitter le texte", async () => {
    const user = userEvent.setup();
    await withDesktop(async () => {
      open("/note/n-plan");
      await user.click(screen.getByRole("button", { name: /Fiche de la note/ }));
      const fiche = await screen.findByRole("dialog", { name: "Fiche de la note" });

      /* Le panneau ne recouvre pas le texte : l’action « Lier une note » y a
         accès, et c’est l’éditeur qui écrit — la fiche ne touche pas au contenu. */
      await user.click(within(fiche).getByRole("button", { name: /Lier une note/ }));
      const choix = await screen.findByRole("dialog", { name: "Lier une note" });

      await user.click(within(choix).getByRole("option", { name: /Contrats commerciaux/ }));

      await waitFor(() =>
        expect(JSON.stringify(noteById("n-plan").blocks)).toContain(
          "[[Contrats commerciaux]]",
        ),
      );
    });
  });

  it("demande confirmation avant la corbeille", async () => {
    const user = userEvent.setup();
    await withDesktop(async () => {
      open("/note/n-plan");
      await user.click(screen.getByRole("button", { name: /Fiche de la note/ }));
      const fiche = await screen.findByRole("dialog", { name: "Fiche de la note" });

      await user.click(within(fiche).getByRole("button", { name: /corbeille/ }));
      /* La note est toujours là : le premier clic n’a rien supprimé. */
      expect(noteById("n-plan").deletedAt ?? null).toBeNull();

      await user.click(within(fiche).getByRole("button", { name: /Mettre à la corbeille/ }));
      await waitFor(() => expect(noteById("n-plan").deletedAt).toBeTruthy());
    });
  });

  it("propose aussi la fiche sur téléphone, dans une feuille", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByRole("button", { name: "Fiche de la note" }));

    const feuille = await screen.findByRole("dialog", { name: /Cette note/ });
    expect(within(feuille).getByRole("heading", { name: "Ranger" })).toBeTruthy();
    expect(within(feuille).getByRole("button", { name: /corbeille/ })).toBeTruthy();
  });
});

describe("Lecture", () => {
  it("masque le compositeur, garde le texte, et se quitte avec Échap", async () => {
    const user = userEvent.setup();
    await withDesktop(async () => {
      open("/note/n-plan");
      const before = JSON.stringify(noteById("n-plan").blocks);

      await user.click(screen.getByRole("button", { name: /Fiche de la note/ }));
      const fiche = await screen.findByRole("dialog", { name: "Fiche de la note" });
      await user.click(within(fiche).getByRole("button", { name: /^Lecture/ }));

      await waitFor(() =>
        expect(document.querySelector('.screen-editor[data-reading="true"]')).toBeTruthy(),
      );
      /* Le texte est intact : on lit, on ne convertit pas. */
      expect(JSON.stringify(noteById("n-plan").blocks)).toBe(before);

      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(document.querySelector(".screen-editor")?.getAttribute("data-reading")).toBeNull(),
      );
    });
  });
});
