import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useNavStore } from "@/stores/useNavStore";

/**
 * Apprendre est la porte d’entrée du modèle : un projet, des coffres, des
 * notes. On vérifie trois choses visibles, pas trois détails d’implémentation :
 * le schéma est en tête de page, il est calculé sur les données réelles, et le
 * bouton principal mène à la leçon du socle.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useDisplayStore.getState().resetAll();
  useNavStore.getState().resetAll();
  const initial = useContentStore.getInitialState();
  useContentStore.setState({
    projects: initial.projects,
    notes: initial.notes,
    questions: initial.questions,
    links: initial.links,
    cards: initial.cards,
    mindmaps: initial.mindmaps,
    vaults: initial.vaults,
    zettel: initial.zettel,
    logs: [],
    progress: [],
  });
});

describe("Apprendre, centré sur Espaces", () => {
  it("met la hiérarchie en tête, avant les tutoriels", async () => {
    open("/learn");

    expect(
      screen.getByRole("heading", { name: "Un projet, des coffres, des notes" }),
    ).toBeTruthy();

    const headings = screen.getAllByRole("heading").map((node) => node.textContent ?? "");
    const socle = headings.findIndex((text) => text.includes("Le socle"));
    const tutos = headings.findIndex((text) => text.includes("Tutoriels par outil"));
    expect(socle).toBeGreaterThanOrEqual(0);
    expect(tutos).toBeGreaterThan(socle);
  });

  it("dessine la hiérarchie avec les données réelles, pas un exemple", async () => {
    open("/learn");

    const vault = useContentStore.getState().vaults[0];
    const cards = useContentStore.getState().zettel.filter((c) => c.vaultId === vault.id);
    // le schéma nomme le projet et compte les fiches du coffre
    expect(screen.getAllByText(vault.name).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(new RegExp(`${cards.length} fiche`)).length,
    ).toBeGreaterThan(0);
  });

  it("ouvre la leçon du socle d’un geste, et cette leçon mène aux Espaces", async () => {
    const user = userEvent.setup();
    open("/learn");

    await user.click(screen.getByRole("button", { name: /Commencer le socle/ }));
    await waitFor(() => expect(window.location.pathname).toBe("/learn/x-1"));

    expect(
      screen.getByText("Un projet est un chantier, pas un dossier"),
    ).toBeTruthy();
    expect(screen.getAllByText(/Le socle/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Ouvrir Espaces/ }));
    await waitFor(() => expect(window.location.pathname).toBe("/spaces"));
  });

  it("renvoie d’Espaces vers la leçon qui explique le rangement", async () => {
    const user = userEvent.setup();
    open("/spaces");

    const link = screen.getByRole("button", {
      name: /Apprendre en 3 minutes/,
    });
    await user.click(link);
    await waitFor(() => expect(window.location.pathname).toBe("/learn/x-1"));
  });

  it("garde les six tutoriels et le cours de lecture intacts", async () => {
    open("/learn");
    expect(screen.getByText("Tutoriels par outil")).toBeTruthy();
    expect(screen.getByText("Cours · Lire pour retenir")).toBeTruthy();
    const tutos = screen.getByText("Tutoriels par outil").closest("section")!;
    expect(within(tutos).getAllByRole("listitem")).toHaveLength(6);
    const cours = screen.getByText("Cours · Lire pour retenir").closest("section")!;
    expect(within(cours).getAllByRole("listitem")).toHaveLength(9);
  });
});
