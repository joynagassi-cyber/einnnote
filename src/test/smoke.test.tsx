import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useLibraryFilters } from "@/stores/useLibraryFilters";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { DEFAULT_FILTERS } from "@/lib/libraryFilters";

/** Place le curseur à la fin du dernier bloc (jsdom ne sait pas cliquer). */
function caretAtEnd(container: HTMLElement) {
  const target = container.lastElementChild ?? container;
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
}

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

/**
 * L’écran d’Apparence ouvre ses sections repliées : on déplie celle qu’on teste.
 * L’en-tête porte « Déplier Palette », « Déplier Accent », etc.
 */
async function expand(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  const bouton = await screen.findByRole("button", { name: `Déplier ${title}` });
  await user.click(bouton);
  return bouton;
}

/** Simule un poste de travail (media query bureau) le temps d’un test. */
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
  useLibraryFilters.setState({ filters: DEFAULT_FILTERS });
  useContentStore.persist.clearStorage();
  // Réhydrate les données de démonstration
  useAppStore.setState({ activeProjectId: null });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
  /* Tout le contenu de démonstration est remis en place : un test qui vide le
     magasin ne doit pas laisser les suivants devant un vault vide. */
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

describe("Einnote — écrans", () => {
  it("affiche la bibliothèque et le bandeau des révisions", async () => {
    open("/");
    expect(
      screen.getByRole("heading", { name: "Bibliothèque" }),
    ).toBeTruthy();
    expect(screen.getByText(/cartes? à revoir/)).toBeTruthy();
    expect(screen.getByText("Contrats commerciaux")).toBeTruthy();
    expect(screen.getByText(/vault Économie/)).toBeTruthy();
    // Carte-rectangle : méthode employée + aperçu réel du contenu
    expect(screen.getAllByText("Cornell").length).toBeGreaterThan(0);
    expect(screen.getByText(/Conditions de validité/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Ouvrir « Contrats commerciaux »" }),
    ).toBeTruthy();
  });

  it("filtre les notes par collection depuis le panneau de filtres", async () => {
    const user = userEvent.setup();
    open("/");
    await user.click(screen.getByRole("button", { name: /^Filtres/ }));
    await user.click(screen.getByRole("button", { name: /^Droit des affaires/ }));
    await user.click(screen.getByRole("button", { name: /^Voir \d+ note/ }));
    expect(screen.getByText("Contrats commerciaux")).toBeTruthy();
    expect(screen.queryByText("Plan du chapitre 3")).toBeNull();
    // l’état du filtre reste visible et retirable
    expect(
      screen.getByRole("button", { name: "Retirer le filtre Droit des affaires" }),
    ).toBeTruthy();
    expect(screen.getByTestId("library-count").textContent).toContain("sur");
  });

  it("combine méthode et révision, puis efface tout", async () => {
    const user = userEvent.setup();
    open("/");
    await user.click(screen.getByRole("button", { name: /^Filtres/ }));
    await user.click(screen.getByRole("button", { name: /^Cornell/ }));
    await user.click(screen.getByRole("button", { name: /^À revoir/ }));
    // les comptes à facettes tiennent compte des autres critères
    const seeAll = screen.getByRole("button", { name: /^Voir \d+ note/ });
    expect(seeAll.textContent).toMatch(/Voir [0-2] note/);
    await user.click(seeAll);
    expect(screen.getByText("Contrats commerciaux")).toBeTruthy();
    expect(screen.queryByText("Système nerveux")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Tout effacer" }));
    expect(screen.getByText("Système nerveux")).toBeTruthy();
    expect(screen.getByTestId("library-count").textContent).toMatch(/^\d+ notes?$/);
  });

  it("cherche dans les questions et signale l’absence de résultat", async () => {
    const user = userEvent.setup();
    open("/");
    await user.type(
      screen.getByLabelText("Rechercher dans les notes"),
      "sanction",
    );
    expect(screen.getByText("Contrats commerciaux")).toBeTruthy();
    expect(screen.queryByText("Plan du chapitre 3")).toBeNull();
    await user.clear(screen.getByLabelText("Rechercher dans les notes"));
    await user.type(screen.getByLabelText("Rechercher dans les notes"), "zzz");
    expect(screen.getByText("Aucune note ne correspond")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Effacer les filtres" }));
    expect(screen.getByText("Contrats commerciaux")).toBeTruthy();
  });

  it("propose les quatre méthodes", () => {
    open("/new");
    expect(screen.getByText("Que voulez-vous faire ?")).toBeTruthy();
    expect(screen.getByText("Outline")).toBeTruthy();
    expect(screen.getByText("Cornell")).toBeTruthy();
    expect(screen.getByText("Carte mentale")).toBeTruthy();
    expect(screen.getByText("Zettelkasten")).toBeTruthy();
    expect(screen.getByText("Conseillé pour un cours")).toBeTruthy();
  });

  it("affiche l’éditeur Cornell avec ses questions", () => {
    open("/note/n-contrats");
    expect(screen.getByText("Questions 3")).toBeTruthy();
    expect(
      screen.getByText(/Conditions de validité/),
    ).toBeTruthy();
    expect(screen.getByText("Q1")).toBeTruthy();
  });

  it("affiche la carte mentale", async () => {
    open("/mindmap/m-systeme");
    await waitFor(() =>
      expect(screen.getAllByText("Système nerveux").length).toBeGreaterThan(0),
    );
    expect(screen.getByText("Central")).toBeTruthy();
    expect(screen.getByText("Périphérique")).toBeTruthy();
  });

  it("affiche la pile Zettelkasten", () => {
    open("/vault/v-eco");
    expect(screen.getByText("Économie")).toBeTruthy();
    expect(screen.getByText("L’inflation et l’épargne")).toBeTruthy();
    expect(screen.getByText(/Glissez la carte/)).toBeTruthy();
  });

  it("affiche le formulaire de nouvelle carte", () => {
    open("/vault/v-eco/new");
    expect(screen.getByText("Nouvelle carte")).toBeTruthy();
    expect(screen.getByText(/Vault Économie/)).toBeTruthy();
    expect(screen.getByLabelText("Source ou référence")).toBeTruthy();
  });

  it("affiche le graphe du vault en arbre, avec toutes les fiches (bureau)", () =>
    withDesktop(async () => {
      open("/vault/v-eco/graph");
      expect(screen.getByText("Graphe · Économie")).toBeTruthy();
      // chaque fiche du vault a une carte sur le canevas (arbre par défaut)
      const cards = useContentStore.getState().zettel.filter((card) => card.vaultId === "v-eco");
      await waitFor(() =>
        expect(document.querySelectorAll(".react-flow__node").length).toBe(cards.length),
      );
      expect(screen.getByText("L’inflation et l’épargne")).toBeTruthy();
      // la racine est choisie, pas laissée au hasard : la fiche la plus citée
      expect(screen.getAllByText(/#1A$/).length).toBeGreaterThan(0);
      /* jsdom ne mesure pas les nœuds, donc React Flow ne dessine aucune arête :
         on vérifie le nombre de liens annoncé, calculé par le même modèle. */
      expect(screen.getByText(/liens d’arbre/)).toBeTruthy();
    }));

  it("montre la fiche et ses voisines sur téléphone, pas un arbre illisible", async () => {
    open("/vault/v-eco/graph");
    const cards = useContentStore.getState().zettel.filter((card) => card.vaultId === "v-eco");
    await waitFor(() => {
      const shown = document.querySelectorAll(".react-flow__node").length;
      expect(shown).toBeGreaterThan(1);
      /* Vue « autour » : la racine et ses voisins, jamais les douze fiches. */
      expect(shown).toBeLessThan(cards.length);
    });
    expect(screen.getByRole("button", { name: "Tout" })).toBeTruthy();
    // la bascule vers l’arbre entier existe et fonctionne
    await userEvent.setup().click(screen.getByRole("button", { name: "Tout" }));
    await waitFor(() =>
      expect(document.querySelectorAll(".react-flow__node").length).toBe(cards.length),
    );
  });

  it("change de style de graphe et s’en souvient", async () => {
    const user = userEvent.setup();
    await withDesktop(async () => {
    open("/vault/v-eco/graph");
    await user.click(screen.getByRole("button", { name: "Styles de graphe" }));
    await user.click(screen.getByRole("button", { name: "Style Réseau" }));
    expect(useAppStore.getState().settings.graphStyle).toBe("reseau");
    await waitFor(() =>
      expect(document.querySelectorAll(".react-flow__node").length).toBe(
        useContentStore.getState().zettel.filter((card) => card.vaultId === "v-eco").length,
      ),
    );
    });
  });

  it("relit le vault depuis une autre fiche racine", async () => {
    const user = userEvent.setup();
    await withDesktop(async () => {
    open("/vault/v-eco/graph");
    await user.click(screen.getByRole("button", { name: "Choisir la fiche racine" }));
    await user.click(screen.getByRole("button", { name: /Le pouvoir d’achat/ }));
    await waitFor(() =>
      expect(document.querySelectorAll(".react-flow__node").length).toBe(
        useContentStore.getState().zettel.filter((card) => card.vaultId === "v-eco").length,
      ),
    );
    const canvas = screen.getByLabelText(/Graphe du vault Économie/);
    expect(canvas.getAttribute("aria-label")).toContain("racine #1A1a");
    });
  });

  it("affiche les leçons et une leçon", () => {
    open("/learn");
    expect(screen.getByText("Tutoriels par outil")).toBeTruthy();
    cleanup();
    open("/learn/t-cornell");
    expect(screen.getByText(/Leçon 2 sur 6/)).toBeTruthy();
    expect(screen.getByText("Écrivez d’abord, normalement")).toBeTruthy();
  });

  it("affiche les réglages et l’apparence", async () => {
    const user = userEvent.setup();
    open("/settings");
    expect(screen.getByRole("heading", { name: "Réglages" })).toBeTruthy();
    expect(screen.getByText("Apparence")).toBeTruthy();
    cleanup();
    open("/settings/appearance");

    // l’écran s’ouvre sur la composition, sections repliées
    expect(screen.getByText("Votre composition")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Déplier Palette" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Déplier Fond" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Déplier Accent" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Déplier Formes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Déplier Texte" })).toBeTruthy();
    // replié : les 23 vignettes ne sont pas rendues
    expect(screen.queryByLabelText(/Thème Mocha/)).toBeNull();

    await expand(user, "Palette");
    expect(screen.getByText("Mode")).toBeTruthy();
    // 23 palettes nommées, chacune avec sa source
    expect(screen.getByLabelText(/Thème Mocha/)).toBeTruthy();
    expect(screen.getByLabelText(/Thème Solarized clair/)).toBeTruthy();

    await expand(user, "Accent");
    expect(screen.getByLabelText("Bleu")).toBeTruthy();

    await expand(user, "Texte");
    expect(screen.getByLabelText("Taille du texte")).toBeTruthy();

    // et l’on peut refermer pour retrouver l’aperçu
    await user.click(screen.getByRole("button", { name: "Replier Texte" }));
    expect(screen.queryByLabelText("Taille du texte")).toBeNull();
  });

  it("change de thème et l’applique au document", async () => {
    const user = userEvent.setup();
    open("/settings/appearance");
    await expand(user, "Palette");
    await user.click(screen.getByRole("button", { name: "Sombre" }));
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark"),
    );
    await expand(user, "Accent");
    await user.click(screen.getByLabelText("Terracotta"));
    await waitFor(() =>
      expect(document.documentElement.dataset.accent).toBe("terracotta"),
    );
  });

  it("applique un accent libre et vérifie son contraste", async () => {
    const user = userEvent.setup();
    open("/settings/appearance");
    await expand(user, "Accent");
    const hex = screen.getByLabelText("Code hexadécimal");
    await user.clear(hex);
    await user.type(hex, "#FFFF00");
    // le verdict de contraste est calculé, pas décoratif
    expect(screen.getByText(/Texte sur fond :/).textContent).toMatch(
      /\d,\d:1 · (AAA|AA|AA-large)/,
    );
    await user.click(screen.getByRole("button", { name: "Appliquer" }));
    await waitFor(() => {
      expect(document.documentElement.dataset.accent).toBe("custom");
      const value = document.documentElement.style.getPropertyValue("--accent");
      expect(value).toMatch(/^#[0-9A-F]{6}$/i);
    });
    // un jaune pur est assombri pour rester lisible sur le papier
    const accent = document.documentElement.style.getPropertyValue("--accent");
    expect(accent.toUpperCase()).not.toBe("#FFFF00");

    // retour à un preset : la teinte est réaccordée au papier, pas retirée
    await user.click(screen.getByRole("button", { name: "Teal" }));
    await waitFor(() => {
      expect(document.documentElement.dataset.accent).toBe("teal");
      expect(
        document.documentElement.style.getPropertyValue("--accent"),
      ).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  it("affiche les écrans de données, de progrès et de statistiques", () => {
    open("/settings/data");
    expect(screen.getByText("Créer une sauvegarde")).toBeTruthy();
    cleanup();
    // « Progrès » a rejoint une vraie surface : /stats
    open("/settings/progress");
    expect(screen.getByRole("heading", { name: "Statistiques" })).toBeTruthy();
    expect(screen.getByText("Par méthode")).toBeTruthy();
    expect(screen.getByText("Rétention par semaine")).toBeTruthy();
    cleanup();
    open("/settings/trash");
    expect(screen.getByText("Corbeille vide")).toBeTruthy();
  });

  it("ouvre le calendrier sur le mois en cours", () => {
    open("/calendar");
    expect(screen.getByRole("heading", { name: "Calendrier" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Aujourd’hui/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mois précédent" })).toBeTruthy();
    // un jour est sélectionné par défaut : le panneau latéral est rempli
    expect(screen.getByText(/^\d+ événement|Rien ce jour-là/)).toBeTruthy();
  });

  it("choisit une portée, démarre une révision et évalue une carte", async () => {
    const user = userEvent.setup();
    open("/review");
    // On entre par le choix de portée, pas au milieu d’une carte.
    expect(screen.getByText("Portée de la séance")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Réviser les \d+ cartes/ }));
    expect(screen.getByRole("progressbar")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Afficher la réponse" }));
    const good = screen.getByRole("button", { name: /Bien/ });
    await user.click(good);
    await waitFor(() => expect(screen.getByText(/^2 \/ \d+$/)).toBeTruthy());
  });

  it("révise une seule note Cornell, sans les autres", async () => {
    const user = userEvent.setup();
    open("/review");
    await user.click(screen.getByRole("button", { name: "Note" }));
    const rows = screen.getAllByRole("button", { name: /^Réviser$/ });
    await user.click(rows[0]);
    expect(screen.getAllByText(/Contrats commerciaux/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Plan du chapitre 3/)).toBeNull();
  });

  it("déplie le verso d’une carte et y montre le passage écrit", async () => {
    const user = userEvent.setup();
    open("/review/session?scope=note&id=n-contrats&mode=all");
    await user.click(screen.getByRole("button", { name: "Afficher la réponse" }));
    expect(screen.getByText("Ce que vous aviez écrit")).toBeTruthy();
    expect(screen.getByText(/Aperçu de la note/)).toBeTruthy();
  });

  it("crée une carte Zettelkasten", async () => {
    const user = userEvent.setup();
    open("/vault/v-eco/new");
    await user.type(screen.getByLabelText("Titre de l’idée"), "Une idée neuve");
    await user.type(
      screen.getByLabelText("Dans vos propres mots"),
      "Écrite avec mes mots.",
    );
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(screen.getAllByText("Une idée neuve").length).toBeGreaterThan(0),
    );
  });

  it("renomme la note depuis l’en-tête de l’éditeur", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    const title = screen.getByPlaceholderText("Titre de la note");
    await user.clear(title);
    await user.type(title, "Contrats — fiche");
    await waitFor(() =>
      expect(
        useContentStore.getState().notes.find((n) => n.id === "n-contrats")?.title,
      ).toBe("Contrats — fiche"),
    );
  });

  it("applique un style à une carte mentale sans toucher au texte", async () => {
    const user = userEvent.setup();
    open("/mindmap/m-systeme");
    await waitFor(() =>
      expect(screen.getAllByText("Système nerveux").length).toBeGreaterThan(0),
    );
    const before = useContentStore
      .getState()
      .mindmaps.find((map) => map.id === "m-systeme")!;
    const texts = before.nodes.map((node) => node.text).sort();

    await user.click(screen.getByRole("button", { name: "Styles de graphe" }));
    await user.click(screen.getByRole("button", { name: "Style Flux" }));

    const after = useContentStore
      .getState()
      .mindmaps.find((map) => map.id === "m-systeme")!;
    expect(after.styleId).toBe("flux");
    expect(after.nodes.map((node) => node.text).sort()).toEqual(texts);
    // la disposition est recalculée : au moins un nœud a bougé
    expect(
      after.nodes.some((node, index) => node.x !== before.nodes[index].x || node.y !== before.nodes[index].y),
    ).toBe(true);
  });

  it("modifie un nœud de la carte mentale (double appui)", async () => {
    const user = userEvent.setup();
    open("/mindmap/m-systeme");
    await waitFor(() =>
      expect(screen.getAllByText("Système nerveux").length).toBeGreaterThan(0),
    );
    const node = screen
      .getAllByText("Système nerveux")
      .find((element) => element.closest(".react-flow__node"));
    expect(node).toBeTruthy();
    await user.dblClick(node!);
    const field = screen.getByLabelText("Texte");
    await user.clear(field);
    await user.type(field, "Système nerveux central");
    await user.click(screen.getByRole("button", { name: "Terminé" }));
    await waitFor(() =>
      expect(screen.getAllByText("Système nerveux central").length).toBeGreaterThan(0),
    );
  });

  it("termine une leçon et conserve la progression", async () => {
    const user = userEvent.setup();
    open("/learn/t-cornell");
    const before = useContentStore.getState().progress.length;
    for (let i = 0; i < 10; i += 1) {
      const next = screen.queryByRole("button", { name: /Continuer|Terminer/ });
      if (!next) break;
      await user.click(next);
    }
    await waitFor(() =>
      expect(useContentStore.getState().progress.length).toBeGreaterThanOrEqual(
        before,
      ),
    );
  });

  it("affiche le rail de navigation en mode bureau", async () => {
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

    try {
      open("/");
      const rail = screen.getByRole("complementary", {
        name: "Barre latérale",
      });
      expect(within(rail).getByText("Einnote")).toBeTruthy();
      expect(within(rail).getByRole("button", { name: "Apprendre" })).toBeTruthy();
      // le rail ne crée plus de note : c’est le bouton flottant qui s’en charge
      expect(within(rail).queryByRole("button", { name: /Nouvelle note/ })).toBeNull();

      const user = userEvent.setup();
      await user.click(within(rail).getByRole("button", { name: "Apprendre" }));
      await waitFor(() =>
        expect(screen.getByText("Tutoriels par outil")).toBeTruthy(),
      );
    } finally {
      window.matchMedia = original;
    }
  });

  it("donne un rail compact — et aucune barre basse — dès 768 px", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("min-width: 768px"),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      const { container } = open("/");
      const rail = screen.getByRole("complementary", {
        name: "Barre latérale",
      });
      expect(rail.getAttribute("data-compact")).toBe("true");
      // Icônes seules : le libellé reste accessible autrement qu’à l’œil.
      expect(
        within(rail).getByRole("button", { name: "Apprendre" }).className,
      ).toContain("justify-center");
      expect(container.querySelector(".bottom-nav")).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  it("honore ?mobile=1 même sur un grand écran : une seule navigation", async () => {
    const { container } = await withDesktop(() => open("/?mobile=1"));
    expect(document.documentElement.dataset.layout).toBe("mobile");
    expect(screen.queryByRole("complementary", { name: "Barre latérale" })).toBeNull();
    expect(container.querySelector(".bottom-nav")).not.toBeNull();
  });

  it("ne fabrique pas un rail sur 390 px, même avec ?bureau=1", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("color-scheme"),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      const { container } = open("/?bureau=1");
      expect(screen.queryByRole("complementary", { name: "Barre latérale" })).toBeNull();
      expect(container.querySelector(".bottom-nav")).not.toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  it("écrit dans l’éditeur TipTap et enregistre sans perdre le bloc", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    const prose = screen.getByLabelText("Contenu de la note");
    expect(prose.getAttribute("contenteditable")).toBe("true");
    (prose as HTMLElement).focus();
    caretAtEnd(prose);
    await user.keyboard("{Enter}Nouvelle ligne");
    await waitFor(() => {
      const blocks = useContentStore.getState().notes.find(
        (n) => n.id === "n-contrats",
      )!.blocks;
      expect(blocks.some((b) => b.html.includes("Nouvelle ligne"))).toBe(true);
    });
    // les identifiants d’origine et les questions restent ancrés
    const blocks = useContentStore.getState().notes.find(
      (n) => n.id === "n-contrats",
    )!.blocks;
    expect(blocks[0].id).toBe("c1");
  });

  it("applique une puce depuis la barre d’outils", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByLabelText("Contenu de la note"));
    await user.click(screen.getByRole("button", { name: "Liste à puces" }));
    await waitFor(() => {
      const blocks = useContentStore.getState().notes.find(
        (n) => n.id === "n-plan",
      )!.blocks;
      expect(blocks.some((b) => b.bullet)).toBe(true);
    });
  });

  it("ouvre le menu « / » et insère un titre", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    const prose = screen.getByLabelText("Contenu de la note");
    (prose as HTMLElement).focus();
    caretAtEnd(prose);
    await user.keyboard("{Enter}/");
    const menu = await screen.findByRole("menu", { name: "Insérer un bloc" });
    expect(menu).toBeTruthy();
    await user.click(screen.getByRole("menuitem", { name: /Titre 1/ }));
    await waitFor(() => {
      const blocks = useContentStore.getState().notes.find(
        (n) => n.id === "n-plan",
      )!.blocks;
      expect(blocks.some((b) => b.kind === "h1")).toBe(true);
    });
  });

  it("filtre la bibliothèque sur un seul projet", async () => {
    const user = userEvent.setup();
    open("/");
    expect(screen.getByText("Contrats commerciaux")).toBeTruthy();
    expect(screen.getByText("Inflation et épargne")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Thèse" }));

    expect(screen.getByText("Inflation et épargne")).toBeTruthy();
    expect(screen.queryByText("Contrats commerciaux")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Thèse" }).getAttribute("aria-pressed"),
    ).toBe("true");

    await user.click(screen.getByRole("button", { name: "Tous les projets" }));
    expect(screen.getByText("Contrats commerciaux")).toBeTruthy();
  });

  it("affiche la personnalisation avancée et applique la densité au document", async () => {
    const user = userEvent.setup();
    open("/settings/personalization");
    expect(screen.getByText("Teinte du papier")).toBeTruthy();
    expect(screen.getByText("Force du canevas")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Aérée" }));
    expect(document.documentElement.dataset.density).toBe("airy");

    await user.click(screen.getByRole("button", { name: "Brume" }));
    expect(document.documentElement.dataset.paper).toBe("mist");

    const leading = screen.getByLabelText("Interligne des notes") as HTMLInputElement;
    expect(leading.value).toBe("28");
  });

  it("présente le mobile et le bureau côte à côte sur /preview", () => {
    open("/preview");
    expect(screen.getByTitle("Application en 390 px")).toBeTruthy();
    expect(screen.getByTitle("Application en 1280 px")).toBeTruthy();
  });

  it("change de palette et applique ses jetons au document", async () => {
    const user = userEvent.setup();
    open("/settings/appearance");
    await expand(user, "Palette");
    await user.click(screen.getByLabelText(/Thème Mocha/));
    await waitFor(() => {
      expect(document.documentElement.dataset.palette).toBe("mocha");
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
    // le fond vient de la palette, pas du papier par défaut
    expect(
      document.documentElement.style.getPropertyValue("--bg").toUpperCase(),
    ).toBe("#1E1E2E");

    await user.click(screen.getByLabelText(/Thème Solarized clair/));
    await waitFor(() =>
      expect(document.documentElement.dataset.palette).toBe("solarized-clair"),
    );
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("règle l’affichage : grille, colonnes, regroupement et tri secondaire", async () => {
    const user = userEvent.setup();
    open("/");
    await user.click(screen.getByRole("button", { name: /^Affichage/ }));

    // grille → 3 colonnes demandées explicitement
    await user.click(screen.getByRole("button", { name: /^Grille/ }));
    await user.click(screen.getByRole("button", { name: "Plus de colonnes" }));
    const columns = useDisplayStore.getState().get("library").columns;
    expect(typeof columns).toBe("number");
    expect(screen.getByText(/\d col\./)).toBeTruthy();

    // regroupement par méthode : les en-têtes apparaissent
    await user.click(screen.getByRole("button", { name: /Grouper par/ }));
    await user.click(screen.getByRole("button", { name: "Méthode" }));
    expect(screen.getAllByText("Cornell").length).toBeGreaterThan(0);

    // tri principal + secondaire
    await user.selectOptions(screen.getByLabelText("Trier par"), "title");
    await user.selectOptions(screen.getByLabelText("Puis trier par"), "due");

    await user.click(screen.getByRole("button", { name: /^Liste/ }));
    expect(
      screen.getByRole("button", { name: /^Liste/ }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("affiche les projets avec leurs compteurs réels", async () => {
    open("/spaces");
    expect(screen.getByRole("heading", { name: "Espaces" })).toBeTruthy();
    expect(screen.getByText("Thèse")).toBeTruthy();
    // les compteurs sont calculés, pas décoratifs : un vault au moins
    expect(screen.getAllByText(/\d+ vault/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\d+ fiche/).length).toBeGreaterThan(0);
  });

  it("garde des préférences d’affichage propres à chaque écran", async () => {
    const user = userEvent.setup();
    open("/");
    await user.click(screen.getByRole("button", { name: /^Affichage/ }));
    await user.click(screen.getByRole("button", { name: /^Liste/ }));
    expect(useDisplayStore.getState().get("library").view).toBe("list");

    cleanup();
    open("/vault/v-eco");
    await user.click(screen.getByRole("button", { name: /^Affichage/ }));
    await user.click(screen.getByRole("button", { name: /^Grille/ }));
    expect(useDisplayStore.getState().get("vault").view).toBe("grid");
    // la bibliothèque n’a pas bougé
    expect(useDisplayStore.getState().get("library").view).toBe("list");
  });

  it("trie réellement la corbeille", async () => {
    const user = userEvent.setup();
    const seed = useContentStore.getInitialState().notes;
    const contrats = seed.find((note) => note.id === "n-contrats")!;
    const plan = seed.find((note) => note.id === "n-plan")!;
    // Contrats supprimée le plus récemment → elle arrive en second au tri par défaut
    useContentStore.setState({
      notes: [
        { ...contrats, deletedAt: "2026-10-20T10:00:00.000Z" },
        { ...plan, deletedAt: "2026-10-01T10:00:00.000Z" },
      ],
    });

    open("/settings/trash");
    const order = () =>
      screen
        .getAllByRole("listitem")
        .map((item) => item.textContent?.split("·")[0].trim() ?? "");
    expect(order()[0]).toContain("Plan du chapitre 3");

    await user.click(screen.getByRole("button", { name: /^Affichage/ }));
    await user.selectOptions(screen.getByLabelText("Trier par"), "title");
    await waitFor(() => expect(order()[0]).toContain("Contrats commerciaux"));
    expect(order()[1]).toContain("Plan du chapitre 3");
  });

  it("crée une note Cornell depuis le modèle d’enseignement biblique", async () => {
    const user = userEvent.setup();
    open("/new");
    await user.click(screen.getByRole("button", { name: /^Cornell/ }));
    expect(
      screen.getByText(/Cornell — 6 modèles/),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Enseignement biblique/ }));
    const title = screen.getByLabelText("Titre de la note") as HTMLInputElement;
    expect(title.value).toContain("Enseignement biblique");

    // les champs demandés sont réellement dans le contenu de la note
    const content = document.querySelector(".note-prose")?.textContent ?? "";
    for (const field of ["Orateur", "Thème", "Verset principal", "Détails de l’enseignement"]) {
      expect(content, field).toContain(field);
    }
  });

  it("crée une carte mentale depuis un modèle et permet de la remplacer", async () => {
    const user = userEvent.setup();
    open("/new");
    await user.click(screen.getByRole("button", { name: /^Carte mentale/ }));
    expect(screen.getByText(/Carte mentale — 14 modèles/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /SWOT \/ FFOM/ }));
    expect(screen.getByText("Forces (interne)")).toBeTruthy();
    expect(screen.getByText("Menaces (externe)")).toBeTruthy();

    // remplacer la carte par un autre modèle, en deux gestes
    await user.click(screen.getByRole("button", { name: "Modèles de carte" }));
    await user.click(screen.getByRole("button", { name: /Ishikawa/ }));
    const apply = screen.getByRole("button", {
      name: "Remplacer la carte par ce modèle",
    });
    await user.click(apply);
    await waitFor(() => expect(screen.getByText("Main-d’œuvre")).toBeTruthy());
    expect(screen.queryByText("Forces (interne)")).toBeNull();
  });

  it("préremplit une fiche Zettelkasten depuis un modèle", async () => {
    const user = userEvent.setup();
    open("/vault/v-eco/new");
    await user.click(screen.getByRole("button", { name: "Fiche de lecture" }));
    const body = screen.getByLabelText("Dans vos propres mots") as HTMLTextAreaElement;
    expect(body.value).toContain("Idée principale de la source");
    const source = screen.getByLabelText("Source ou référence") as HTMLInputElement;
    expect(source.value).toContain("Auteur, Titre");
  });

  it("insère les sections d’un modèle dans une note existante", async () => {
    const user = userEvent.setup();
    open("/note/n-contrats");
    await user.click(screen.getByRole("button", { name: "Options de la note" }));
    await user.click(screen.getByRole("button", { name: /Insérer un modèle/ }));
    await user.click(screen.getByRole("button", { name: /Lecture d’article scientifique/ }));
    const content = document.querySelector(".note-prose")?.textContent ?? "";
    expect(content).toContain("Indices de lecture");
    // le contenu d’origine est toujours là
    expect(content).toContain("Conditions de validité");
  });

  it("affiche la colonne de filtres en bureau, sans feuille", async () => {
    await withDesktop(async () => {
      const user = userEvent.setup();
      open("/");
      const rail = screen.getByRole("complementary", { name: "Filtres" });
      expect(within(rail).getByText("Méthode")).toBeTruthy();
      // plus de déclencheur « Filtres » ni de feuille
      expect(screen.queryByRole("button", { name: /^Filtres/ })).toBeNull();

      await user.click(within(rail).getByRole("button", { name: /^Droit des affaires/ }));
      expect(screen.queryByText("Plan du chapitre 3")).toBeNull();
      expect(
        screen.getByRole("button", {
          name: "Retirer le filtre Droit des affaires",
        }),
      ).toBeTruthy();
    });
  });

  it("tient les questions dans une colonne latérale en bureau", async () => {
    await withDesktop(async () => {
      open("/note/n-contrats");
      const aside = screen.getByRole("complementary", {
        name: "Questions de la note",
      });
      expect(within(aside).getAllByText(/question/).length).toBeGreaterThan(0);
      expect(
        within(aside).getByRole("button", { name: /^Trier/ }),
      ).toBeTruthy();
      // l’onglet flottant et la feuille mobile disparaissent
      expect(
        screen.queryByRole("button", { name: "Ouvrir le panneau des questions" }),
      ).toBeNull();
    });
  });

  it("répond au clavier : /, n, g+p et ?", async () => {
    await withDesktop(async () => {
      const user = userEvent.setup();
      open("/");

      // « n » crée une note
      await user.keyboard("n");
      await waitFor(() => expect(window.location.pathname).toBe("/new"));

      // « / » met le curseur dans la recherche (retour à la bibliothèque)
      window.history.pushState({}, "", "/");
      cleanup();
      open("/");
      await user.keyboard("/");
      expect(document.activeElement).toBe(
        screen.getByLabelText("Rechercher dans les notes"),
      );

      // taper « n » dans la recherche ne déclenche rien
      await user.keyboard("n");
      expect(window.location.pathname).toBe("/");

      // « g » puis « p » va aux espaces (le seul endroit où vivent les projets)
      (document.activeElement as HTMLElement).blur();
      await user.keyboard("gp");
      await waitFor(() => expect(window.location.pathname).toBe("/spaces"));

      // « ? » ouvre l’aide clavier
      await user.keyboard("?");
      expect(screen.getByText("Raccourcis clavier")).toBeTruthy();
    });
  });

  it("révise au clavier en bureau : Espace puis 1–4", async () => {
    await withDesktop(async () => {
      const user = userEvent.setup();
      open("/review/session?scope=all&mode=due");
      const card = screen.getByRole("heading", { level: 1 }).textContent;
      await user.keyboard(" ");
      await waitFor(() =>
        expect(screen.getByText("Ce que vous aviez écrit")).toBeTruthy(),
      );
      await user.keyboard("2");
      await waitFor(() =>
        expect(screen.getByText(/^2 \/ \d+$/)).toBeTruthy(),
      );
      // la carte suivante n’est pas la même question
      expect(screen.getByRole("heading", { level: 1 }).textContent).not.toBe(card);
    });
  });

  it("rappelle la sauvegarde une fois par lancement, et se laisse fermer", async () => {
    const user = userEvent.setup();
    open("/");
    const banner = await screen.findByLabelText("Sauvegarde");
    expect(banner.textContent).toContain("Aucune sauvegarde");

    // la croix ferme le rappel
    await user.click(screen.getByRole("button", { name: "Masquer le rappel de sauvegarde" }));
    expect(screen.queryByLabelText("Sauvegarde")).toBeNull();

    // et il ne revient pas en naviguant dans la même session
    cleanup();
    open("/");
    expect(screen.queryByLabelText("Sauvegarde")).toBeNull();
  });

  it("ne rappelle rien quand il n’y a rien à sauvegarder", () => {
    useContentStore.setState({
      notes: [],
      zettel: [],
      mindmaps: [],
      questions: [],
      links: [],
      cards: [],
    });
    open("/");
    expect(screen.queryByLabelText("Sauvegarde")).toBeNull();
  });

  it("liste les vaults d’un projet, en crée un et l’ouvre", async () => {
    const user = userEvent.setup();
    open("/spaces/p-these");
    expect(screen.getByRole("heading", { name: "Thèse" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ouvrir le vault Économie" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Nouveau vault/ }));
    await user.type(screen.getByLabelText("Nom du vault"), "Séminaire");
    await user.click(screen.getByRole("button", { name: "Créer et ouvrir" }));
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/vault\/v-/));
    const vaults = useContentStore.getState().vaults;
    expect(vaults.some((vault) => vault.name === "Séminaire")).toBe(true);
  });

  it("crée un vault entier depuis un modèle, en un geste", async () => {
    const user = userEvent.setup();
    open("/spaces/p-these");
    await user.click(screen.getByRole("button", { name: /Nouveau vault/ }));
    await user.click(screen.getByRole("button", { name: /Carte conceptuelle/ }));

    const state = useContentStore.getState();
    const vault = state.vaults.find((item) => item.name === "Carte conceptuelle");
    expect(vault).toBeTruthy();
    const cards = state.zettel.filter((card) => card.vaultId === vault!.id);
    expect(cards).toHaveLength(5);
    // les codes du modèle sont rendus tels quels, sinon les références pendent
    expect(cards.map((card) => card.code).sort()).toEqual(["#1A", "#1A1", "#1A2", "#1A3", "#1B"]);
    const codes = new Set(cards.map((card) => card.code));
    for (const card of cards) {
      for (const ref of card.refs) expect(codes.has(ref)).toBe(true);
    }
    // style et étiquettes qui vont avec le modèle
    expect(useAppStore.getState().settings.graphStyle).toBe("carte-conceptuelle");
    expect(useAppStore.getState().settings.graphLabels).toBe(true);
    await waitFor(() => expect(window.location.pathname).toBe(`/vault/${vault!.id}/graph`));
  });

  it("choisit un style par ses liens nommés, pas par hasard", async () => {
    const user = userEvent.setup();
    open("/vault/v-eco/graph");
    await user.click(screen.getByRole("button", { name: "Styles de graphe" }));
    await user.click(screen.getByRole("button", { name: "Style Carte conceptuelle" }));
    expect(useAppStore.getState().settings.graphLabels).toBe(true);
    await user.click(screen.getByRole("button", { name: "Style Réseau" }));
    expect(useAppStore.getState().settings.graphLabels).toBe(false);
  });

  it("règle l’affichage du graphe et le garde", async () => {
    const user = userEvent.setup();
    open("/vault/v-eco/graph");
    await user.click(screen.getByRole("button", { name: "Affichage et export" }));

    const labels = screen.getByRole("switch", { name: /Étiquettes de relation/ });
    expect(labels.getAttribute("aria-checked")).toBe("false");
    await user.click(labels);
    expect(useAppStore.getState().settings.graphLabels).toBe(true);

    await user.click(screen.getByRole("switch", { name: /Renvois/ }));
    expect(useAppStore.getState().settings.graphEchoes).toBe(false);

    await user.click(screen.getByRole("switch", { name: /Animation du courant/ }));
    expect(useAppStore.getState().settings.graphAnimate).toBe(true);

    // trois sorties, dont deux SVG et un JSON
    expect(screen.getByRole("button", { name: /SVG clair/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /SVG sombre/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /JSON du graphe/ })).toBeTruthy();
  });

  it("refuse de supprimer un vault qui contient des fiches", async () => {
    const user = userEvent.setup();
    const before = useContentStore.getState().vaults.length;
    open("/spaces/p-these");
    await user.click(
      screen.getByRole("button", { name: "Supprimer le vault Économie" }),
    );
    expect(screen.getAllByText(/ne peut pas être supprimé/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    const state = useContentStore.getState();
    expect(state.vaults.length).toBe(before);
    expect(state.vaults.some((vault) => vault.id === "v-eco")).toBe(true);
    expect(document.querySelector(".toast")).toBeTruthy();
  });

  it("ouvre un projet depuis Espaces, avec ses vaults et ses notes", async () => {
    const user = userEvent.setup();
    open("/spaces");
    await user.click(screen.getByRole("button", { name: "Ouvrir le projet Thèse" }));
    await waitFor(() => expect(window.location.pathname).toBe("/spaces/p-these"));
    expect(screen.getByRole("heading", { name: "Thèse" })).toBeTruthy();
    // les notes du projet, et seulement elles
    expect(screen.getByText("Plan du chapitre 3")).toBeTruthy();
    expect(screen.queryByText("Contrats commerciaux")).toBeNull();
    // les vaults rattachés au projet
    expect(screen.getByRole("button", { name: /Ouvrir le vault Économie/ })).toBeTruthy();
  });

  it("redirige les anciennes adresses vers Espaces", async () => {
    open("/projects");
    await waitFor(() => expect(window.location.pathname).toBe("/spaces"));
    cleanup();
    open("/vaults");
    await waitFor(() => expect(window.location.pathname).toBe("/spaces"));
    cleanup();
    open("/projects/p-these");
    await waitFor(() => expect(window.location.pathname).toBe("/spaces/p-these"));
  });

  it("applique un fond « verre » et une signature", async () => {
    const user = userEvent.setup();
    open("/settings/appearance");
    await expand(user, "Fond");

    await user.click(screen.getByRole("button", { name: /^Fond Aurore \(/ }));
    expect(document.documentElement.dataset.wall).toBe("aurore");
    expect(document.querySelector("[data-wall-layer]")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Aucun/ }));
    expect(document.documentElement.dataset.wall).toBe("none");

    await user.click(screen.getByRole("button", { name: /^Verre clair/ }));
    expect(document.documentElement.dataset.wall).toBe("quartz-rose");
    expect(document.documentElement.dataset.radius).toBe("soft");
  });

  it("applique les palettes extrêmes et douces", async () => {
    const user = userEvent.setup();
    open("/settings/appearance");
    await expand(user, "Palette");
    await user.click(screen.getByLabelText(/Thème Noir absolu/));
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#000000"),
    );
    await user.click(screen.getByLabelText(/Thème Blanc absolu/));
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#FFFFFF"),
    );
    await user.click(screen.getByLabelText(/Thème Rose poudré/));
    await waitFor(() =>
      expect(document.documentElement.dataset.palette).toBe("rose-poudre"),
    );
  });

  it("retombe proprement sur une adresse inconnue", () => {
    open("/adresse-inconnue");
    expect(screen.getByText("Page introuvable")).toBeTruthy();
  });
});
