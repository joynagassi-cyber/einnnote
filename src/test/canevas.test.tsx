import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";

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

    /* Rien n’est sélectionné : « Cercle » doit **créer**, pas mémoriser une
       préférence. C’est exactement le bug d’origine. */
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

    const toggle = await screen.findByRole("button", {
      name: "Replier les outils du canevas",
    });
    await user.click(toggle);
    expect(screen.queryByRole("button", { name: "Cercle" })).toBeNull();
    const deploy = screen.getByRole("button", { name: "Déplier les outils du canevas" });
    await user.click(deploy);
    expect(screen.getByRole("button", { name: "Cercle" })).toBeTruthy();
  });
});

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
    await user.click(screen.getByRole("button", { name: "Rectangle" }));
    const after = useContentStore.getState().mindmaps.find((m) => m.id === boardId)!;
    expect(after.nodes).toHaveLength(1);
    expect(after.edges).toHaveLength(0);
  });
});
