import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";

/**
 * Les nouveaux modes d’affichage du coffre, et le studio.
 *
 * On vérifie ce qui se voit et ce qui se règle : le mode s’affiche, le menu le
 * propose, et « Utiliser » écrit réellement la préférence. Le rendu 3D
 * lui-même (inclinaison, ressort) ne se juge pas en jsdom — il ne calcule
 * aucune géométrie.
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

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useDisplayStore.getState().resetAll();
  useContentStore.setState({
    projects: useContentStore.getInitialState().projects,
    notes: useContentStore.getInitialState().notes,
    questions: useContentStore.getInitialState().questions,
    links: useContentStore.getInitialState().links,
    cards: useContentStore.getInitialState().cards,
    mindmaps: useContentStore.getInitialState().mindmaps,
    vaults: useContentStore.getInitialState().vaults,
    zettel: useContentStore.getInitialState().zettel,
    logs: [],
    progress: [],
  });
});

const vaultCards = () =>
  useContentStore.getState().zettel.filter((card) => card.vaultId === "v-eco");

describe("Éventail du coffre", () => {
  it("s’ouvre en mode éventail, avec ses commandes", async () => {
    useDisplayStore.getState().set("vault", { view: "fan" });
    open("/vault/v-eco");

    expect(await screen.findByText(/Éventail ·/)).toBeTruthy();
    expect(
      screen.getByRole("group", { name: /Éventail de \d+ fiches/ }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fiche suivante" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fiche précédente" })).toBeTruthy();
  });

  it("met une autre fiche au centre quand on avance", async () => {
    const user = userEvent.setup();
    useDisplayStore.getState().set("vault", { view: "fan" });
    open("/vault/v-eco");

    const cards = vaultCards();
    const first = cards[0];
    const second = cards[1];

    expect(
      await screen.findByRole("button", { name: `${first.code} — ${first.title} — ouvrir` }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Fiche suivante" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: `${second.code} — ${second.title} — ouvrir` }),
      ).toBeTruthy(),
    );
  });

  it("ouvre la fiche centrale dans la pile", async () => {
    const user = userEvent.setup();
    useDisplayStore.getState().set("vault", { view: "fan" });
    open("/vault/v-eco");

    const cards = vaultCards();
    const first = cards[0];
    await user.click(
      await screen.findByRole("button", {
        name: `${first.code} — ${first.title} — ouvrir`,
      }),
    );

    await waitFor(() => expect(screen.getByText(/Glissez pour feuilleter/)).toBeTruthy());
    expect(useDisplayStore.getState().get("vault").view).toBe("stack");
  });

  it("pose l’arc même avant que GSAP ne soit chargé", async () => {
    useDisplayStore.getState().set("vault", { view: "fan" });
    open("/vault/v-eco");
    await screen.findByText(/Éventail ·/);

    /* La géométrie est écrite en variables CSS : si le morceau GSAP tarde (ou
       échoue), la première peinture montre déjà un éventail, pas une pile. */
    await waitFor(() => {
      const leaves = document.querySelectorAll<HTMLElement>(".fan-card");
      expect(leaves.length).toBeGreaterThan(2);
    });
    const leaves = [...document.querySelectorAll<HTMLElement>(".fan-card")];
    const xs = leaves.map((leaf) => leaf.style.getPropertyValue("--fan-x"));
    expect(new Set(xs).size).toBeGreaterThan(1);
    expect(xs.some((value) => value.includes("-"))).toBe(true);
  });

  it("propose aussi l’éventail en bureau", async () => {
    await withDesktop(async () => {
      useDisplayStore.getState().set("vault", { view: "fan" });
      open("/vault/v-eco");
      expect(await screen.findByText(/Éventail ·/)).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Économie" })).toBeTruthy();
    });
  });
});

describe("Relief et grille en bureau", () => {
  it("affiche la grille au lieu des deux panneaux", async () => {
    await withDesktop(async () => {
      useDisplayStore.getState().set("vault", { view: "relief" });
      open("/vault/v-eco");
      // le panneau de lecture (liste + fiche) n’est plus là…
      expect(screen.queryByPlaceholderText(/Chercher dans \d+ fiches/)).toBeNull();
      // …mais les fiches sont bien rendues, en cartes inclinables
      const cards = vaultCards();
      expect(await screen.findByText(cards[0].title)).toBeTruthy();
      expect(screen.getByText(/Approchez le pointeur/)).toBeTruthy();
    });
  });
});

describe("Studio des cartes", () => {
  it("montre des fiches réelles et écrit la préférence", async () => {
    const user = userEvent.setup();
    open("/settings/cards");

    expect(await screen.findByText("Studio des cartes")).toBeTruthy();
    expect(screen.getByText(/Éventail 3D/)).toBeTruthy();
    expect(screen.getByText(/Relief 3D/)).toBeTruthy();
    expect(screen.getByText(/Carte image/)).toBeTruthy();
    expect(screen.getByText(/Carte de révision/)).toBeTruthy();

    const cards = vaultCards();
    expect(screen.getAllByText(cards[0].title).length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /Utiliser l’éventail dans mes coffres/ }),
    );

    await waitFor(() =>
      expect(useDisplayStore.getState().get("vault").view).toBe("fan"),
    );
  });

  it("signale la démonstration au lieu de la faire passer pour une fonction", async () => {
    open("/settings/cards");
    expect(
      await screen.findByText(/Démonstration — non branchée sur vos fiches/),
    ).toBeTruthy();
  });
});

describe("Carte de révision", () => {
  it("reste retournable dans son cadre incliné", async () => {
    const user = userEvent.setup();
    open("/review/session?mode=all");
    await user.click(
      await screen.findByRole("button", { name: "Afficher la réponse" }),
    );
    expect(await screen.findByText("Ce que vous aviez écrit")).toBeTruthy();
  });
});
