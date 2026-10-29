import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { BackgroundVariant } from "@xyflow/react";
import { nodeSize } from "@/components/canvas/flowData";
import { canvasVariant } from "@/lib/graph/background";

/**
 * Le canevas — les gestes du tour 39.
 *
 * Trois d’entre eux étaient cassés ou absents, et ce sont ceux qu’on vérifie
 * ici : la barre flottante qui **pose** une forme libre, la poignée `+` qui
 * **relie**, et l’habillage qui reste optionnel (donc recolorié par le thème).
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useContentStore.persist.clearStorage();
  useAppStore.setState({ activeProjectId: null });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
  useContentStore.setState({ ...demoContent });
});

const boardId = "m-systeme";

describe("Canevas — les formes", () => {
  it("pose une forme libre depuis la barre flottante, sans la relier", async () => {
    const user = userEvent.setup();
    open(`/mindmap/${boardId}`);

    const before = useContentStore.getState().mindmaps.find((m) => m.id === boardId);
    expect(before).toBeTruthy();
    const nodes = before!.nodes.length;
    const edges = before!.edges.length;

    /* La barre démarre repliée : on déplie d’un chevron, puis on pose.
       Rien n’est sélectionné : « Cercle » doit **créer**, pas mémoriser une
       préférence. C’est exactement le bug d’origine. */
    await user.click(
      await screen.findByRole("button", { name: "Déplier les outils du canevas" }),
    );
    await user.click(screen.getByRole("button", { name: "Cercle" }));

    const after = useContentStore.getState().mindmaps.find((m) => m.id === boardId)!;
    expect(after.nodes.length).toBe(nodes + 1);
    expect(after.edges.length).toBe(edges);
    const created = after.nodes[after.nodes.length - 1];
    expect(created.shape).toBe("circle");
    // une forme libre n’a pas de parent, donc aucun trait
    expect(created.parentId).toBeUndefined();
  });

  it("relie par la poignée + d’une forme, du côté touché", async () => {
    const store = useContentStore.getState();
    const before = store.mindmaps.find((m) => m.id === boardId)!;
    const root = before.nodes.find((node) => !node.parentId)!;

    const created = store.addMindNode(boardId, root.id, "rect", "left");
    const after = useContentStore.getState().mindmaps.find((m) => m.id === boardId)!;
    const node = after.nodes.find((n) => n.id === created)!;

    expect(node.parentId).toBe(root.id);
    expect(node.x).toBeLessThan(root.x);
    expect(after.edges.some((e) => e.source === root.id && e.target === created)).toBe(true);
  });

  it("laisse l’habillage vide par défaut : la forme suit le thème", async () => {
    const store = useContentStore.getState();
    const map = store.mindmaps.find((m) => m.id === boardId)!;
    const root = map.nodes.find((node) => !node.parentId)!;

    const created = store.addMindNodeAt(boardId, { x: 40, y: 40, shape: "hex" });
    const node = useContentStore
      .getState()
      .mindmaps.find((m) => m.id === boardId)!
      .nodes.find((n) => n.id === created)!;
    expect(node.paint).toBeUndefined();

    store.updateMindNode(boardId, root.id, { paint: { fill: "var(--ink)" } });
    const painted = useContentStore
      .getState()
      .mindmaps.find((m) => m.id === boardId)!
      .nodes.find((n) => n.id === root.id)!;
    expect(painted.paint?.fill).toBe("var(--ink)");
  });

  it("habille un trait : couleur, épaisseur, pointillé, pointe", async () => {
    const store = useContentStore.getState();
    const map = store.mindmaps.find((m) => m.id === boardId)!;
    const edge = map.edges[0];
    store.updateMindEdge(boardId, edge.id, {
      paint: { color: "var(--danger)", width: 4, dashed: true, arrow: "diamond" },
    });
    const after = useContentStore
      .getState()
      .mindmaps.find((m) => m.id === boardId)!
      .edges.find((e) => e.id === edge.id)!;
    expect(after.paint).toEqual({
      color: "var(--danger)",
      width: 4,
      dashed: true,
      arrow: "diamond",
    });
  });

  it("replie la barre flottante sans perdre les outils", async () => {
    const user = userEvent.setup();
    open(`/mindmap/${boardId}`);

    /* Replié au départ : la poignée seule, aucun outil dans l’arbre
       d’accessibilité. */
    expect(screen.queryByRole("button", { name: "Cercle" })).toBeNull();

    const deploy = await screen.findByRole("button", {
      name: "Déplier les outils du canevas",
    });
    await user.click(deploy);
    expect(screen.getByRole("button", { name: "Cercle" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Replier les outils du canevas" }));
    expect(screen.queryByRole("button", { name: "Cercle" })).toBeNull();
  });
});

/** Simule une fenêtre **large** (≥ 1180 px) le temps d’un test. */
function withWide<T>(run: () => Promise<T> | T): Promise<T> {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches:
      query.includes("min-width: 1180px") ||
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
  return Promise.resolve()
    .then(run)
    .finally(() => {
      window.matchMedia = original;
    });
}

describe("Tableau blanc", () => {
  it("naît avec du texte et une planche, et montre les deux", async () => {
    const note = useContentStore.getState().createNote("whiteboard", {
      title: "Tableau blanc d’essai",
    });

    expect(note.blocks.length).toBeGreaterThan(0);
    expect(note.mindmapId).toBeTruthy();
    const map = useContentStore
      .getState()
      .mindmaps.find((m) => m.id === note.mindmapId);
    expect(map?.nodes.length).toBeGreaterThan(0);

    open(`/note/${note.id}`);
    const group = await screen.findByRole("group", { name: "Vue du tableau blanc" });
    expect(within(group).getByRole("button", { name: "Texte" })).toBeTruthy();
    expect(within(group).getByRole("button", { name: "Planche" })).toBeTruthy();
  });

  it("passe du texte à la planche sans quitter la note", async () => {
    const user = userEvent.setup();
    const note = useContentStore.getState().createNote("whiteboard", {
      title: "Passage texte-planche",
    });
    open(`/note/${note.id}`);

    const group = await screen.findByRole("group", { name: "Vue du tableau blanc" });
    await user.click(within(group).getByRole("button", { name: "Planche" }));

    await waitFor(() =>
      expect(
        screen.getByLabelText(/Planche de la note/),
      ).toBeTruthy(),
    );
    /* On n’a pas quitté la note : la bascule est toujours là, le côté des
       questions reste à portée, et la barre d’édition s’efface puisque le texte
       n’est plus affiché. */
    expect(screen.getByRole("group", { name: "Vue du tableau blanc" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /panneau des questions/ }),
    ).toBeTruthy();
    expect(screen.queryByRole("toolbar", { name: "Mise en forme" })).toBeNull();
  });

  it("n’ouvre « Les deux » que si le texte garde sa place, et retire alors le côté", async () => {
    await withWide(async () => {
      const user = userEvent.setup();
      const note = useContentStore.getState().createNote("whiteboard", {
        title: "Deux vues côte à côte",
      });
      open(`/note/${note.id}`);

      const group = await screen.findByRole("group", { name: "Vue du tableau blanc" });
      const both = within(group).getByRole("button", { name: "Les deux" });

      /* En fenêtre large, la note s’ouvre déjà sur les deux vues — et la
         planche **est** le côté : le panneau des questions se retire, sinon
         trois colonnes se partageraient la fenêtre. */
      await waitFor(() =>
        expect(screen.getByLabelText(/Planche de la note/)).toBeTruthy(),
      );
      expect(
        screen.queryByRole("complementary", { name: "Questions de la note" }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: /panneau des questions/ }),
      ).toBeNull();
      // la barre d’édition reste : le texte est toujours affiché
      expect(screen.getByRole("toolbar", { name: "Mise en forme" })).toBeTruthy();

      await user.click(within(group).getByRole("button", { name: "Texte" }));
      await waitFor(() =>
        expect(
          screen.getByRole("complementary", { name: "Questions de la note" }),
        ).toBeTruthy(),
      );

      await user.click(both);
      await waitFor(() =>
        expect(
          screen.queryByRole("complementary", { name: "Questions de la note" }),
        ).toBeNull(),
      );
    });
  });
});

