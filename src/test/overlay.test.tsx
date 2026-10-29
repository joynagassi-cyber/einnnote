import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { Overlay } from "@/components/Overlay";
import { Sheet } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { DEFAULT_SETTINGS, useAppStore } from "@/stores/useAppStore";

/**
 * La couche flottante.
 *
 * Ce qui est verrouillé ici est ce qui a cassé en vrai : une fenêtre rendue
 * **dans la page** au lieu du portail, et une feuille de téléphone qui ne
 * s’affiche pas sur le web. Les tests portent donc sur le **lieu** du rendu
 * (enfant de `body`, pas de la page), sur le choix de la forme (fenêtre ≥ 1024,
 * feuille en dessous), et sur ce qui fait qu’une fenêtre reste utilisable :
 * Échap, clic sur le voile, focus piégé, déplacement.
 */

/* jsdom n’implémente pas PointerEvent : les événements souris suffisent pour
   tester le déplacement, la géométrie importe peu. */
if (!(window as unknown as { PointerEvent?: unknown }).PointerEvent) {
  (window as unknown as { PointerEvent: unknown }).PointerEvent = window.MouseEvent;
}

function stubWidth(wide: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches:
      wide &&
      (query.includes("min-width: 1024px") || query.includes("min-width: 768px")),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useContentStore.persist.clearStorage();
  document.getElementById("overlay-root")?.remove();
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
});

describe("le lieu du rendu", () => {
  it("rend la fenêtre hors de la page, dans le portail du body", () => {
    const page = document.createElement("div");
    page.id = "page-test";
    document.body.appendChild(page);

    render(
      <div>
        <Sheet open onClose={() => undefined} title="Nouveau coffre">
          <p>Contenu</p>
        </Sheet>
      </div>,
    );

    const dialog = screen.getByRole("dialog");
    // la page ne contient pas le dialogue : c’est tout le correctif
    expect(page.querySelector('[role="dialog"]')).toBeNull();
    expect(dialog.closest("#overlay-root")).toBeTruthy();
    expect(document.getElementById("overlay-root")?.parentElement).toBe(document.body);
  });

  it("ne rend rien quand c’est fermé", () => {
    render(
      <Sheet open={false} onClose={() => undefined} title="Fermé">
        <p>Contenu</p>
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.getElementById("overlay-root")).toBeNull();
  });
});

describe("deux formes, une API", () => {
  it("ouvre une fenêtre flottante sur bureau, avec sa barre de titre", () => {
    const restore = stubWidth(true);
    try {
      render(
        <Sheet open onClose={() => undefined} title="Modèles de note">
          <p>Contenu</p>
        </Sheet>,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog.getAttribute("data-variant")).toBe("window");
      expect(dialog.className).toContain("overlay-window");

      // une barre qui sert à la fois de titre et de poignée
      const bar = screen.getByRole("group", { name: /Modèles de note — déplacement/ });
      expect(bar.className).toContain("overlay-bar");
      expect(screen.getByRole("button", { name: "Fermer Modèles de note" })).toBeTruthy();
    } finally {
      restore();
    }
  });

  it("ouvre une feuille basse sur téléphone", () => {
    const restore = stubWidth(false);
    try {
      render(
        <Sheet open onClose={() => undefined} title="Modèles de note">
          <p>Contenu</p>
        </Sheet>,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog.getAttribute("data-variant")).toBe("sheet");
      expect(dialog.className).toContain("overlay-sheet");
      // pas de poignée de barre sur une feuille : c’est un trait, pas un titre
      expect(screen.queryByRole("group", { name: /déplacement/ })).toBeNull();
    } finally {
      restore();
    }
  });
});

