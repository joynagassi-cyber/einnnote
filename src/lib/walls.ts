import type { PaletteMode } from "@/lib/themes";

/**
 * Fonds « verre ».
 *
 * Chaque fond est une image (SVG généré, voir `scripts/make-walls.py`) posée
 * derrière l’interface, floutée, avec les surfaces en glassmorphisme. Deux
 * règles de conception :
 *
 * 1. **Le fond ne combat jamais le texte.** Il est toujours flouté (≥ 18 px) et
 *    voilé (≥ 30 %) : la lisibilité ne dépend pas du hasard d’une image.
 * 2. **Le fond ne ment pas sur le thème.** Chaque fond appartient à un mode
 *    (clair ou sombre) et le dit : poser un fond sombre sur un thème clair
 *    demande un voile clair, ce que le moteur applique automatiquement.
 *
 * Les images sont générées, donc régénérables à l’identique et sans dette de
 * licence photo (voir docs/WALLS.md).
 */

/**
 * Deux familles de fonds, et deux usages :
 * - `aura` — des halos flous sur une couleur de base : une ambiance, une
 *   profondeur, une photo qu’on devine ;
 * - `ramp` — un dégradé à cinq arrêts : une couleur franche et identifiable,
 *   pour qui veut une signature chromatique plutôt qu’une texture ;
 * - `photo` — une photographie réelle (PNG), livrée avec la palette qu’elle
 *   porte : l’interface en tire son accent en la lisant (`src/lib/palette.ts`).
 */
export type WallKind = "aura" | "ramp" | "photo" | "illustration";

/**
 * Familles affichées dans la galerie.
 *
 * Une seule liste de quarante-quatre fonds serait un mur : on les range en
 * **séries**, comme un choix de couvertures. L’ordre va du plus « dessiné » au
 * plus « abstrait », parce que c’est l’ordre dans lequel on cherche.
 */
export type WallSeries =
  | "horizons"
  | "matieres"
  | "saisons"
  | "villes"
  | "photos"
  | "halos"
  | "degrades";

export const WALL_SERIES: { id: WallSeries; label: string; hint: string }[] = [
  { id: "horizons", label: "Horizons", hint: "Aube, désert, montagne, brume, noir et blanc — cinq lumières" },
  { id: "matieres", label: "Matières", hint: "Feuillage, béton — des surfaces, pas des paysages" },
  { id: "saisons", label: "Saisons", hint: "Quatre lumières d’année" },
  { id: "villes", label: "Villes", hint: "Des lieux reconnaissables, dessinés" },
  { id: "photos", label: "Photographies", hint: "Des images réelles, mesurées pour rester lisibles" },
  { id: "halos", label: "Halos", hint: "Aucune forme : une couleur, une profondeur" },
  { id: "degrades", label: "Dégradés", hint: "Une couleur franche, cinq arrêts" },
];

export interface Wall {
  id: string;
  label: string;
  kind?: WallKind;
  /** l’ambiance en trois mots, affichée sous la vignette */
  mood: string;
  mode: PaletteMode;
  /** palette recommandée si l’on veut un rendu cohérent d’un clic */
  palette: string;
  /** série de la galerie (déduite de `kind` quand elle n’est pas écrite) */
  series?: WallSeries;
  /**
   * L’image n’a pas de couleur : son accent sera neutre, et c’est juste.
   * Sert seulement aux tests, qui exigent sinon un accent saturé.
   */
  monochrome?: boolean;
  /**
   * Couleur moyenne de l’image (halos compris). Elle sert à calculer la bande
   * de voile où le texte reste lisible **et** le fond reste visible ; le test
   * `glass.test.ts` la recalcule depuis le SVG et échoue si elle dérive.
   */
  tone: string;
}

