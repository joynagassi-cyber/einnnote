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

export interface Wall {
  id: string;
  label: string;
  /** l’ambiance en trois mots, affichée sous la vignette */
  mood: string;
  mode: PaletteMode;
  /** palette recommandée si l’on veut un rendu cohérent d’un clic */
  palette: string;
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
];

export function wallById(id: string | null | undefined): Wall | undefined {
  if (!id) return undefined;
  return WALLS.find((wall) => wall.id === id);
}

export function wallUrl(id: string): string {
  return `${import.meta.env.BASE_URL}walls/${id}.svg`;
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
