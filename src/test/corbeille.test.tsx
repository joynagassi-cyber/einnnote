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

/**
 * La corbeille — une **liste**, pas un empilement de fiches.
 *
 * Une fiche par note supprimée obligeait à lire trois lignes et à descendre
 * pour deux gestes qui tiennent sur une ligne. Ici : le titre reste l’objet
 * principal, la méthode et la date s’alignent en colonnes sur bureau, et les
 * deux gestes — restaurer, effacer — sont à droite, à taille de pouce.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

const deleted = () =>
  useContentStore.getState().notes.filter((note) => note.deletedAt);

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

describe("La corbeille", () => {
  it("met une note supprimée sur une ligne, avec son titre, sa méthode et sa date", () => {
    useContentStore.getState().trashNote("n-plan");
    open("/settings/trash");

    const ligne = screen.getByText("Plan du chapitre 3").closest("li");
    expect(ligne).toBeTruthy();
    const cell = within(ligne as HTMLElement);
    expect(cell.getByText("Outline")).toBeTruthy();
    /* Deux copies de la ligne existent dans le DOM : la version téléphone
       (méta sous le titre) et la version bureau (colonnes alignées). jsdom
       n’applique pas les media queries, donc les deux sont là — l’écran,
       lui, n’en montre qu’une. */
    expect(cell.getAllByText(/supprimée/).length).toBeGreaterThan(0);
    expect(cell.getByRole("button", { name: /Restaurer/ })).toBeTruthy();
    expect(cell.getByRole("button", { name: "Effacer" })).toBeTruthy();
  });

  it("n’affiche pas d’en-tête de colonnes pour une seule note", () => {
    useContentStore.getState().trashNote("n-plan");
    open("/settings/trash");
    expect(screen.queryByText("Gestes")).toBeNull();
  });

  it("annonce les colonnes dès qu’il y a de quoi comparer", () => {
    useContentStore.getState().trashNote("n-plan");
    useContentStore.getState().trashNote("n-contrats");
    open("/settings/trash");

    expect(screen.getByText("Note")).toBeTruthy();
    expect(screen.getByText("Méthode")).toBeTruthy();
    expect(screen.getByText("Supprimée")).toBeTruthy();
    expect(screen.getByText("Gestes")).toBeTruthy();
    expect(screen.getByText("2 notes en attente")).toBeTruthy();
  });

  it("restaure une note d’un geste", async () => {
    const user = userEvent.setup();
    useContentStore.getState().trashNote("n-plan");
    open("/settings/trash");

    const ligne = screen.getByText("Plan du chapitre 3").closest("li") as HTMLElement;
    await user.click(within(ligne).getByRole("button", { name: /Restaurer/ }));

    await waitFor(() => expect(deleted()).toHaveLength(0));
    expect(
      useContentStore.getState().notes.find((note) => note.id === "n-plan")?.deletedAt,
    ).toBeFalsy();
    // la liste vide revient, et le compte disparaît
    expect(screen.getByText("Corbeille vide")).toBeTruthy();
  });

  it("nomme la note avant de l’effacer pour de bon", async () => {
    const user = userEvent.setup();
    useContentStore.getState().trashNote("n-contrats");
    open("/settings/trash");

    await user.click(screen.getByRole("button", { name: "Effacer" }));
    const feuille = await screen.findByRole("dialog");
    expect(within(feuille).getByText(/Contrats commerciaux/)).toBeTruthy();

    await user.click(within(feuille).getByRole("button", { name: "Effacer" }));
    await waitFor(() =>
      expect(
        useContentStore.getState().notes.some((note) => note.id === "n-contrats"),
      ).toBe(false),
    );
  });
});