describe("Carte vierge", () => {
  it("vide la carte puis pose les formes une à une", async () => {
    const user = userEvent.setup();
    open(`/mindmap/${boardId}`);

    await user.click(await screen.findByRole("button", { name: "Modèles de carte" }));
    await user.click(
      await screen.findByRole("button", { name: /Partir d’une carte vierge/ }),
    );

    const empty = useContentStore.getState().mindmaps.find((m) => m.id === boardId)!;
    expect(empty.nodes).toHaveLength(0);
    expect(empty.edges).toHaveLength(0);

    // la barre reste le seul moyen de commencer — et elle commence
    await user.click(
      await screen.findByRole("button", { name: "Déplier les outils du canevas" }),
    );
    await user.click(screen.getByRole("button", { name: "Rectangle" }));
    const after = useContentStore.getState().mindmaps.find((m) => m.id === boardId)!;
    expect(after.nodes).toHaveLength(1);
    expect(after.edges).toHaveLength(0);
  });
});

describe("Redimensionner une forme", () => {
  it("écrit la taille choisie, et l’accroche des traits la suit", () => {
    const store = useContentStore.getState();
    const map = store.mindmaps.find((m) => m.id === boardId)!;
    const node = map.nodes[0];

    store.updateMindNode(boardId, node.id, { w: 220, h: 140 });
    const after = useContentStore
      .getState()
      .mindmaps.find((m) => m.id === boardId)!
      .nodes.find((n) => n.id === node.id)!;
    expect(after.w).toBe(220);
    expect(after.h).toBe(140);

    /* `nodeSize` est la seule source de vérité : le dessin **et** le point
       d’accroche des traits passent par elle. Deux calculs différents
       donneraient des flèches qui s’arrêtent à côté du bord. */
    expect(nodeSize("rect", 1, after)).toEqual({ w: 220, h: 140 });
    // bornes : jamais plus petit que lisible, jamais plus grand que l’écran
    expect(nodeSize("rect", 1, { w: 4, h: 2 })).toEqual({ w: 64, h: 36 });
    expect(nodeSize("rect", 1, { w: 9999, h: 9999 })).toEqual({ w: 520, h: 360 });
  });
});