export const WALLS: Wall[] = [
  { id: "aurore", label: "Aurore", mood: "turquoise · violet", mode: "dark", palette: "lilas-nuit", tone: "#2b3656" },
  { id: "braise", label: "Braise", mood: "cuivre · braise", mode: "dark", palette: "gruvbox", tone: "#642d17" },
  { id: "onyx", label: "Onyx", mood: "graphite · fumée", mode: "dark", palette: "noir-absolu", tone: "#222228" },
  { id: "ocean", label: "Océan", mood: "bleu · profondeur", mode: "dark", palette: "acier", tone: "#0e3955" },
  { id: "foret", label: "Forêt", mood: "sapin · mousse", mode: "dark", palette: "everforest", tone: "#133925" },
  { id: "cuivre", label: "Cuivre", mood: "ambre · terre", mode: "dark", palette: "gruvbox", tone: "#4e341b" },
  { id: "grenat", label: "Grenat", mood: "vin · velours", mode: "dark", palette: "rose-nuit", tone: "#481628" },
  { id: "nuit-encre", label: "Nuit d’encre", mood: "indigo · encre", mode: "dark", palette: "tokyo-night", tone: "#1c1b41" },
  { id: "glacier", label: "Glacier", mood: "glace · ciel", mode: "light", palette: "papier", tone: "#d9ecf5" },
  { id: "brume", label: "Brume", mood: "gris · ouate", mode: "light", palette: "blanc-absolu", tone: "#e2e9ef" },
  { id: "quartz-rose", label: "Quartz rose", mood: "rose · quartz", mode: "light", palette: "rose-poudre", tone: "#f7dfe7" },
  { id: "lilas", label: "Lilas", mood: "violet · sucre", mode: "light", palette: "lilas", tone: "#e9dff7" },
  { id: "peche", label: "Pêche", mood: "abricot · crème", mode: "light", palette: "peche", tone: "#fae3d3" },
  { id: "sauge", label: "Sauge", mood: "vert · lin", mode: "light", palette: "sauge", tone: "#deebdf" },
  { id: "menthe", label: "Menthe", mood: "eau · fraîcheur", mode: "light", palette: "menthe", tone: "#d4f0e4" },
  { id: "argile", label: "Argile", mood: "terre · sable", mode: "light", palette: "argile", tone: "#eddecd" },
  { id: "sable", label: "Sable", mood: "beige · papier", mode: "light", palette: "papier", tone: "#f0e7d5" },
  { id: "ciel", label: "Ciel", mood: "bleu · matin", mode: "light", palette: "solarized-clair", tone: "#dae8fa" },
  /* Dégradés — cinq arrêts, rampe continue (voir scripts/make-walls.py). */
  { id: "aube", label: "Aube", mood: "pêche · lilas", mode: "light", palette: "rose-poudre", tone: "#f1bebc", kind: "ramp" },
  { id: "lagune", label: "Lagune", mood: "menthe · ciel", mode: "light", palette: "menthe", tone: "#bee1eb", kind: "ramp" },
  { id: "miel", label: "Miel", mood: "or · argile", mode: "light", palette: "argile", tone: "#f3ce9d", kind: "ramp" },
  { id: "crepuscule", label: "Crépuscule", mood: "nuit · indigo", mode: "dark", palette: "lilas-nuit", tone: "#3d3965", kind: "ramp" },
  { id: "braise-nuit", label: "Braise de nuit", mood: "rouge · cendre", mode: "dark", palette: "gruvbox", tone: "#7a2d1d", kind: "ramp" },
  { id: "velours", label: "Velours", mood: "prune · améthyste", mode: "dark", palette: "rose-nuit", tone: "#4c2562", kind: "ramp" },
  /* Photographies — PNG, 1280 px, générées pour ce projet (voir
     `wallpapers/README.md`). `tone` est la couleur **moyenne réelle** du
     fichier, mesurée par `scripts/normalize-walls.mjs` et vérifiée sur les
     pixels par `src/lib/glass.test.ts` : elle ne s’écrit jamais à l’œil. La
     palette recommandée n’est pas un goût non plus : c’est la seule (ou l’une
     des seules) qui garde AA sur le verre de cette image — même test. */
  { id: "aube-glacee", label: "Aube glacée", mood: "lac · givre", mode: "dark", palette: "radix-nuit", tone: "#606973", kind: "photo" },
  { id: "foret-brume", label: "Forêt de brume", mood: "sapin · brouillard", mode: "dark", palette: "papier-nuit", tone: "#404e4a", kind: "photo" },
  { id: "dunes-ambre", label: "Dunes d’ambre", mood: "sable · or", mode: "dark", palette: "material-sombre", tone: "#8d674a", kind: "photo" },
  { id: "canyon-argile", label: "Canyon d’argile", mood: "roche · rouille", mode: "dark", palette: "rose-nuit", tone: "#81604c", kind: "photo" },
  { id: "falaises-ocean", label: "Falaises d’océan", mood: "écume · large", mode: "dark", palette: "material-sombre", tone: "#5f7376", kind: "photo" },
  { id: "aurore-boreale", label: "Aurore boréale", mood: "aurore · étoiles", mode: "dark", palette: "lilas-nuit", tone: "#2c5165", kind: "photo" },
  { id: "ville-nuit", label: "Ville la nuit", mood: "néon · bitume", mode: "dark", palette: "tokyo-night", tone: "#23253a", kind: "photo" },
  { id: "volcan-noir", label: "Volcan noir", mood: "basalte · cendre", mode: "dark", palette: "noir-absolu", tone: "#3d4850", kind: "photo" },
  { id: "jardin-fleurs", label: "Jardin en fleurs", mood: "pétales · printemps", mode: "light", palette: "material", tone: "#afa58a", kind: "photo" },
  { id: "sel-pastel", label: "Sel pastel", mood: "miroir · pastel", mode: "light", palette: "lilas", tone: "#c8c5c3", kind: "photo" },
  /* Illustrations — dessin vectoriel éditorial, PNG 1280 px. Même chaîne de
     fabrication que les photographies ; le `tone` reste mesuré, jamais choisi. */
  { id: "feuillage", label: "Feuillage", mood: "monstera · jungle", mode: "dark", palette: "mocha", tone: "#266341", kind: "illustration", series: "matieres" },
  { id: "architecture", label: "Architecture", mood: "béton · lignes", mode: "dark", palette: "material-sombre", tone: "#716e67", kind: "illustration", series: "matieres" },
  { id: "printemps", label: "Printemps", mood: "cerisiers · prairie", mode: "light", palette: "rose-poudre", tone: "#c4cbb7", kind: "illustration", series: "saisons" },
  { id: "ete", label: "Été", mood: "lagon · sel", mode: "light", palette: "nord-neige", tone: "#a1ccc0", kind: "illustration", series: "saisons" },
  { id: "automne", label: "Automne", mood: "ambre · lac", mode: "light", palette: "material", tone: "#bd9c73", kind: "illustration", series: "saisons" },
  { id: "hiver", label: "Hiver", mood: "glace · sapin", mode: "light", palette: "nord-neige", tone: "#b8c7ca", kind: "illustration", series: "saisons" },
  { id: "tokyo", label: "Tokyo", mood: "indigo · cerisier", mode: "dark", palette: "lilas-nuit", tone: "#586282", kind: "illustration", series: "villes" },
  { id: "new-york", label: "New York", mood: "heure dorée · tours", mode: "dark", palette: "material-sombre", tone: "#806d59", kind: "illustration", series: "villes" },
  { id: "marrakech", label: "Marrakech", mood: "terre · minaret", mode: "dark", palette: "material-sombre", tone: "#976552", kind: "illustration", series: "villes" },
  { id: "sydney", label: "Sydney", mood: "port · voiles", mode: "light", palette: "material", tone: "#879ba2", kind: "illustration", series: "villes" },
  /* Série « Horizons » — cinq thèmes de plus, deux illustrés, trois réels.
     `noir-blanc` est déclaré monochrome : son accent est **volontairement**
     neutre, c’est l’image qui l’exige (voir `wall-accents.test.ts`). */
  { id: "aube-mer", label: "Aube sur mer", mood: "mer · première lumière", mode: "dark", palette: "material-sombre", tone: "#796e6f", kind: "illustration", series: "horizons" },
  { id: "desert", label: "Désert", mood: "dune · ochre", mode: "light", palette: "nord-neige", tone: "#dfb088", kind: "illustration", series: "horizons" },
  { id: "montagne", label: "Montagne", mood: "arête · heure bleue", mode: "dark", palette: "nord", tone: "#334d6a", kind: "photo", series: "horizons" },
  { id: "brume-lac", label: "Brume de lac", mood: "jetée · ouate", mode: "light", palette: "material", tone: "#7d8b8d", kind: "photo", series: "horizons" },
  { id: "noir-blanc", label: "Noir et blanc", mood: "béton · ombre", mode: "dark", palette: "papier-nuit", tone: "#484848", kind: "photo", series: "horizons", monochrome: true },
];

