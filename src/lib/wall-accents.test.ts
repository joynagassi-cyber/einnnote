import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodePng } from "../../scripts/png-stats.mjs";
import { detectChannels, extractColors, hueDistance, pixelWeight, signature } from "@/lib/palette";
import { parseHex, rgbToHsl } from "@/lib/accent";
import { toRgbChannels } from "@/lib/useWallPalette";
import { WALLS } from "@/lib/walls";

/**
 * **Ce que le navigateur lit vraiment.**
 *
 * Le 28 octobre, l’interface a posé un accent rouge sur une aurore boréale
 * bleue. La cause n’était pas l’algorithme de vote mais le **format des
 * pixels** : `getImageData()` renvoie du RVBA, l’extracteur lisait des
 * triplets, donc l’octet alpha devenait un canal de couleur. Ce fichier
 * verrouille les deux choses qui ont manqué : le format, et le fait que
 * l’accent d’une image lui ressemble.
 *
 * Les pixels ne sont pas inventés : on décode les PNG livrés, on les
 * rééchantillonne à 48 × 48 comme le canvas, puis on passe par la même
 * fonction que l’application.
 */

/** Rééchantillonnage par moyenne de bloc, comme `drawImage` en 48 × 48. */
function sample48(path: string, size = 48, channels: 3 | 4 = 4): Uint8ClampedArray {
  const { width, height, data } = decodePng(readFileSync(path)) as {
    width: number;
    height: number;
    data: Uint8Array;
  };
  const out = new Uint8ClampedArray(size * size * channels);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const x0 = Math.floor((x * width) / size);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / size));
      const y0 = Math.floor((y * height) / size);
      const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / size));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy += 1) {
        for (let xx = x0; xx < x1; xx += 1) {
          const index = (yy * width + xx) * 3;
          r += data[index];
          g += data[index + 1];
          b += data[index + 2];
          n += 1;
        }
      }
      const offset = (y * size + x) * channels;
      out[offset] = r / n;
      out[offset + 1] = g / n;
      out[offset + 2] = b / n;
      if (channels === 4) out[offset + 3] = 255;
    }
  }
  return out;
}

const hueOf = (hex: string) => rgbToHsl(parseHex(hex)!).h;

describe("le format des pixels", () => {
  it("RVBA → RVB, sans décalage d’octets", () => {
    const rgba = [10, 20, 30, 255, 40, 50, 60, 255];
    expect([...toRgbChannels(rgba)]).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it("lit le même accent en RVB qu’en RVBA", () => {
    const path = join(process.cwd(), "public", "walls", "aurore-boreale.png");
    const options = { mode: "dark" as const, background: "#1E1C19" };
    const rgb = extractColors(toRgbChannels(sample48(path, 48, 4)), options);
    const rgba = extractColors(sample48(path, 48, 4), {
      ...options,
      channels: 4,
    });
    expect(rgba.accent).toBe(rgb.accent);
    expect(rgba.deep).toBe(rgb.deep);
  });

  it("reproduit exactement le défaut corrigé : lire du RVBA comme du RVB", () => {
    const path = join(process.cwd(), "public", "walls", "aurore-boreale.png");
    const rgba = sample48(path, 48, 4);
    const wall = WALLS.find((entry) => entry.id === "aurore-boreale")!;
    const reference = extractColors(toRgbChannels(rgba), {
      mode: "dark",
      background: "#1E1C19",
    });
    // 1. le format est deviné : l’appelant n’a plus besoin de le dire
    expect(detectChannels(rgba)).toBe(4);
    const guess = extractColors(rgba, { mode: "dark", background: "#1E1C19" });
    expect(guess.accent).toBe(reference.accent);

    // 2. et même lu de travers, l’accent reste près de la famille de l’image
    const misread = extractColors(rgba, {
      mode: "dark",
      background: "#1E1C19",
      channels: 3,
    });
    expect(misread.accent).not.toBe(reference.accent);
    expect(hueDistance(hueOf(misread.accent), hueOf(wall.tone))).toBeGreaterThan(10);
  });
});

describe("l’accent ressemble à l’image", () => {
  /* Photographies **et** illustrations : même lecture, même exigence. */
  const photos = WALLS.filter(
    (wall) => wall.kind === "photo" || wall.kind === "illustration",
  );

  it("garde la teinte de l’image, sur les vingt-cinq fonds", () => {
    for (const wall of photos) {
      // une image sans couleur n’a pas de teinte à retrouver
      if (wall.monochrome) continue;
      const pixels = toRgbChannels(
        sample48(join(process.cwd(), "public", "walls", `${wall.id}.png`)),
      );
      const colors = extractColors(pixels, { mode: "dark", background: "#1E1C19" });
      const gap = hueDistance(hueOf(colors.accent), hueOf(wall.tone));
      expect(gap, `${wall.id} : accent ${colors.accent} vs image ${wall.tone}`).toBeLessThan(35);
    }
  });

  it("ne pose jamais du rouge sur une image froide", () => {
    for (const wall of photos) {
      const pixels = toRgbChannels(
        sample48(join(process.cwd(), "public", "walls", `${wall.id}.png`)),
      );
      const colors = extractColors(pixels, { mode: "dark", background: "#1E1C19" });
      const accentHue = hueOf(colors.accent);
      const toneHue = hueOf(wall.tone);
      const accentWarm = accentHue < 40 || accentHue > 320;
      const toneWarm = toneHue < 45 || toneHue > 320;
      if (accentWarm) expect(toneWarm, `${wall.id} : rouge sur une image froide`).toBe(true);
    }
  });

  it("donne toujours une couleur affirmée, jamais un gris de moyenne", () => {
    for (const wall of photos) {
      /* Une image en noir et blanc n’a pas de teinte : l’accent neutre est la
         réponse juste, pas un défaut. Ses valeurs restent mesurées : il doit
         être un gris franc, pas un gris de boue. */
      if (wall.monochrome) continue;
      const pixels = toRgbChannels(
        sample48(join(process.cwd(), "public", "walls", `${wall.id}.png`)),
      );
      const colors = extractColors(pixels, { mode: "dark", background: "#1E1C19" });
      const { s } = rgbToHsl(parseHex(colors.accent)!);
      expect(s, `${wall.id} : saturation ${colors.accent}`).toBeGreaterThan(20);
    }
  });
});

describe("pondération du vote", () => {
  it("donne plus de poids à une couleur franche qu’à un gris", () => {
    expect(pixelWeight({ r: 200, g: 60, b: 40 })).toBeGreaterThan(
      pixelWeight({ r: 130, g: 130, b: 130 }),
    );
  });

  it("ne laisse pas un détail saturé battre une large zone", () => {
    // 78 % de bleu nuit, 22 % de rouge vif : c’est le bleu, la couleur de l’image
    const pixels: number[] = [];
    const navy = parseHex("#1D3F66")!;
    const red = parseHex("#FF2D55")!;
    for (let index = 0; index < 780; index += 1) pixels.push(navy.r, navy.g, navy.b);
    for (let index = 0; index < 220; index += 1) pixels.push(red.r, red.g, red.b);
    const colors = extractColors(pixels, { mode: "dark", background: "#2E3440" });
    expect(hueDistance(hueOf(colors.accent), hueOf("#1D3F66"))).toBeLessThan(30);
  });

  it("relève la couleur lue pour qu’elle soit lisible et franche", () => {
    const dull = signature("#6E7A85", "dark");
    const { s, l } = rgbToHsl(parseHex(dull)!);
    expect(s).toBeGreaterThan(30);
    expect(l).toBeGreaterThan(40);
  });
});
