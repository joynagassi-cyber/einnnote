/**
 * Couleur moyenne de chaque fond — la valeur `tone` de `src/lib/walls.ts`.
 *
 * `src/lib/glass.test.ts` recalcule la même chose dans le test ; ce script sert
 * quand on ajoute ou retouche une image : il imprime les valeurs à recopier,
 * et signale celles qui ont dérivé de plus de 6/255.
 *
 *   node scripts/wall-tones.mjs
 */
import { readFileSync, readdirSync } from "node:fs";

const toRgb = (value) => {
  const clean = value.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function averageColor(file) {
  const svg = readFileSync(file, "utf8");
  const base = toRgb(/<rect width="1600" height="1000" fill="(#[0-9A-Fa-f]{3,6})"/.exec(svg)[1]);
  const halos = [...svg.matchAll(/<circle cx="\d+" cy="\d+" r="(\d+)" fill="(#[0-9A-Fa-f]{3,6})" opacity="([\d.]+)"/g)]
    .map((m) => ({ radius: Number(m[1]), color: toRgb(m[2]), opacity: Number(m[3]) }));

  const total = 1600 * 1000;
  let weight = total;
  let sum = base.map((v) => v * total);
  for (const halo of halos) {
    // le flou étale largement le halo : ~2,4 fois son disque
    const haloWeight = Math.min(total * 0.6, Math.PI * halo.radius ** 2 * 2.4) * halo.opacity;
    sum = sum.map((v, i) => v + halo.color[i] * haloWeight);
    weight += haloWeight;
  }
  return sum.map((v) => v / weight);
}

const walls = readFileSync("src/lib/walls.ts", "utf8");
const declared = new Map(
  [...walls.matchAll(/id: "([a-z-]+)",[\s\S]*?tone: "(#[0-9a-fA-F]{6})"/g)].map((m) => [m[1], m[2]]),
);

let drift = 0;
for (const file of readdirSync("public/walls").sort()) {
  const id = file.replace(".svg", "");
  const actual = averageColor(`public/walls/${file}`);
  const hex = toHex(actual);
  const current = declared.get(id);
  const delta = current
    ? Math.max(...actual.map((v, i) => Math.abs(v - toRgb(current)[i])))
    : Infinity;
  if (delta > 6) drift += 1;
  console.log(
    `${id.padEnd(13)} ${hex}  ${current ?? "(absent)"}  écart ${delta === Infinity ? "—" : delta.toFixed(1)}`,
  );
}
console.log(
  drift === 0
    ? "\nToutes les valeurs `tone` sont à jour."
    : `\n${drift} fond(s) à recopier dans WALLS (colonne du milieu).`,
);
