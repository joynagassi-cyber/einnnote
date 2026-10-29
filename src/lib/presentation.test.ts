import { describe, expect, it } from "vitest";
import {
  CONTROL_IDS,
  PRESENTATION,
  effectOf,
  formatValue,
  presentTokens,
  presentationAttributes,
  presentationVars,
  tintTokens,
} from "@/lib/presentation";
import { tokensFor } from "@/lib/themes";
import { DEFAULT_PERSONALIZATION } from "@/stores/useAppStore";
import type { Personalization } from "@/types";

/**
 * Un réglage qui ne change rien est un mensonge.
 *
 * Ces tests servent à deux choses : empêcher qu'un contrôle décoratif entre
 * dans l'écran (chaque identifiant doit produire un attribut ou une variable),
 * et vérifier que la teinte du papier **déplace réellement** les jetons de la
 * palette — c'était le bug : `[data-paper]` en CSS était écrasé par les jetons
 * posés en style en ligne, donc le réglage ne faisait rien.
 */

const ui: Personalization = { ...DEFAULT_PERSONALIZATION };

describe("registre", () => {
  it("décrit chaque réglage une seule fois", () => {
    expect(new Set(CONTROL_IDS).size).toBe(CONTROL_IDS.length);
    expect(CONTROL_IDS.sort()).toEqual(
      Object.keys(DEFAULT_PERSONALIZATION).sort() as typeof CONTROL_IDS,
    );
  });

  it("donne à chaque contrôle un effet réel", () => {
    for (const id of CONTROL_IDS) {
      expect(effectOf(id, ui)).toBeDefined();
      expect(String(effectOf(id, ui))).not.toBe("");
    }
  });

  it("borne les curseurs dans la plage des valeurs par défaut", () => {
    for (const section of PRESENTATION) {
      for (const control of section.controls) {
        if (control.kind !== "slider") continue;
        const value = DEFAULT_PERSONALIZATION[control.id] as number;
        expect(control.min).toBeLessThanOrEqual(value);
        expect(control.max).toBeGreaterThanOrEqual(value);
      }
    }
  });

  it("écrit les valeurs en clair", () => {
    const density = PRESENTATION[0].controls[0];
    expect(density.kind).toBe("choice");
    expect(formatValue(density, "airy")).toBe("Aérée");

    const leading = PRESENTATION[2].controls[0];
    expect(leading.kind).toBe("slider");
    expect(formatValue(leading, 32)).toBe("32 px");
  });
});

describe("teinte du papier", () => {
  const tokens = tokensFor("sand");

  it("ne touche à rien en sable", () => {
    expect(tintTokens(tokens, "sand")).toEqual(tokens);
  });

  it("déplace le fond, pas l’encre", () => {
    const warm = tintTokens(tokens, "ivory");
    expect(warm.bg).not.toBe(tokens.bg);
    expect(warm.ink).toBe(tokens.ink);
    // les traits suivent, mais restent plus proches de leur valeur d’origine
    expect(warm.line).not.toBe(tokens.line);
  });

  it("produit une teinte distincte par valeur", () => {
    const bgs = (["sand", "ivory", "grey", "mist"] as const).map(
      (paper) => tintTokens(tokens, paper).bg,
    );
    expect(new Set(bgs).size).toBe(4);
  });

  it("fonctionne aussi sur un thème sombre, avec un mélange plus doux", () => {
    const dark = tokensFor("papier-nuit");
    expect(dark.mode).toBe("dark");
    const tinted = tintTokens(dark, "ivory");
    expect(tinted.bg).not.toBe(dark.bg);
    // même direction, poids réduit : le contraste ne doit pas s'effondrer
    expect(tinted.ink).toBe(dark.ink);
  });
});

describe("application", () => {
  it("traduit les réglages en attributs et variables", () => {
    const attrs = presentationAttributes({ ...ui, density: "compact", radius: "soft" });
    expect(attrs).toMatchObject({ density: "compact", radius: "soft", paper: "sand" });

    const vars = presentationVars({ ...ui, noteLeading: 30, readingWidth: 680 });
    expect(vars["--note-leading"]).toBe("30px");
    expect(vars["--reading-width"]).toBe("680px");
    expect(vars["--canvas-strength"]).toBe("1");
  });

  it("combine papier et traits sans perdre l’accent", () => {
    const tokens = tokensFor("sand");
    const out = presentTokens(tokens, { ...ui, paper: "mist", borders: "strong" });
    expect(out.accent).toBe(tokens.accent);
    expect(out.line).toBe(tokens.lineStrong);
  });
});
