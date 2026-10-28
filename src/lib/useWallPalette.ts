import { useEffect } from "react";
import { extractColors, type WallColors } from "@/lib/palette";
import { applySettingsToDom, effectiveMode, useAppStore } from "@/stores/useAppStore";
import { useWallColors, wallColorKey } from "@/stores/useWallColors";
import { tokensFor } from "@/lib/themes";
import { wallById, wallUrl } from "@/lib/walls";

/**
 * Lit l’image de fond et en tire les couleurs de l’interface.
 *
 * ### Pourquoi 48 × 48
 *
 * Un fond plein écran fait 1280 px de large ; l’accent n’a pas besoin de cette
 * précision. 48 × 48 = **2 304 pixels**, soit environ 1 ms de lecture et un
 * échantillonnage suffisant pour que chaque région de l’image (ciel, eau,
 * forêt) pèse proportionnellement. Une vignette de 16 × 16 perdait les teintes
 * minoritaires — un coucher de soleil sur une forêt devenait « vert ».
 *
 * ### Ce que fait le hook, et ce qu’il ne fait pas
 *
 * - il **lit** (`<img>` + canvas) et **publie** le résultat dans
 *   `useWallColors` ;
 * - il ne peint rien lui-même : `applySettingsToDom` reste la seule porte
 *   d’écriture du document, donc aucune couleur ne peut être posée deux fois ;
 * - si l’image ne se charge pas (hors ligne, format refusé), il le dit dans le
 *   magasin et l’interface garde le voile de repli — jamais d’écran incolore.
 */
export function useWallPalette(): void {
  const settings = useAppStore((s) => s.settings);
  const tokens = tokensFor(settings.paletteKey);
  const mode = effectiveMode(settings);
  const wallpaper = settings.wallpaper;
  const key = wallColorKey(wallpaper, mode, tokens.bg);

  useEffect(() => {
    const wall = wallById(wallpaper);
    if (!wall) {
      useWallColors.getState().reset();
      return;
    }
    if (useWallColors.getState().key === key) return;

    let cancelled = false;
    const apply = (colors: WallColors) => {
      if (cancelled) return;
      useWallColors.getState().set(key, colors);
      /* Le document est repeint ici : `useAppStore.settings` n’a pas changé,
         seul le résultat de la lecture est nouveau. */
      applySettingsToDom(useAppStore.getState().settings);
    };

    sampleImage(wallUrl(wall.id))
      .then((pixels) =>
        apply(extractColors(pixels, { mode, background: tokens.bg })),
      )
      .catch((error: unknown) => {
        if (cancelled) return;
        useWallColors
          .getState()
          .fail(key, error instanceof Error ? error.message : "lecture impossible");
        applySettingsToDom(useAppStore.getState().settings);
      });

    return () => {
      cancelled = true;
    };
  }, [key, mode, tokens.bg, wallpaper]);
}

/** Taille de l’échantillon : voir le commentaire du hook. */
export const SAMPLE_SIZE = 48;

/**
 * Décode une image et renvoie ses pixels **RVB** (`48 × 48 × 3`).
 *
 * Le canvas renvoie du RVBA : on retire l’alpha ici, une fois, pour que
 * l’extracteur n’ait qu’un format à connaître. C’est précisément l’oubli de
 * cette conversion qui faisait lire l’octet alpha comme une couleur — et
 * donnait des accents rouges sur des images bleues.
 *
 * `crossOrigin="anonymous"` n’est pas décoratif : sans lui, dessiner une image
 * d’une autre origine rend le canvas « contaminé » et `getImageData` lève. Les
 * fonds sont servis par la même origine ; le drapeau protège le jour où l’un
 * d’eux viendra d’un CDN.
 */
export async function sampleImage(
  url: string,
  size = SAMPLE_SIZE,
): Promise<Uint8ClampedArray> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new Error("aucun navigateur pour lire l’image");
  }
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`image illisible : ${url}`));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas 2D indisponible");
  /* Un fond transparent laisserait voir le papier : sans cette teinte de
     fond, les zones vides d’un SVG seraient comptées comme du noir. */
  context.fillStyle = "#000000";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);
  return toRgbChannels(context.getImageData(0, 0, size, size).data);
}

/** RVBA → RVB. Une conversion, un seul endroit. */
export function toRgbChannels(
  data: ArrayLike<number>,
  channels: 3 | 4 = 4,
): Uint8ClampedArray {
  const count = Math.floor(data.length / channels);
  const out = new Uint8ClampedArray(count * 3);
  for (let index = 0; index < count; index += 1) {
    out[index * 3] = data[index * channels];
    out[index * 3 + 1] = data[index * channels + 1];
    out[index * 3 + 2] = data[index * channels + 2];
  }
  return out;
}
