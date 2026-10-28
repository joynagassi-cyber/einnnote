import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useNavStore } from "@/stores/useNavStore";
import { NavMoreMenu } from "@/components/Fab";
import { ClockCounterClockwise, GraduationCap } from "@phosphor-icons/react";

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

  it("affiche cinq entrées — et aucun « + » dans la barre", () => {
    open("/");
    const nav = bottomNav();
    const labels = [...nav.querySelectorAll(".nav-item")].map((item) =>
      item.textContent?.trim().replace(/\d+/g, ""),
    );
    expect(labels).toEqual(["Notes", "Espaces", "Réviser", "Apprendre", "Réglages"]);
    /* Le « + » est sorti de la barre : une barre sert à aller quelque part, le
       bouton de création flotte au-dessus. */
    expect(within(nav).queryByRole("button", { name: /Nouvelle note/ })).toBeNull();
    expect(document.querySelector(".fab")).toBeTruthy();
  });

  it("suit l’ordre choisi, sans rien pouvoir perdre", async () => {
    const user = userEvent.setup();
    useNavStore.getState().setItems("mobile", ["review", "notes"]);
    open("/settings/navigation");

    // masquer n’existe plus : la liste est complétée et enregistrée
    await waitFor(() =>
      expect(useNavStore.getState().mobile).toContain("spaces"),
    );
    cleanup();
    open("/");
    const labels = [...bottomNav().querySelectorAll(".nav-item")].map((item) =>
      item.textContent?.trim().replace(/\d+/g, ""),
    );
    // « Réviser » d’abord, comme demandé, puis le reste du catalogue
    expect(labels[0]).toBe("Réviser");
    expect(labels).toContain("Notes");
    await user.keyboard("{Escape}");
  });
});