export function wallById(id: string | null | undefined): Wall | undefined {
  if (!id) return undefined;
  return WALLS.find((wall) => wall.id === id);
}

/**
 * L’extension suit la famille : les fonds dessinés sont vectoriels, les
 * photographies sont raster. Une seule fonction, donc aucune adresse écrite
 * deux fois (et un test qui vérifie que le fichier existe vraiment).
 */
export function wallFile(id: string, kind?: WallKind): string {
  return `${id}.${kind === "photo" || kind === "illustration" ? "png" : "svg"}`;
}

/** Série d’un fond : écrite, ou déduite de sa famille de fabrication. */
export function seriesOf(wall: Wall): WallSeries {
  if (wall.series) return wall.series;
  return wall.kind === "photo" ? "photos" : wall.kind === "ramp" ? "degrades" : "halos";
}

/** Les fonds groupés, dans l’ordre de la galerie (sans série vide). */
export function wallsBySeries(): { id: WallSeries; label: string; hint: string; walls: Wall[] }[] {
  return WALL_SERIES.map((series) => ({
    ...series,
    walls: WALLS.filter((wall) => seriesOf(wall) === series.id),
  })).filter((series) => series.walls.length > 0);
}

export function wallUrl(id: string): string {
  const wall = wallById(id);
  return `${import.meta.env.BASE_URL}walls/${wallFile(id, wall?.kind)}`;
}

