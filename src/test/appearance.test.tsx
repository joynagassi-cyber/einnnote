import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useWallColors } from "@/stores/useWallColors";

/**
 * L’écran d’Apparence se lit de haut en bas : d’abord la composition entière,
 * puis des couches **repliées** qui n’occupent que leur en-tête. Ce fichier
 * vérifie ce contrat-là, parce que c’est celui qui casse en silence : une
 * section qui s’ouvre toute seule pousse l’aperçu hors de l’écran, et l’on ne
 * voit plus rien.
 */

function open(hash = "") {
  window.history.pushState({}, "", `/settings/appearance${hash}`);
  return render(<App />);
}

const LAYERS = ["Palette", "Fond", "Accent", "Formes", "Texte"];

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useContentStore.persist.clearStorage();
  useWallColors.setState({ colors: null, error: null });
});

describe("l’écran s’ouvre sur l’aperçu", () => {
  it("ne rend aucun contrôle tant que les couches sont repliées", () => {
    open();

    expect(screen.getByText("Votre composition")).toBeTruthy();
    expect(screen.getByText(/couches actives/)).toBeTruthy();

    for (const title of LAYERS) {
      const bouton = screen.getByRole("button", { name: `Déplier ${title}` });
      expect(bouton.getAttribute("aria-expanded")).toBe("false");
    }

    // rien de tout ça n’est monté : ni les 23 palettes, ni la galerie
    expect(screen.queryByLabelText(/Thème Mocha/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Fond Aurore \(/ })).toBeNull();
    expect(screen.queryByLabelText("Code hexadécimal")).toBeNull();
  });

  it("montre la valeur de chaque couche même repliée", () => {
    open();

    // la palette par défaut, et l’absence de fond
    const palette = screen.getByRole("button", { name: "Déplier Palette" });
    expect(palette.textContent).toContain("Papier");
    const fond = screen.getByRole("button", { name: "Déplier Fond" });
    expect(fond.textContent).toContain("Aucun");
    // le confort se résume aussi
    const confort = screen.getByRole("button", { name: "Déplier Confort" });
    expect(confort.textContent).toContain("contraste normal");
    expect(confort.textContent).toContain("animations système");
  });

  it("déplie une couche sans ouvrir les autres", async () => {
    const user = userEvent.setup();
    open();

    await user.click(screen.getByRole("button", { name: "Déplier Formes" }));
    expect(
      screen.getByRole("button", { name: "Replier Formes" }).getAttribute(
        "aria-expanded",
      ),
    ).toBe("true");
    expect(screen.getByText(/ne touchent/)).toBeTruthy();

    // les autres sont toujours fermées
    for (const title of ["Palette", "Fond", "Accent", "Texte"]) {
      expect(
        screen.getByRole("button", { name: `Déplier ${title}` }),
      ).toBeTruthy();
    }
  });

  it("replie tout d’un geste depuis la barre de recette", async () => {
    const user = userEvent.setup();
    open();

    await user.click(screen.getByRole("button", { name: "Déplier Palette" }));
    await user.click(screen.getByRole("button", { name: "Déplier Accent" }));
    expect(
      screen.getByRole("button", { name: "Tout replier" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Tout replier" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Tout replier" })).toBeNull();
    });
    expect(screen.getByRole("button", { name: "Déplier Palette" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Déplier Accent" })).toBeTruthy();
  });

  it("ouvre la couche visée par le sommaire", async () => {
    const user = userEvent.setup();
    open();

    const chip = screen.getByRole("link", { name: "3. Accent" });
    await user.click(chip);
    expect(
      await screen.findByRole("button", { name: "Replier Accent" }),
    ).toBeTruthy();
  });

  it("ouvre la couche visée par un lien direct", async () => {
    open("#couche-texte");

    expect(
      await screen.findByRole("button", { name: "Replier Texte" }),
    ).toBeTruthy();
  });

  it("garde la composition lisible quand une couche est ouverte", async () => {
    const user = userEvent.setup();
    open();

    // avant : la recette est dans la barre collante, au-dessus des sections
    const barre = screen.getByRole("navigation", {
      name: "Couches de l’apparence",
    });
    expect(barre).toBeTruthy();
    expect(screen.getAllByText(/papier uni/i).length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button", { name: "Déplier Fond" }));

    // après : la barre est toujours là, et « Tout replier » ramène à l’aperçu
    expect(screen.getAllByText(/papier uni/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Tout replier" })).toBeTruthy();
  });
});
