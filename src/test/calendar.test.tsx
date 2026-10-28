import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";

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
  useContentStore.persist.clearStorage();
  useContentStore.setState({ ...demoContent });
});

describe("Calendrier — fil du mois", () => {
  it("liste les événements du mois, groupés par jour et détaillés", () => {
    open("/calendar");

    const timeline = screen.getByRole("region", { name: "Fil du mois" });
    /* Ce que la grille ne dit pas : combien de jours actifs, et quoi. */
    expect(within(timeline).getByText(/jour.*actif/)).toBeTruthy();

    const groups = within(timeline).getAllByRole("listitem");
    expect(groups.length).toBeGreaterThan(0);
    /* Chaque événement porte son type en clair, pas seulement une pastille. */
    expect(within(timeline).getAllByText(/^(Note|Révision|Échéance|Leçon)$/).length).toBeGreaterThan(0);
  });

  it("donne l’heure et le projet quand ils existent", () => {
    open("/calendar");
    const timeline = screen.getByRole("region", { name: "Fil du mois" });
    /* La démonstration contient des notes datées : au moins une ligne doit
       afficher l’heure de création. */
    expect(within(timeline).getAllByText(/^\d{2}:\d{2}$/).length).toBeGreaterThan(0);
  });

  it("reste vide sans contenu, sans afficher un cadre vide", () => {
    useContentStore.setState({
      projects: [],
      notes: [],
      questions: [],
      links: [],
      cards: [],
      vaults: [],
      zettel: [],
      mindmaps: [],
      logs: [],
      progress: [],
    });
    open("/calendar");
    expect(screen.queryByRole("region", { name: "Fil du mois" })).toBeNull();
  });
});