/**
 * Signatures : un seul choix qui règle plusieurs choses à la fois.
 *
 * C’est ce qui manque à la plupart des applications « personnalisables » : on
 * offre trente réglages et on laisse l’utilisateur seul devant. Une signature
 * est un **goût déjà composé** (palette + arrondi + fond + densité), qu’on peut
 * ensuite affiner à la main.
 */
export interface Signature {
  id: string;
  label: string;
  hint: string;
  palette: string;
  wallpaper: string | null;
  radius: "sharp" | "regular" | "soft";
  density: "compact" | "regular" | "airy";
  borders: "subtle" | "regular" | "strong";
}

export const SIGNATURES: Signature[] = [
  {
    id: "atelier",
    label: "Atelier",
    hint: "Papier chaud, courbes douces, sans fond.",
    palette: "papier",
    wallpaper: null,
    radius: "soft",
    density: "regular",
    borders: "subtle",
  },
  {
    id: "verre-clair",
    label: "Verre clair",
    hint: "Fond quartz, surfaces translucides, très rond.",
    palette: "rose-poudre",
    wallpaper: "quartz-rose",
    radius: "soft",
    density: "airy",
    borders: "subtle",
  },
  {
    id: "nuit-douce",
    label: "Nuit douce",
    hint: "Noir profond, accent lilas, coins nets.",
    palette: "lilas-nuit",
    wallpaper: "aurore",
    radius: "regular",
    density: "regular",
    borders: "subtle",
  },
  {
    id: "encre",
    label: "Encre",
    hint: "Noir absolu, arêtes nettes, aucun effet.",
    palette: "noir-absolu",
    wallpaper: "nuit-encre",
    radius: "sharp",
    density: "compact",
    borders: "strong",
  },
  {
    id: "pierre",
    label: "Pierre",
    hint: "Acier sombre, fond océan, densité compacte.",
    palette: "acier",
    wallpaper: "ocean",
    radius: "regular",
    density: "compact",
    borders: "regular",
  },
  {
    id: "sable",
    label: "Sable",
    hint: "Sauge claire, fond sable, aéré.",
    palette: "sauge",
    wallpaper: "sable",
    radius: "soft",
    density: "airy",
    borders: "subtle",
  },
];
