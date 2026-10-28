import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useNavStore } from "@/stores/useNavStore";

/**
 * Apprendre est la porte d’entrée du modèle : un projet, des vaults, des
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
  /* Les leçons n’ont besoin d’aucun contenu : c’est justement le sujet. */
  useContentStore.setState({ ...demoContent });
});

describe("Apprendre, centré sur Espaces", () => {
  it("met la hiérarchie en tête, avant les tutoriels", async () => {
    open("/learn");

    expect(
      screen.getByRole("heading", { name: "Un projet, des vaults, des notes" }),
    ).toBeTruthy();

    const headings = screen.getAllByRole("heading").map((node) => node.textContent ?? "");
    const socle = headings.findIndex((text) => text.includes("Le socle"));
    const tutos = headings.findIndex((text) => text.includes("Tutoriels par outil"));
    expect(socle).toBeGreaterThanOrEqual(0);
    expect(tutos).toBeGreaterThan(socle);
  });

  it("dessine la hiérarchie avec les données réelles, pas un exemple", async () => {
    open("/learn");

    /* Le schéma montre le projet qui porte le plus de vaults : on recalcule
       ce choix, puis on vérifie qu’il affiche bien ses vrais chiffres. */
    const state = useContentStore.getState();
    const ranked = [...state.projects].sort(
      (a, b) =>
        state.vaults.filter((v) => v.projectId === b.id).length -
        state.vaults.filter((v) => v.projectId === a.id).length,
    );
    const project = ranked[0];
    const vault = state.vaults.find((v) => v.projectId === project.id)!;
    const notes = state.notes.filter((n) => n.vaultId === vault.id && !n.deletedAt);
    expect(screen.getAllByText(project.name).length).toBeGreaterThan(0);
    expect(screen.getAllByText(vault.name).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(`${notes.length} note`)).length).toBeGreaterThan(0);
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

  it("n’explique pas le rangement sur Espaces : une indication, une fois", async () => {
    const user = userEvent.setup();
    open("/spaces");

    /* La page de travail ne porte plus de paragraphe pédagogique : une seule
       indication, légère, avec un lien vers la leçon. */
    const hint = await screen.findByRole("status");
    expect(hint.textContent).toMatch(/vault/i);
    expect(screen.queryByText(/Un projet se découpe/)).toBeNull();

    await user.click(within(hint).getByRole("button", { name: /La leçon/ }));
    await waitFor(() => expect(window.location.pathname).toBe("/learn/x-1"));
  });

  it("ne remontre jamais l’indication une fois vue", async () => {
    const user = userEvent.setup();
    const view = open("/spaces");
    const hint = await screen.findByRole("status");
    await user.click(within(hint).getByRole("button", { name: "Masquer l’indication" }));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());

    view.unmount();
    open("/spaces");
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
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