describe("Fond du canevas", () => {
  it("ne peint qu’une seule grille : la page n’a plus de motif CSS", async () => {
    open(`/mindmap/${boardId}`);
    await screen.findByLabelText(/Carte mentale/);
    /* La page ne peint plus rien : c’est `<Background>` qui dessine la
       grille, donc elle suit le déplacement. Deux couches = deux vitesses,
       le « double pointillé » qu’on voyait en bougeant. */
    const page = document.querySelector(".screen-canvas");
    expect(page?.getAttribute("data-canvas")).toBe("blank");
  });

  it("suit le réglage « Fond du canevas »", () => {
    expect(canvasVariant("dots")).toBe(BackgroundVariant.Dots);
    expect(canvasVariant("ruled")).toBe(BackgroundVariant.Lines);
    expect(canvasVariant("grid")).toBe(BackgroundVariant.Cross);
    expect(canvasVariant("blank")).toBeNull();
  });
});

describe("Le geste de redimensionnement", () => {
  it("tire un coin et écrit la nouvelle taille", async () => {
    const user = userEvent.setup();
    open(`/mindmap/${boardId}`);
    await waitFor(() =>
      expect(screen.getAllByText("Système nerveux").length).toBeGreaterThan(0),
    );

    /* On pose une forme libre : elle est sélectionnée d’office, donc ses quatre
       coins sont là. (Sélectionner un nœud existant demanderait un vrai clic
       dans React Flow, que jsdom ne sait pas simuler.) */
    await user.click(
      await screen.findByRole("button", { name: "Déplier les outils du canevas" }),
    );
    await user.click(screen.getByRole("button", { name: "Pilule" }));

    const created = useContentStore
      .getState()
      .mindmaps.find((m) => m.id === boardId)!
      .nodes.at(-1)!;

    /* jsdom ne fait pas de mise en page : React Flow croit la forme hors champ
       et la marque `visibility: hidden`. Les requêtes par rôle l’écartent donc ;
       on vise la poignée par son libellé, qui est bien dans le document. */
    const corner = await screen.findByLabelText(
      "Redimensionner la forme, coin bas droit",
    );

    fireEvent.pointerDown(corner, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(corner, { clientX: 164, clientY: 132, pointerId: 1 });
    fireEvent.pointerUp(corner, { clientX: 164, clientY: 132, pointerId: 1 });

    await waitFor(() => {
      const after = useContentStore
        .getState()
        .mindmaps.find((m) => m.id === boardId)!
        .nodes.find((n) => n.id === created.id)!;
      /* Le zoom vaut 1 sous jsdom : +64 et +32 pixels d’écran deviennent +64
         et +32 de canevas. Une pilule libre part de 148 × 48. */
      expect(after.w).toBe(148 + 64);
      expect(after.h).toBe(48 + 32);
      // le coin haut gauche ne bouge pas : x et y restent
      expect(after.x).toBe(created.x);
      expect(after.y).toBe(created.y);
    });
  });

  it("écrit la taille au pas de 16 px, et sait revenir à la naturelle", async () => {
    const user = userEvent.setup();
    open(`/mindmap/${boardId}`);
    await waitFor(() =>
      expect(screen.getAllByText("Système nerveux").length).toBeGreaterThan(0),
    );
    await user.click(
      await screen.findByRole("button", { name: "Déplier les outils du canevas" }),
    );
    await user.click(screen.getByRole("button", { name: "Pilule" }));
    const created = useContentStore
      .getState()
      .mindmaps.find((m) => m.id === boardId)!
      .nodes.at(-1)!;

    await user.click(screen.getByRole("button", { name: "Augmenter la largeur" }));
    await waitFor(() => {
      const after = useContentStore
        .getState()
        .mindmaps.find((m) => m.id === boardId)!
        .nodes.find((n) => n.id === created.id)!;
      expect(after.w).toBe(148 + 16);
    });

    await user.click(screen.getByRole("button", { name: "Taille naturelle" }));
    await waitFor(() => {
      const after = useContentStore
        .getState()
        .mindmaps.find((m) => m.id === boardId)!
        .nodes.find((n) => n.id === created.id)!;
      expect(after.w).toBeUndefined();
      expect(after.h).toBeUndefined();
    });
  });
});
