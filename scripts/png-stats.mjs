/**
 * Lecture d’un PNG, sans dépendance.
 *
 * Sert à **vérifier** les photographies livrées : dimensions, format, couleur
 * moyenne. On ne peut pas le faire dans le navigateur au moment du test (pas de
 * `<canvas>` en jsdom), et installer `sharp` pour lire quinze pixels serait
 * disproportionné. Alors on décode : PNG 8 bits, entrelacement interdit, types
 * 2 (RVB), 6 (RVB+alpha) et 3 (palette) — exactement ce que produit
 * `scripts/optimize-walls.sh`.
 *
 * Rien ici n’entre dans le paquet : ce fichier vit hors de `src/`.
 */
import { inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunks(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error("ce fichier n’est pas un PNG");
  const out = new Map();
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR" || type === "PLTE" || type === "IDAT") {
      out.set(type, out.has(type) ? Buffer.concat([out.get(type), data]) : data);
    }
    if (type === "IEND") break;
    offset += 12 + length;
  }
  return out;
}

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/**
 * Décode l’image et renvoie ses pixels RVB (alpha ignoré : un fond de page est
 * opaque, et les PNG livrés le sont aussi).
 */
export function decodePng(buffer) {
  const parts = chunks(buffer);
  const header = parts.get("IHDR");
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const depth = header.readUInt8(8);
  const colorType = header.readUInt8(9);
  const interlace = header.readUInt8(12);
  if (depth !== 8) throw new Error(`profondeur ${depth} non prise en charge`);
  if (interlace !== 0) throw new Error("PNG entrelacé non pris en charge");
  if (![2, 3, 6].includes(colorType)) throw new Error(`type ${colorType} non pris en charge`);

  const palette = parts.get("PLTE");
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 1;
  const stride = width * channels;
  const raw = inflateSync(parts.get("IDAT"));
  const pixels = Buffer.alloc(height * stride);

  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    const line = raw.subarray(cursor, cursor + stride);
    cursor += stride;
    const row = y * stride;
    const previous = row - stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[row + x - channels] : 0;
      const up = y > 0 ? pixels[previous + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[previous + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      pixels[row + x] = value & 0xff;
    }
  }

  const rgb = new Uint8Array(width * height * 3);
  for (let index = 0; index < width * height; index += 1) {
    if (colorType === 3) {
      const entry = pixels[index] * 3;
      rgb[index * 3] = palette[entry];
      rgb[index * 3 + 1] = palette[entry + 1];
      rgb[index * 3 + 2] = palette[entry + 2];
    } else if (colorType === 2) {
      rgb[index * 3] = pixels[index * 3];
      rgb[index * 3 + 1] = pixels[index * 3 + 1];
      rgb[index * 3 + 2] = pixels[index * 3 + 2];
    } else {
      rgb[index * 3] = pixels[index * 4];
      rgb[index * 3 + 1] = pixels[index * 4 + 1];
      rgb[index * 3 + 2] = pixels[index * 4 + 2];
    }
  }
  return { width, height, data: rgb };
}

export const toHex = ([r, g, b]) =>
  `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;

/** Couleur moyenne d’une image décodée : ce que « voit » le voile. */
export function meanColor(image) {
  const { data } = image;
  const count = data.length / 3;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let index = 0; index < data.length; index += 3) {
    r += data[index];
    g += data[index + 1];
    b += data[index + 2];
  }
  return [r / count, g / count, b / count];
}
