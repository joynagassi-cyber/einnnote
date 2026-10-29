import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { DEFAULT_SETTINGS, useAppStore } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";
import { useSessionStore } from "@/stores/useSessionStore";

/**
 * **Le papier de la note, et le canevas — deux choses séparées.**
 *
 * La note n’a que deux fonds : uni (qui suit le thème, clair ou sombre) et
 * ligné. Les pointillés et le quadrillage appartiennent aux cartes mentales et
 * aux graphes : derrière une page de texte, un motif ne guide pas la lecture,
 * il la brouille.
 *
 * Ces tests tiennent la séparation : si un jour le canevas revient sur la note,
 * ils tombent.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

const screenEditor = () => document.querySelector(".screen-editor");

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS, activeProjectId: null });
  useContentStore.persist.clearStorage();
  useContentStore.setState({ ...demoContent });
  useDisplayStore.getState().resetAll();
  useSessionStore.getState().resetSession();
});

describe("fond de la note", () => {
  it("n’emprunte jamais le fond du canevas", () => {
    open("/note/n-plan");
    const editor = screenEditor();
    expect(editor?.getAttribute("data-sheet")).toBe("plain");
    expect(editor?.hasAttribute("data-canvas")).toBe(false);
  });

  it("passe en ligné quand on le demande, sans toucher au canevas", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");
    await user.click(screen.getByRole("button", { name: "Plus d’options de mise en forme" }));
    await user.click(await screen.findByRole("menuitem", { name: /Papier de la note/ }));

    await waitFor(() =>
      expect(screenEditor()?.getAttribute("data-sheet")).toBe("ruled"),
    );
    expect(useAppStore.getState().settings.canvas).toBe(DEFAULT_SETTINGS.canvas);
  });

  it("suit le thème : uni reste uni en sombre", () => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, theme: "dark", notePaper: "plain" },
    });
    open("/note/n-plan");
    expect(screenEditor()?.getAttribute("data-sheet")).toBe("plain");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("le canevas garde ses motifs, pour les cartes et les graphes", () => {
    open("/vault/v-superposition/graph");
    const canvas = document.querySelector("[data-canvas]");
    /* Le graphe porte bien un motif : c’est là que le pointillé sert. */
    expect(canvas?.getAttribute("data-canvas")).toBe("dots");
  });
});
