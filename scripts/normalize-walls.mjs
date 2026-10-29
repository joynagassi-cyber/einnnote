/**
 * Normalise la luminosité des photographies de fond, puis mesure leur teinte.
 *
 * **La règle, et sa raison.** Une image de fond est posée derrière un écran
 * translucide : le rendu réel est 40 % de papier, 60 % d’image (voir
 * `src/lib/glass.ts`). Une photographie claire — sable au soleil, ciel de midi
 * — fait donc remonter le verre vers le gris moyen, et c’est là que le texte
 * secondaire tombe sous AA (mesuré : 3,77 pour « Dunes d’ambre » sur une
 * palette sombre). Aucun réglage de voile ne peut le sauver, puisque le voile
 * ne fait que déplacer vers le papier du thème.
 *
 * On corrige donc l’image, pas le texte : un fond qui **n’a aucune palette
 * compatible** est ramené à une luminance moyenne ≤ 0,16 (sombre, jamais
 * noir), ce qui laisse passer la couleur et garantit la lecture. On ne touche
 * pas aux autres : une photographie pastel reste pastel, elle appelle
 * simplement une palette claire. Les tests de `glass.test.ts` vérifient le
 * résultat sur les pixels réels, fond par fond.
 *
 * Usage :
 *   node scripts/normalize-walls.mjs --check            état de tous les fonds
 *   node scripts/normalize-walls.mjs dunes-ambre        corrige un fond précis
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { decodePng, meanColor, toHex } from "./png-stats.mjs";

const DIR = join(process.cwd(), "public", "walls");
const TARGET = 0.16;
const CHECK = process.argv.includes("--check");
/**
 * Fonds à corriger, et la raison — jamais un réglage global :
 * `dunes-ambre` est un sable en pleine lumière (L = 0,196) : aucune des
 * vingt-trois palettes ne tient AA sur son verre, donc aucun voile ne peut le
 * sauver. Les autres photographies claires (jardin, sel) vivent très bien avec
 * une palette claire, et on les laisse telles quelles.
 */
/**
 * Fonds à corriger, avec leur raison :
 *
 * - `dunes-ambre` (L = 0,196) : sable en pleine lumière, aucune palette ne
 *   tient AA sur son verre ;
 * - `aube-mer` (L = 0,436) : pastel d’aube, même impasse — et le texte
 *   secondaire tombe à 4,00:1 sur son propre verre ;
 * - `new-york`, `marrakech` (L ≈ 0,17 avant correction) : à la limite.
 *
 * Les autres images claires (jardin, printemps, désert, sel) restent claires :
 * elles trouvent une palette compatible, et c’est un test qui le garantit.
 * Sans argument, le script applique cette liste — la chaîne complète
 * (`optimize-walls.sh` puis celui-ci) redevient donc idempotente.
 */
const DEFAULT_FIX = ["dunes-ambre", "aube-mer", "new-york", "marrakech"];
const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const FIX = new Set(args.length > 0 ? args : DEFAULT_FIX);

const channel = (value) => {
  const x = value / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const files = readdirSync(DIR).filter((file) => file.endsWith(".png")).sort();
const rows = [];

for (const file of files) {
  const path = join(DIR, file);
  const before = meanColor(decodePng(readFileSync(path)));
  const light = luminance(before);
  let applied = 1;

  const eligible = FIX.size === 0 ? false : FIX.has(file.replace(/\.png$/, ""));
  if (eligible && light > TARGET) {
    // assombrissement en lumière linéaire : la teinte est préservée, seule la
    // quantité de lumière change (aucun décalage de couleur, aucun virage)
    applied = Math.sqrt((TARGET + 0.05) / (light + 0.05));
    if (!CHECK) {
      execFileSync("convert", [
        path,
        "-colorspace",
        "RGB",
        "-evaluate",
        "multiply",
        applied.toFixed(4),
        "-colorspace",
        "sRGB",
        "-strip",
        "-define",
        "png:compression-level=9",
        path,
      ]);
    }
  }

  const after = meanColor(decodePng(readFileSync(path)));
  rows.push({
    file,
    tone: toHex(after),
    light: luminance(after),
    factor: applied,
    bytes: statSync(path).size,
  });
}

for (const row of rows) {
  const ok = row.light <= TARGET + 0.005 ? "ok" : "TROP CLAIR";
  console.log(
    `${row.file.padEnd(22)} ${row.tone}  L=${row.light.toFixed(3)}  ×${row.factor.toFixed(2)}  ${(row.bytes / 1024).toFixed(0)} Ko  ${ok}`,
  );
}
