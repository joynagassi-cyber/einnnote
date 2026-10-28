import { describe, expect, it } from "vitest";
import {
  LAYERS,
  activeLayers,
  composeAppearance,
  compositionLine,
  layerById,
} from "@/lib/composition";
import { DEFAULT_SETTINGS } from "@/stores/useAppStore";
import type { AppSettings } from "@/types";

/**
 * La composition de l’apparence.
 *
 * Ce qui casse en silence dans un écran de réglages, c’est l’**histoire** qu’il
 * raconte : un thème présenté comme la décision finale, des couches qui se
 * contredisent, une recette qui n’affiche pas ce qui est appliqué. Les tests
 * portent donc sur le récit (l’ordre, le nombre de couches, les valeurs) et sur
 * l’indépendance des couches entre elles.
 */

const base: AppSettings = { ...DEFAULT_SETTINGS };

describe("l’empilement", () => {
  it("décrit cinq couches, dans l’ordre socle → texte", () => {
    expect(LAYERS.map((layer) => layer.id)).toEqual([
      "palette",
      "fond",
      "accent",
      "formes",
      "texte",
    ]);
    expect(LAYERS.map((layer) => layer.index)).toEqual([1, 2, 3, 4, 5]);
  });

  it("attribue à chaque couche une action et des jetons réels", () => {
    for (const layer of LAYERS) {
      expect(layer.label.length, layer.id).toBeGreaterThan(2);
      expect(layer.question.endsWith("."), layer.id).toBe(true);
      expect(layer.tokens.length, layer.id).toBeGreaterThan(0);
      for (const token of layer.tokens) {
        expect(token, layer.id).toMatch(/^--[a-z-]+$/);
      }
      expect(layer.controls, layer.id).toBeGreaterThan(0);
    }
    expect(layerById("formes").action).toBe("geometrie");
    expect(layerById("accent").action).toBe("ecrase");
  });

  it("donne un résumé lisible, même tout par défaut", () => {
    const layers = composeAppearance(base);
    expect(layers).toHaveLength(5);
    expect(layers[0].value).toBeTruthy();
    expect(layers[1].value).toBe("Aucun");
    expect(layers[2].value).toBe("Du thème");
    expect(compositionLine(base)).toContain("Aucun");
    for (const layer of layers) {
      expect(layer.detail.length, layer.id).toBeGreaterThan(0);
    }
  });
});

describe("les couches ne se contredisent pas", () => {
  it("changer les formes ne touche ni la palette, ni l’accent, ni le fond", () => {
    const before = composeAppearance(base);
    const changed = composeAppearance({
      ...base,
      personalization: {
        ...base.personalization!,
        radius: "soft",
        density: "airy",
      },
    });
    expect(changed[3].value).not.toBe(before[3].value);
    for (const index of [0, 1, 2, 4]) {
      expect(changed[index].value, `couche ${changed[index].id}`).toBe(
        before[index].value,
      );
    }
  });

  it("changer le fond ne touche pas aux formes", () => {
    const before = composeAppearance(base);
    const changed = composeAppearance({ ...base, wallpaper: "tokyo" });
    expect(changed[1].active).toBe(true);
    expect(changed[1].value).toBe("Tokyo");
    expect(changed[3].value).toBe(before[3].value);
  });

  it("un fond prend la main sur l’accent, sauf si on le coupe", () => {
    const auto = composeAppearance({ ...base, wallpaper: "tokyo" });
    expect(auto[2].value).toBe("Tiré du fond");
    const manual = composeAppearance({
      ...base,
      wallpaper: "tokyo",
      dynamicAccent: false,
    });
    expect(manual[2].value).toBe("Du thème");
  });

  it("un thème n’est jamais la fin : les autres couches restent actives", () => {
    // un socle, plus un fond, un accent, des formes et un texte
    const full: AppSettings = {
      ...base,
      paletteKey: "nord",
      wallpaper: "montagne",
      personalization: { ...base.personalization!, radius: "sharp" },
      fontSize: 19,
    };
    expect(activeLayers(full)).toBeGreaterThanOrEqual(4);
    expect(composeAppearance(full)[0].active).toBe(true);
    // et l’on peut encore changer les formes après avoir choisi le thème
    const after = composeAppearance({
      ...full,
      personalization: { ...full.personalization!, radius: "soft", density: "compact" },
    });
    expect(after[0].value).toBe("Nord");
    expect(after[3].value).not.toBe(composeAppearance(full)[3].value);
  });

  it("nomme un accent libre et un accent preset", () => {
    const custom = composeAppearance({
      ...base,
      accentMode: "custom",
      customAccent: "#b3261e",
    });
    expect(custom[2].value).toBe("#B3261E");
    const preset = composeAppearance({
      ...base,
      accentMode: "preset",
      accent: "violet",
    });
    expect(preset[2].active).toBe(true);
    expect(preset[2].value.length).toBeGreaterThan(2);
  });
});