describe("fermeture", () => {
  it("se ferme avec Échap", async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Fenêtre">
        <p>Contenu</p>
      </Sheet>,
    );
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("se ferme au clic sur le voile, et au bouton", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Sheet open onClose={onClose} title="Fenêtre">
        <p>Contenu</p>
      </Sheet>,
    );

    fireEvent.click(document.querySelector(".overlay-scrim")!);
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole("button", { name: /^Fermer/ })[0]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("fenêtre déplaçable", () => {
  it("se déplace au glissement et se recentre au double-clic", () => {
    const restore = stubWidth(true);
    try {
      render(
        <Sheet open onClose={() => undefined} title="Fenêtre">
          <p>Contenu</p>
        </Sheet>,
      );

      const dialog = screen.getByRole("dialog");
      const bar = screen.getByRole("group", { name: /déplacement/ });

      fireEvent.pointerDown(bar, { clientX: 400, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(bar, { clientX: 460, clientY: 340, pointerId: 1 });
      fireEvent.pointerUp(bar, { clientX: 460, clientY: 340, pointerId: 1 });

      expect(dialog.style.transform).toContain("translate(60px, 40px)");

      fireEvent.doubleClick(bar);
      expect(dialog.style.transform).toContain("translate(0px, 0px)");
    } finally {
      restore();
    }
  });

  it("se déplace aussi au clavier, pour qui ne peut pas glisser", () => {
    const restore = stubWidth(true);
    try {
      render(
        <Sheet open onClose={() => undefined} title="Fenêtre">
          <p>Contenu</p>
        </Sheet>,
      );
      const dialog = screen.getByRole("dialog");
      const bar = screen.getByRole("group", { name: /déplacement/ });

      fireEvent.keyDown(bar, { key: "ArrowRight" });
      fireEvent.keyDown(bar, { key: "ArrowDown", shiftKey: true });

      expect(dialog.style.transform).toContain("translate(16px, 48px)");
    } finally {
      restore();
    }
  });
});

describe("ce qui fait qu’une fenêtre reste utilisable", () => {
  it("verrouille le fond puis le rend à la fermeture", () => {
    const { unmount } = render(
      <Sheet open onClose={() => undefined} title="Fenêtre">
        <p>Contenu</p>
      </Sheet>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.paddingRight).toBe("");
  });

  it("garde le focus à l’intérieur", async () => {
    const restore = stubWidth(true);
    try {
      const user = userEvent.setup();
      render(
        <Sheet open onClose={() => undefined} title="Fenêtre">
          <button type="button">Premier</button>
          <button type="button">Dernier</button>
        </Sheet>,
      );

      // le dernier contrôle ramène au premier élément focusable de la fenêtre :
      // la barre de titre, qui porte le déplacement au clavier
      const first = screen.getByRole("group", { name: /déplacement/ });
      screen.getByRole("button", { name: "Dernier" }).focus();
      await user.tab();
      expect(document.activeElement).toBe(first);
    } finally {
      restore();
    }
  });

  it("donne le focus au dialogue à l’ouverture, pour annoncer son titre", () => {
    render(
      <Sheet open onClose={() => undefined} title="Raccourcis clavier">
        <button type="button">Premier</button>
      </Sheet>,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("dialog", { name: "Raccourcis clavier" }),
    );
  });

  it("porte le titre comme nom accessible du dialogue", () => {
    render(
      <Sheet open onClose={() => undefined} title="Raccourcis clavier">
        <p>Contenu</p>
      </Sheet>,
    );
    expect(screen.getByRole("dialog", { name: "Raccourcis clavier" })).toBeTruthy();
  });
});

/**
 * Contrat CSS : la couche doit rester **au-dessus du rail** et la fenêtre doit
 * vraiment flotter. Un `z-index` régressé à 40 remettrait le voile au niveau du
 * rail, et le défaut reviendrait sans qu’aucun test de rendu ne le voie.
 */
describe("contrat CSS de la couche", () => {
  const css = readFileSync(join(process.cwd(), "src", "index.css"), "utf8");

  it("donne au portail un plan supérieur au rail", () => {
    expect(css).toMatch(/#overlay-root\s*\{[^}]*z-index:\s*60/);
    expect(css).toMatch(/\.overlay-root\s*\{[^}]*position:\s*fixed/);
  });

  it("fait de la fenêtre de bureau un vrai flottant, centré et déplaçable", () => {
    expect(css).toMatch(/\.overlay-window\s*\{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.overlay-window\s*\{[^}]*left:\s*50%/);
    expect(css).toMatch(/\.overlay-bar\s*\{[^}]*cursor:\s*grab/);
  });

  it("garde la feuille basse pour le téléphone, pas pour le bureau", () => {
    expect(css).toMatch(/\.overlay-sheet\s*\{[^}]*bottom:\s*0/);
  });

  it("laisse le toast au-dessus d’une fenêtre ouverte", () => {
    expect(css).toMatch(/\.toast\s*\{\s*z-index:\s*80/);
  });
});

/**
 * Le défaut tel qu’il se produisait : depuis **Espaces**, sur un écran de
 * bureau, la feuille « Nouveau projet » ne s’affichait pas. Ce test ouvre
 * l’application entière et vérifie les deux choses qui manquaient : la fenêtre
 * existe, et elle vit dans le portail — pas dans la page.
 */
describe("dans l’application", () => {
  it("ouvre « Nouveau projet » dans une fenêtre flottante, hors de la page", async () => {
    const restore = stubWidth(true);
    try {
      window.history.pushState({}, "", "/spaces?new=1");
      render(<App />);

      const dialog = await screen.findByRole("dialog");
      expect(dialog.getAttribute("data-variant")).toBe("window");
      expect(dialog.className).toContain("overlay-window");
      expect(dialog.closest("#overlay-root")?.parentElement).toBe(document.body);
      // et le contenu est bien là, pas seulement le cadre
      expect(screen.getByRole("heading", { name: "Nouveau projet" })).toBeTruthy();
    } finally {
      restore();
    }
  });

  it("garde la feuille basse sur téléphone, sans portail dans la page", async () => {
    const restore = stubWidth(false);
    try {
      window.history.pushState({}, "", "/spaces?new=1");
      render(<App />);

      const dialog = await screen.findByRole("dialog");
      expect(dialog.getAttribute("data-variant")).toBe("sheet");
      expect(document.querySelector(".screen [role='dialog']")).toBeNull();
    } finally {
      restore();
    }
  });
});
