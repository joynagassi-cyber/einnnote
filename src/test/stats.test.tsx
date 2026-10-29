import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";

const DAY = 86_400_000;

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

function log(id: string, daysAgo: number) {
  return {
    id,
    cardId: `c-${id}`,
    rating: "good" as const,
    reviewedAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
    scheduledDays: 1,
    elapsedDays: 1,
  };
}

/** Hauteurs des barres du graphique d’activité, dans l’ordre. */
function barHeights(): string[] {
  const svg = document.querySelector('svg[aria-label^="Activité"]');
  if (!svg) return [];
  return Array.from(svg.querySelectorAll("rect")).map(
    (rect) => rect.getAttribute("height") ?? "",
  );
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

describe("Statistiques — graphiques", () => {
  const PANELS = [
    "Activité",
    "Rétention par semaine",
    "Charge à venir",
    "Régularité",
    "Rythme",
    "Notes de révision",
  ];

  function panelOf(title: string): HTMLElement {
    const heading = screen.getByRole("heading", { name: title });
    const panel = heading.closest("section") as HTMLElement | null;
    expect(panel).toBeTruthy();
    return panel as HTMLElement;
  }

  it("affiche les six panneaux, jamais un cadre muet", () => {
    open("/stats");
    expect(screen.getByRole("heading", { name: "Statistiques" })).toBeTruthy();

    for (const title of PANELS) {
      /* Un tracé, ou une phrase qui explique l’absence de tracé. */
      expect(panelOf(title).querySelector("svg, [role=\"img\"], p")).toBeTruthy();
    }
  });

  it("trace les trois lectures de révision dès qu’il y a des révisions", () => {
    useContentStore.setState({
      logs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => log(`l-${index}`, index)),
    });
    open("/stats");

    for (const title of ["Régularité", "Rythme", "Notes de révision"]) {
      const panel = panelOf(title);
      const mark = panel.querySelector("svg, [role=\"img\"]");
      expect(mark).toBeTruthy();
      expect(mark?.getAttribute("aria-label") ?? panel.textContent ?? "").not.toBe("");
    }
    /* Dix révisions, dix réponses « bien » : le total doit apparaître. */
    expect(screen.getAllByText(/10 révisions/).length).toBeGreaterThan(0);
  });

  it("résume chaque graphique en texte, pour qui ne voit pas les barres", () => {
    open("/stats");
    const activity = document.querySelector('svg[aria-label^="Activité"]');
    expect(activity?.getAttribute("aria-label")).toMatch(/notes créées, \d+ révisions/);
    /* Le résumé chiffré accompagne le dessin, il ne le remplace pas. */
    const panel = screen.getByRole("heading", { name: "Activité" }).closest("section") as HTMLElement;
    expect(within(panel).getAllByText(/Maximum \d+ actions/).length).toBeGreaterThan(0);
  });

  it("les barres suivent les données, sans maximum codé en dur", () => {
    open("/stats");
    const quiet = barHeights();
    expect(quiet.length).toBeGreaterThan(0);

    cleanup();
    useContentStore.setState({
      logs: Array.from({ length: 10 }, (_, index) => log(`l-${index}`, index)),
    });
    open("/stats");
    const busy = barHeights();

    expect(busy.length).toBe(quiet.length);
    expect(busy.join("|")).not.toBe(quiet.join("|"));
    expect(
      document.querySelector('svg[aria-label^="Activité"]')?.getAttribute("aria-label"),
    ).toMatch(/10 révisions/);
  });

  it("change de fenêtre sans perdre la page", async () => {
    const user = userEvent.setup();
    open("/stats");
    await user.click(screen.getByRole("button", { name: "7 j" }));
    expect(
      document
        .querySelector('svg[aria-label^="Activité"]')
        ?.getAttribute("aria-label"),
    ).toMatch(/sur 7 jours/);
  });

  it("reste honnête sans historique", () => {
    useContentStore.setState({ logs: [], progress: [], cards: [] });
    open("/stats");
    expect(screen.getByRole("heading", { name: "Régularité" })).toBeTruthy();
    /* Aucun panneau ne montre un cadre muet : chacun porte une phrase. */
    for (const title of ["Régularité", "Rythme", "Notes de révision"]) {
      const panel = screen.getByRole("heading", { name: title }).closest("section") as HTMLElement;
      expect(panel.querySelector("svg, p")).toBeTruthy();
    }
  });
});
