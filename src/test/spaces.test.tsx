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

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
  useLibraryFilters.setState({ filters: DEFAULT_FILTERS });
  useContentStore.persist.clearStorage();
  useContentStore.setState({ ...demoContent });
});

describe("Espaces — filtres", () => {
  it("ne raconte plus la hiérarchie dans une carte en bas de page", () => {
    open("/spaces");
    expect(screen.queryByText(/Trois niveaux, trois rôles/)).toBeNull();
    expect(screen.queryByText(/Réviser part de ces fiches/)).toBeNull();
  });

  it("filtre par nom, et le dit", async () => {
    const user = userEvent.setup();
    open("/spaces");

    const search = screen.getByRole("searchbox", { name: "Rechercher un projet" });
    await user.type(search, "quantique");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Ouvrir le projet Ordinateur quantique/ })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Ouvrir le projet Thèse/ })).toBeNull();
    });
    expect(screen.getByText(/sur 3 projets/)).toBeTruthy();
  });

  it("filtre par état : les projets vides ne sont pas les projets actifs", async () => {
    const user = userEvent.setup();
    /* Un projet neuf, sans note ni vault : c’est le cas qui doit répondre. */
    useContentStore.setState({
      projects: [
        ...demoContent.projects,
        { id: "p-vide", name: "Projet vide", createdAt: new Date().toISOString() },
      ],
    });
    open("/spaces");

    await user.click(screen.getByRole("button", { name: "Vides" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Ouvrir le projet Projet vide/ })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Ouvrir le projet Thèse/ })).toBeNull();
    });

    await user.click(screen.getByRole("button", { name: "Actifs" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Ouvrir le projet Projet vide/ })).toBeNull();
      expect(screen.getByRole("button", { name: /Ouvrir le projet Thèse/ })).toBeTruthy();
    });
  });

  it("trie par nom, sans perdre la liste", async () => {
    const user = userEvent.setup();
    open("/spaces");

    const sort = screen.getByLabelText("Trier les projets") as HTMLSelectElement;
    await user.selectOptions(sort, "name");

    const names = await screen.findAllByRole("button", { name: /^Ouvrir le projet/ });
    const order = names.map((node) => node.getAttribute("aria-label") ?? "");
    expect(order).toEqual([...order].sort((a, b) => a.localeCompare(b, "fr")));
  });

  it("réinitialise filtres et tri d’un geste", async () => {
    const user = userEvent.setup();
    open("/spaces");

    await user.type(screen.getByRole("searchbox", { name: "Rechercher un projet" }), "zzz");
    expect(screen.getByText("Aucun projet ne correspond à ces filtres.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Réinitialiser" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^Ouvrir le projet/ })).toHaveLength(3));
  });
});

describe("Bibliothèque — en-tête", () => {
  it("n’a plus de raccourcis « Projets » et « Vaults » sous le titre", () => {
    open("/");
    const main = document.querySelector("main") ?? document.body;
    expect(within(main as HTMLElement).queryByRole("button", { name: "Projets" })).toBeNull();
    expect(within(main as HTMLElement).queryByRole("button", { name: "Vaults" })).toBeNull();
  });
});
