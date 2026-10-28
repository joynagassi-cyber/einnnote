import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useNavStore } from "@/stores/useNavStore";

/**
 * Navigation configurable — ce qui se voit et ce qui se règle.
 *
 * Les trois défauts réparés sont vérifiés ici, un par un :
 * 1. « Espaces » est atteignable depuis le téléphone ;
 * 2. une page masquée disparaît vraiment de la barre ;
 * 3. le rail se réordonne d’un clic, et l’ordre survit au rechargement.
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
  useNavStore.getState().resetAll();
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

const bottomNav = () => document.querySelector<HTMLElement>(".bottom-nav")!;

describe("Barre du bas", () => {
  it("atteint Espaces sur téléphone", async () => {
    open("/");
    const nav = bottomNav();
    expect(within(nav).getByRole("button", { name: /Espaces/ })).toBeTruthy();

    await userEvent.setup().click(within(nav).getByRole("button", { name: /Espaces/ }));
    await waitFor(() => expect(window.location.pathname).toBe("/spaces"));
  });

  it("affiche les cinq entrées par défaut et le bouton de création", () => {
    open("/");
    const nav = bottomNav();
    const labels = [...nav.querySelectorAll(".nav-item")].map((item) =>
      item.textContent?.trim().replace(/\d+/g, ""),
    );
    expect(labels).toEqual(["Notes", "Espaces", "Réviser", "Apprendre", "Réglages"]);
    expect(within(nav).getByRole("button", { name: /Nouvelle note/ })).toBeTruthy();
  });

  it("retire une page masquée dans les réglages", async () => {
    useNavStore.getState().toggle("mobile", "learn");
    open("/");
    const nav = bottomNav();
    expect(within(nav).queryByRole("button", { name: /Apprendre/ })).toBeNull();
    expect(within(nav).getByRole("button", { name: /Espaces/ })).toBeTruthy();
  });

  it("parque le surplus derrière « Plus » au lieu de le faire déborder", async () => {
    const user = userEvent.setup();
    useNavStore.getState().toggle("mobile", "projects");
    useNavStore.getState().toggle("mobile", "vaults");
    useNavStore.getState().toggle("mobile", "cards");

    open("/");
    const more = within(bottomNav()).getByRole("button", { name: /Plus/ });
    await user.click(more);

    const sheet = document.querySelector<HTMLElement>(".sheet")!;
    expect(within(sheet).getByText("Toutes les pages")).toBeTruthy();
    expect(within(sheet).getByRole("button", { name: /Studio des cartes/ })).toBeTruthy();
    expect(
      within(sheet).getByRole("button", { name: /Choisir les pages de la barre/ }),
    ).toBeTruthy();
  });
});

describe("Espaces, parcours de création sur téléphone", () => {
  it("propose les trois étapes, projet puis coffre puis note", async () => {
    open("/spaces");
    expect(await screen.findByText("Créer, dans l’ordre")).toBeTruthy();
    // les trois étapes, nommées par leur rang : deux boutons ne portent jamais
    // le même nom pour un lecteur d’écran
    expect(screen.getByRole("button", { name: "Étape 1 — créer un projet" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Étape 2 — créer un coffre" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Étape 3 — créer une note" })).toBeTruthy();
  });

  it("ouvre le formulaire de coffre avec le projet déjà choisi", async () => {
    const user = userEvent.setup();
    open("/spaces");
    const first = useContentStore.getState().projects[0];

    await user.click(
      await screen.findByRole("button", { name: "Étape 2 — créer un coffre" }),
    );

    await waitFor(() =>
      expect(window.location.search).toContain(`project=${first.id}`),
    );
    expect(await screen.findByText("Nouveau coffre", { selector: "h2" })).toBeTruthy();
  });
});

describe("Rail du bureau", () => {
  it("suit le même catalogue, projets et coffres compris", async () => {
    await withDesktop(() => {
      open("/spaces");
      const rail = document.querySelector<HTMLElement>(".rail")!;
      expect(within(rail).getByRole("button", { name: "Projets" })).toBeTruthy();
      expect(within(rail).getByRole("button", { name: "Coffres" })).toBeTruthy();
    });
  });

  it("se réordonne d’un clic : la page touchée se pose devant l’autre", async () => {
    await withDesktop(async () => {
      const user = userEvent.setup();
      open("/");
      const rail = document.querySelector<HTMLElement>(".rail")!;

      await user.click(within(rail).getByRole("button", { name: "Réorganiser les pages" }));
      await user.click(within(rail).getByRole("button", { name: "Apprendre" }));
      await user.click(within(rail).getByRole("button", { name: "Notes" }));

      await waitFor(() =>
        expect(useNavStore.getState().desktop.slice(0, 2)).toEqual(["learn", "notes"]),
      );
      // l’ordre est conservé sur le disque, pas seulement en mémoire
      const saved = JSON.parse(localStorage.getItem("engram.nav.v1")!);
      expect(saved.state.desktop[0]).toBe("learn");
    });
  });

  it("monte une page avec la flèche, sans la toucher deux fois", async () => {
    await withDesktop(async () => {
      const user = userEvent.setup();
      open("/");
      const rail = document.querySelector<HTMLElement>(".rail")!;

      await user.click(within(rail).getByRole("button", { name: "Réorganiser les pages" }));
      await user.click(within(rail).getByRole("button", { name: "Descendre Notes" }));

      await waitFor(() =>
        expect(useNavStore.getState().desktop.slice(0, 2)).toEqual(["spaces", "notes"]),
      );
    });
  });
});

describe("Réglages de navigation", () => {
  it("montre un aperçu et permet d’afficher une page masquée", async () => {
    const user = userEvent.setup();
    open("/settings/navigation");

    expect(await screen.findByText(/Aperçu — barre du bas/)).toBeTruthy();
    expect(screen.getByText("Pages affichées")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Afficher Projets" }));
    await waitFor(() =>
      expect(useNavStore.getState().mobile).toContain("projects"),
    );
  });

  it("permet de retirer une page, mais pas la dernière", async () => {
    const user = userEvent.setup();
    open("/settings/navigation");

    await user.click(await screen.findByRole("button", { name: "Retirer Apprendre" }));
    await waitFor(() =>
      expect(useNavStore.getState().mobile).not.toContain("learn"),
    );

    // on ne peut pas vider la barre : la dernière entrée n’a pas de bouton actif
    useNavStore.getState().setItems("mobile", ["notes"]);
    await waitFor(() => {
      const last = screen.getByRole("button", { name: "Retirer Notes" });
      expect(last.hasAttribute("disabled")).toBe(true);
    });
  });

  it("bascule sur bureau et montre le rail", async () => {
    const user = userEvent.setup();
    open("/settings/navigation");
    await user.click(await screen.findByRole("button", { name: "Bureau" }));
    expect(await screen.findByText(/Aperçu — rail latéral/)).toBeTruthy();
  });

  it("rétablit l’ordre par défaut", async () => {
    const user = userEvent.setup();
    useNavStore.getState().setItems("mobile", ["review", "notes"]);
    open("/settings/navigation");

    await user.click(await screen.findByRole("button", { name: /Rétablir/ }));
    await waitFor(() =>
      expect(useNavStore.getState().mobile).toEqual([
        "notes",
        "spaces",
        "review",
        "learn",
        "settings",
      ]),
    );
  });
});
