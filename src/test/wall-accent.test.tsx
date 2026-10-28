import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "@/App";
import {
  applySettingsToDom,
  DEFAULT_SETTINGS,
  useAppStore,
} from "@/stores/useAppStore";
import { useWallColors } from "@/stores/useWallColors";
import { contrast, type WallColors } from "@/lib/palette";
import { tokensFor } from "@/lib/themes";

/**
 * L’accent tiré du fond, du magasin au document.
 *
 * On ne teste pas le canvas : jsdom n’en a pas, et un faux canvas ne prouverait
 * rien sur les pixels. Ce qui compte ici, c’est le **câblage** — les couleurs
 * lues arrivent-elles réellement dans `--primary`, `--ring`, `--accent`,
 * `--tint` et `--on-accent` ? — et le **contrat CSS** (fondu, recette de
 * carte), qui peut disparaître d’une refonte sans qu’aucun écran ne s’en
 * aperçoive.
 */

const COLORS: WallColors = {
  accent: "#1F6FEB",
  accentSoft: "#DCE8FB",
  accentInk: "#12459B",
  secondary: "#E8933A",
  deep: "#131A24",
  tone: "#8FA3BF",
  onAccent: "#FFFFFF",
  contrast: 5.2,
  onAccentContrast: 5.2,
  confidence: 0.42,
};

const root = () => document.documentElement;

function paint(wallpaper: string | null, extra: Partial<typeof DEFAULT_SETTINGS> = {}) {
  const settings = { ...DEFAULT_SETTINGS, wallpaper, ...extra };
  useAppStore.setState({ settings });
  applySettingsToDom(settings);
}

beforeEach(() => {
  cleanup();
  useWallColors.getState().reset();
  root().removeAttribute("style");
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
});

describe("accent tiré du fond", () => {
  it("écrit les jetons shadcn et le voile depuis les couleurs lues", () => {
    useWallColors.getState().set("k", COLORS);
    paint("aube-glacee", { paletteKey: "nord" });

    expect(root().style.getPropertyValue("--primary")).toBe(COLORS.accent);
    expect(root().style.getPropertyValue("--ring")).toBe(COLORS.accent);
    expect(root().style.getPropertyValue("--accent")).toBe(COLORS.accent);
    expect(root().style.getPropertyValue("--accent-2")).toBe(COLORS.secondary);
    expect(root().style.getPropertyValue("--tint")).toBe(COLORS.deep);
    expect(root().style.getPropertyValue("--on-accent")).toBe(COLORS.onAccent);
    // le texte des boutons est un choix, pas un hasard
    expect(["#FFFFFF", "#000000"]).toContain(COLORS.onAccent);
    expect(contrast(COLORS.accent, COLORS.onAccent)).toBeGreaterThanOrEqual(4.5);
  });

  it("suit le mode pour le voile : sombre sur sombre, couleur sur clair", () => {
    useWallColors.getState().set("k", COLORS);
    paint("aube-glacee", { paletteKey: "nord" });
    expect(root().style.getPropertyValue("--tint")).toBe(COLORS.deep);

    paint("jardin-fleurs", { paletteKey: "rose-poudre" });
    // palette claire : le voile prend la couleur moyenne, pas la teinte sombre
    expect(root().style.getPropertyValue("--tint")).toBe(COLORS.tone);
  });

  it("garde un voile coloré même avant la lecture de l’image", () => {
    paint("foret-brume", { paletteKey: "papier-nuit" });
    const tint = root().style.getPropertyValue("--tint");
    expect(tint).toMatch(/^#[0-9A-Fa-f]{6}$/);
    // ce n’est pas le noir générique : c’est la teinte du fond
    expect(tint.toUpperCase()).not.toBe("#22201C");
  });

  it("rend la main au thème quand l’interrupteur est coupé", () => {
    useWallColors.getState().set("k", COLORS);
    paint("foret-brume", { paletteKey: "papier-nuit", dynamicAccent: false });

    const theme = tokensFor("papier-nuit");
    expect(root().style.getPropertyValue("--primary")).not.toBe(COLORS.accent);
    expect(root().style.getPropertyValue("--accent")).toBe(theme.accent);
    // le voile, lui, garde la teinte de l’image : les cartes restent teintées
    expect(root().style.getPropertyValue("--tint")).not.toBe("");
  });

  it("n’applique rien quand il n’y a pas de fond", () => {
    useWallColors.getState().set("k", COLORS);
    paint(null);
    const theme = tokensFor(DEFAULT_SETTINGS.paletteKey);
    expect(root().style.getPropertyValue("--accent")).toBe(theme.accent);
    expect(root().style.getPropertyValue("--tint")).toBe("#22201C");
  });
});

describe("écran Apparence", () => {
  it("montre les trois couleurs lues, leurs ratios et l’interrupteur", async () => {
    useWallColors.getState().set("k", COLORS);
    useAppStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        wallpaper: "ville-nuit",
        paletteKey: "tokyo-night",
      },
    });
    window.history.pushState({}, "", "/settings/appearance");
    /* `App` porte déjà son routeur : on ne l’enveloppe pas, sinon React Router
       refuse (deux routeurs). On règle l’adresse, puis on rend. */
    render(<App />);

    expect(await screen.findByText("Accent du fond")).toBeTruthy();
    const toggle = screen.getByRole("switch", { name: "Accent tiré du fond" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(COLORS.accent.toUpperCase())).toBeTruthy();
    expect(screen.getByText(COLORS.secondary.toUpperCase())).toBeTruthy();
    // deux ratios mesurés (accent, texte des boutons) — tous deux à 5,20 ici
    expect(screen.getAllByText(/5\.20:1/).length).toBeGreaterThanOrEqual(2);
  });
});

describe("contrat CSS", () => {
  const css = readFileSync(join(process.cwd(), "src", "index.css"), "utf8");

  it("déclare les couleurs comme animables, avec un fondu de 0,8 s", () => {
    for (const name of ["--primary", "--ring", "--accent", "--tint", "--on-accent"]) {
      const block = new RegExp(`@property ${name} \\{[^}]*syntax: "<color>"`).test(css);
      expect(block, name).toBe(true);
    }
    expect(css).toMatch(/transition:[^;]*--primary 800ms/);
    // et le fondu s’éteint quand le mouvement est réduit
    expect(css).toMatch(/\[data-motion="reduced"\]\s*\{\s*transition: none;/);
  });

  it("applique la recette de carte demandée", () => {
    /* Les deux utilitaires demandés, écrits **une seule fois** : la carte
       translucide (`bg-card/40`) et le flou (`backdrop-blur-2xl`), puis le
       voile teinté. Vérifié aussi à la compilation : `bg-card/40` produit bien
       `color-mix(in srgb, var(--card) calc(.4 * 100%), transparent)` — sans le
       `<alpha-value>` du `tailwind.config.ts`, la classe disparaissait. */
    expect(css).toContain("@apply bg-card/40 backdrop-blur-2xl");
    expect(css).toContain("color-mix(in srgb, var(--tint) 22%, transparent)");
    const config = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf8");
    expect(config).toContain("calc(<alpha-value> * 100%)");
  });

  it("n’écrit plus de triplet HSL pour les jetons shadcn", () => {
    // un triplet ne peut ni s’animer ni se mélanger : la régression est silencieuse
    expect(css).not.toMatch(/--primary:\s*\d+ \d+% \d+%/);
    expect(css).not.toMatch(/--card:\s*\d+ \d+% \d+%/);
  });
});