describe("Espaces, une seule hiérarchie", () => {
  it("liste les projets, sans page Projets ni page Vaults", async () => {
    open("/spaces");
    expect(await screen.findByRole("heading", { name: "Espaces" })).toBeTruthy();
    // les deux pages supprimées redirigent vers la seule page de la hiérarchie
    for (const legacy of ["/projects", "/vaults"]) {
      cleanup();
      open(legacy);
      await waitFor(() => expect(window.location.pathname).toBe("/spaces"));
    }
  });

  it("ouvre un projet, puis ses vaults", async () => {
    const user = userEvent.setup();
    open("/spaces");

    await user.click(await screen.findByRole("button", { name: "Ouvrir le projet Thèse" }));
    await waitFor(() => expect(window.location.pathname).toBe("/spaces/p-these"));
    expect(screen.getByRole("heading", { name: "Thèse" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ouvrir le vault Économie" })).toBeTruthy();
  });

  it("donne un graphe au projet comme au vault", async () => {
    const user = userEvent.setup();
    open("/spaces");
    await user.click(
      await screen.findByRole("button", { name: "Graphe du projet Thèse" }),
    );
    await waitFor(() => expect(window.location.pathname).toBe("/spaces/p-these/graph"));
    expect(screen.getByRole("heading", { name: "Graphe du projet" })).toBeTruthy();
    expect(screen.getByLabelText(/Graphe du projet Thèse/)).toBeTruthy();

    cleanup();
    open("/vault/v-eco");
    // le graphe du vault reste à sa place
    expect(screen.getAllByRole("button", { name: "Graphe du vault" }).length).toBeGreaterThan(0);
  });
});

describe("Bouton de création flottant", () => {
  it("change d’action selon la page et disparaît où il n’a rien à créer", async () => {
    const cases: [string, string][] = [
      ["/", "Nouvelle note"],
      ["/learn", "Nouvelle note"],
      ["/spaces", "Nouveau projet"],
      ["/spaces/p-these", "Nouveau vault"],
      ["/vault/v-eco", "Nouvelle fiche"],
    ];
    for (const [path, label] of cases) {
      cleanup();
      open(path);
      const fab = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(".fab");
        expect(found).toBeTruthy();
        return found!;
      });
      expect(fab.getAttribute("aria-label")).toBe(label);
    }

    // réglages, révision, graphes, formulaires : aucune création
    for (const path of ["/settings", "/review", "/spaces/p-these/graph", "/new"]) {
      cleanup();
      open(path);
      expect(document.querySelector(".fab")).toBeNull();
    }
  });

  it("crée là où il pointe", async () => {
    const user = userEvent.setup();
    open("/spaces");
    await user.click(document.querySelector<HTMLElement>(".fab")!);
    await waitFor(() => expect(window.location.search).toContain("new=1"));
    expect(await screen.findByText("Nouveau projet", { selector: "h2" })).toBeTruthy();
  });
});

describe("Rail du bureau", () => {
  it("suit le même catalogue que le téléphone", async () => {
    await withDesktop(() => {
      open("/spaces");
      const rail = document.querySelector<HTMLElement>(".rail")!;
      expect(within(rail).getByRole("button", { name: "Notes" })).toBeTruthy();
      expect(within(rail).getByRole("button", { name: "Espaces" })).toBeTruthy();
      expect(within(rail).getByRole("button", { name: "Apprendre" })).toBeTruthy();
      // les pages supprimées ne sont plus des entrées de navigation
      expect(within(rail).queryByRole("button", { name: "Projets" })).toBeNull();
      expect(within(rail).queryByRole("button", { name: "Vaults" })).toBeNull();
      // le studio des cartes est un réglage, pas une page de navigation
      expect(within(rail).queryByRole("button", { name: /Studio des cartes/ })).toBeNull();
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
  it("ne propose aucun sélecteur d’appareil : l’écran parle de la surface en cours", async () => {
    open("/settings/navigation");

    // le défaut retiré : plus de bascule Téléphone / Bureau
    expect(await screen.findByText(/Aperçu — barre du bas/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Bureau" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Téléphone" })).toBeNull();
  });

  it("ne propose ni « Retirer » ni « Afficher » : tout tient, rien à masquer", async () => {
    open("/settings/navigation");
    expect(await screen.findByText("Pages affichées")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Retirer / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Afficher / })).toBeNull();
    // le réordonnancement, lui, reste
    expect(screen.getByRole("button", { name: "Monter Réviser" })).toBeTruthy();
  });

  it("réordonne la barre du téléphone, et rien d’autre", async () => {
    const user = userEvent.setup();
    const desktopBefore = useNavStore.getState().desktop;
    open("/settings/navigation");

    await user.click(await screen.findByRole("button", { name: "Monter Réviser" }));
    await waitFor(() =>
      expect(useNavStore.getState().mobile.slice(0, 3)).toEqual([
        "notes",
        "review",
        "spaces",
      ]),
    );
    expect(useNavStore.getState().desktop).toEqual(desktopBefore);
  });

  it("sur bureau, montre le rail et réordonne sa liste", async () => {
    await withDesktop(async () => {
      const user = userEvent.setup();
      open("/settings/navigation");

      expect(await screen.findByText(/Aperçu — rail latéral/)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^Retirer / })).toBeNull();

      await user.click(screen.getByRole("button", { name: "Monter Apprendre" }));
      await waitFor(() =>
        expect(useNavStore.getState().desktop.indexOf("learn")).toBeLessThan(
          useNavStore.getState().desktop.indexOf("review"),
        ),
      );
      // « Réglages » n’est jamais dans la liste du bureau : il est en pied de rail
      expect(useNavStore.getState().desktop).not.toContain("settings");
    });
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

/**
 * Le menu du surplus — **vers le haut**, avec les icônes.
 *
 * Il n'apparaît plus aujourd'hui (cinq pages, cinq places), mais la pièce est
 * testée pour ce qu'elle est : un menu ancré, nommé, accessible, qui ne
 * recouvre pas l'écran comme le faisait la feuille du bas.
 */
describe("Menu des pages en trop", () => {
  it("s’ouvre au-dessus du bouton et laisse la page visible", async () => {
    render(
      <NavMoreMenu
        items={[
          { id: "review", label: "Réviser", icon: ClockCounterClockwise, to: "/review" },
          { id: "learn", label: "Apprendre", icon: GraduationCap, to: "/learn" },
        ]}
        onPick={() => undefined}
        onClose={() => undefined}
        active={() => false}
      />,
    );

    const menu = screen.getByRole("menu", { name: "Autres pages" });
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
    expect(within(menu).getByText("Réviser")).toBeTruthy();
    // pas de feuille modale : aucun voile, aucun dialogue
    expect(document.querySelector(".sheet")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("se ferme à Échap et livre la page choisie", async () => {
    const onClose = vi.fn();
    const onPick = vi.fn();
    const { rerender } = render(
      <NavMoreMenu
        items={[{ id: "review", label: "Réviser", icon: ClockCounterClockwise, to: "/review" }]}
        onPick={onPick}
        onClose={onClose}
        active={() => false}
      />,
    );

    await userEvent.setup().click(screen.getByRole("menuitem", { name: "Réviser" }));
    expect(onPick).toHaveBeenCalledWith("/review");

    rerender(
      <NavMoreMenu
        items={[{ id: "review", label: "Réviser", icon: ClockCounterClockwise, to: "/review" }]}
        onPick={onPick}
        onClose={onClose}
        active={() => false}
      />,
    );
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});

/**
 * Présentation — l'écran qui ne marchait pas.
 *
 * Les réglages de papier et de traits étaient écrits en CSS alors que la
 * palette pose les mêmes variables en style en ligne : le style en ligne
 * gagnait, donc deux contrôles ne faisaient rien. On vérifie ici l'effet
 * **observé sur le document**, pas la présence d'un bouton.
 */
describe("Présentation", () => {
  const root = () => document.documentElement;

  it("écrit l’attribut et les variables à chaque changement", async () => {
    const user = userEvent.setup();
    open("/settings/personalization");
    await screen.findByText("Formes");

    await user.click(screen.getByRole("button", { name: "Très ronds" }));
    await waitFor(() => expect(root().dataset.radius).toBe("soft"));

    await user.click(screen.getByRole("button", { name: "Marqués" }));
    await waitFor(() => expect(root().dataset.borders).toBe("strong"));

    // changer le papier déplace réellement le fond de l'application
    const before = root().style.getPropertyValue("--bg");
    await user.click(screen.getByRole("button", { name: "Brume" }));
    await waitFor(() => expect(root().dataset.paper).toBe("mist"));
    expect(root().style.getPropertyValue("--bg")).not.toBe(before);
  });

  it("suit les curseurs, valeur comprise", async () => {
    open("/settings/personalization");
    await screen.findByText("Mesure");

    // un `range` ne se tape pas : on déclenche son événement natif
    const leading = screen.getByLabelText("Interligne des notes");
    fireEvent.change(leading, { target: { value: "34" } });
    await waitFor(() =>
      expect(root().style.getPropertyValue("--note-leading")).toBe("34px"),
    );
    expect(useAppStore.getState().settings.personalization?.noteLeading).toBe(34);
  });

  it("affiche le studio des cartes dans les réglages, pas dans la navigation", async () => {
    open("/settings");
    expect(await screen.findByText("Studio des cartes")).toBeTruthy();
    // et il se règle bien à son adresse
    cleanup();
    open("/settings/cards");
    expect(await screen.findByText("Studio des cartes")).toBeTruthy();
  });
});
