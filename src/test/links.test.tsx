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
 * Les liens de notes, vus depuis l’écran.
 *
 * Trois choses à prouver : `[[` propose les notes, le lien **s’écrit en toutes
 * lettres** dans le texte (donc il s’exporte), et la fiche montre qui cite qui.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

const textOf = (noteId: string) =>
  useContentStore
    .getState()
    .notes.find((note) => note.id === noteId)!
    .blocks.map((block) => block.html)
    .join("\n");

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useContentStore.persist.clearStorage();
  useContentStore.setState({ ...demoContent });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
});

describe("Liens de notes", () => {
  it("lie une note depuis la palette et écrit le lien dans le texte", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    const prose = screen.getByLabelText("Contenu de la note");
    await user.click(prose);

    await user.keyboard("{Control>}k{/Control}");
    const palette = await screen.findByRole("dialog", { name: "Palette de commandes" });
    await user.click(
      await within(palette).findByRole("option", { name: /Lier une note/ }),
    );

    const picker = await screen.findByRole("dialog", { name: "Lier une note" });
    const option = await within(picker).findByRole("option", {
      name: /Contrats commerciaux/,
    });
    await user.click(option);

    await waitFor(() =>
      expect(textOf("n-plan")).toContain("[[Contrats commerciaux]]"),
    );
    /* Rien d’autre n’a bougé : les crochets tapés sont remplacés, pas doublés. */
    expect(textOf("n-plan")).not.toContain("[[[[");
  });

  it("dessine le lien, et distingue un lien mort", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    await user.keyboard("[[[[Contrats commerciaux]] et [[[[Note disparue]]");

    await waitFor(() => {
      expect(document.querySelectorAll(".note-link").length).toBe(2);
    });
    const broken = document.querySelector(".note-link--broken");
    expect(broken?.textContent).toBe("[[Note disparue]]");
    expect(broken?.getAttribute("aria-label")).toContain("Lien mort");
  });

  it("ouvre la note liée au clic", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    await user.keyboard("[[[[Contrats commerciaux]]");

    const link = await waitFor(() => {
      const element = document.querySelector(".note-link");
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    await user.click(link);

    await waitFor(() =>
      expect(window.location.pathname).toBe("/note/n-contrats"),
    );
  });

  it("montre les rétro-liens dans la fiche", async () => {
    const user = userEvent.setup();
    /* « n-contrats » est citée depuis « n-plan ». */
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    await user.keyboard("[[[[Contrats commerciaux]]");
    await waitFor(() => expect(textOf("n-plan")).toContain("[[Contrats"));

    cleanup();
    open("/note/n-contrats");
    await user.click(screen.getByRole("button", { name: "Fiche de la note" }));

    const fiche = await screen.findByRole("dialog", { name: /Cette note/ });
    expect(within(fiche).getByText(/Citée par/)).toBeTruthy();
    expect(within(fiche).getByText("Plan du chapitre 3")).toBeTruthy();
  });

  it("ouvre le lien sous le curseur depuis la palette", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    await user.keyboard("Voir [[[[Contrats commerciaux]] pour le détail");
    /* Le curseur doit être *dans* le lien : on le ramène de huit signes. */
    await user.keyboard(
      "{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}",
    );

    await user.keyboard("{Control>}k{/Control}");
    const palette = await screen.findByRole("dialog", { name: "Palette de commandes" });
    await user.type(
      within(palette).getByRole("textbox", { name: "Chercher une commande" }),
      "ouvrir le lien",
    );
    await user.click(
      await within(palette).findByRole("option", { name: /Ouvrir le lien sous le curseur/ }),
    );

    await waitFor(() =>
      expect(window.location.pathname).toBe("/note/n-contrats"),
    );
  });
});
