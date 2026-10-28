/**
 * Palettes de l’application — 23 thèmes, valeurs officielles.
 *
 * Règle : les couleurs de base viennent des dépôts des auteurs (pas d’un
 * blog, pas d’une capture, pas de mémoire). Chaque entrée cite sa source et
 * sa licence. Les jetons secondaires (fond doux, encre sur fond doux, lignes,
 * danger, surlignage) sont dérivés ici, puis **corrigés** jusqu’à passer AA :
 * une teinte officielle illisible n’est jamais servie telle quelle, elle est
 * décalée du minimum nécessaire et le décalage est mesurable.
 *
 * Ce fichier est la seule source : `themes.test.ts` recalcule tous les ratios
 * et échoue si une valeur dérive.
 */

import {
  bestTextOn,
  contrastRatio,
  ensureContrast,
  hslToRgb,
  parseHex,
  rgbToHsl,
  toHex,
} from "@/lib/accent";

export type PaletteMode = "light" | "dark";

export interface PaletteSource {
  /** dépôt ou documentation d’origine */
  url: string;
  license: string;
}

export interface PaletteSeed {
  key: string;
  label: string;
  family: string;
  mode: PaletteMode;
  /** palette claire/sombre jumelle, pour le bouton clair↔sombre */
  sibling?: string;
  source: PaletteSource;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  /** couleurs officielles facultatives, utilisées pour les états */
  red?: string;
  gold?: string;
  line?: string;
  surface2?: string;
  /** note affichée dans la galerie */
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

/** Teintes maison, construites puis corrigées jusqu’à AA par `buildTheme`. */
const ENGRAM: PaletteSource = {
  url: "https://github.com/einnote",
  license: "Interne — valeurs d’auteur, audit de contraste automatisé",
};

const CC: PaletteSource = {
  url: "https://github.com/catppuccin/palette",
  license: "MIT",
};
const NORD: PaletteSource = {
  url: "https://github.com/nordtheme/nord",
  license: "MIT",
};
const GRUVBOX: PaletteSource = {
  url: "https://github.com/morhetz/gruvbox",
  license: "MIT",
};
const SOLARIZED: PaletteSource = {
  url: "https://github.com/altercation/solarized",
  license: "MIT",
};
const ROSE: PaletteSource = {
  url: "https://github.com/rose-pine/palette",
  license: "MIT",
};
const TOKYO: PaletteSource = {
  url: "https://github.com/enkia/tokyo-night-vscode-theme",
  license: "MIT",
};
const EVERFOREST: PaletteSource = {
  url: "https://github.com/sainnhe/everforest",
  license: "MIT",
};
const MATERIAL: PaletteSource = {
  url: "https://github.com/material-components/material-web",
  license: "Apache-2.0",
};
const RADIX: PaletteSource = {
  url: "https://github.com/radix-ui/colors",
  license: "MIT",
};

export const PALETTES: PaletteSeed[] = [
  /* ---------- Papier (maison) ---------- */
  {
    key: "papier",
    label: "Papier calme",
    family: "Engram",
    mode: "light",
    sibling: "papier-nuit",
    source: { url: "https://github.com/joynagassi-cyber/einnnote", license: "maison" },
    bg: "#F6F1E7",
    surface: "#FFFDF8",
    surface2: "#EFE8D8",
    ink: "#2B2A27",
    muted: "#6B6659",
    accent: "#0F766E",
    red: "#B3261E",
    gold: "#F6E3A1",
    line: "#E4DCCB",
    note: "Le papier d’origine : sable chaud, encre douce.",
  },
  {
    key: "papier-nuit",
    label: "Papier nuit",
    family: "Engram",
    mode: "dark",
    sibling: "papier",
    source: { url: "https://github.com/joynagassi-cyber/einnnote", license: "maison" },
    bg: "#1E1C19",
    surface: "#27241F",
    surface2: "#302C26",
    ink: "#F1ECE1",
    muted: "#A8A193",
    accent: "#5EC8BD",
    red: "#F2B8B5",
    gold: "#F6E3A1",
    line: "#3A362F",
  },

  /* ---------- Catppuccin ---------- */
  {
    key: "latte",
    label: "Latte",
    family: "Catppuccin",
    mode: "light",
    sibling: "mocha",
    source: CC,
    bg: "#EFF1F5",
    surface: "#FFFFFF",
    surface2: "#E6E9EF",
    ink: "#4C4F69",
    muted: "#5C5F77",
    accent: "#1E66F5",
    red: "#D20F39",
    gold: "#DF8E1D",
    line: "#DCE0E8",
    note: "Le clair de Catppuccin, 26 teintes nommées.",
  },
  {
    key: "frappe",
    label: "Frappé",
    family: "Catppuccin",
    mode: "dark",
    sibling: "latte",
    source: CC,
    bg: "#303446",
    surface: "#414559",
    surface2: "#51576D",
    ink: "#C6D0F5",
    muted: "#B5BFE2",
    accent: "#8CAAEE",
    red: "#E78284",
    gold: "#E5C890",
    line: "#414559",
  },
  {
    key: "macchiato",
    label: "Macchiato",
    family: "Catppuccin",
    mode: "dark",
    sibling: "latte",
    source: CC,
    bg: "#24273A",
    surface: "#363A4F",
    surface2: "#494D64",
    ink: "#CAD3F5",
    muted: "#A5ADCB",
    accent: "#8AADF4",
    red: "#ED8796",
    gold: "#EED49F",
    line: "#363A4F",
  },
  {
    key: "mocha",
    label: "Mocha",
    family: "Catppuccin",
    mode: "dark",
    sibling: "latte",
    source: CC,
    bg: "#1E1E2E",
    surface: "#313244",
    surface2: "#45475A",
    ink: "#CDD6F4",
    muted: "#A6ADC8",
    accent: "#89B4FA",
    red: "#F38BA8",
    gold: "#F9E2AF",
    line: "#313244",
    note: "Le sombre le plus utilisé de l’écosystème.",
  },

  /* ---------- Nord ---------- */
  {
    key: "nord",
    label: "Nord",
    family: "Nord",
    mode: "dark",
    sibling: "nord-neige",
    source: NORD,
    bg: "#2E3440",
    surface: "#3B4252",
    surface2: "#434C5E",
    ink: "#ECEFF4",
    muted: "#A9B7C9",
    accent: "#88C0D0",
    red: "#BF616A",
    gold: "#EBCB8B",
    line: "#434C5E",
    note: "Bleu arctique, 16 teintes polaires.",
  },
  {
    key: "nord-neige",
    label: "Nord Neige",
    family: "Nord",
    mode: "light",
    sibling: "nord",
    source: NORD,
    bg: "#ECEFF4",
    surface: "#FFFFFF",
    surface2: "#E5E9F0",
    ink: "#2E3440",
    muted: "#4C566A",
    accent: "#5E81AC",
    red: "#BF616A",
    gold: "#D9A441",
    line: "#D8DEE9",
  },

  /* ---------- Gruvbox ---------- */
  {
    key: "gruvbox",
    label: "Gruvbox",
    family: "Gruvbox",
    mode: "dark",
    sibling: "gruvbox-clair",
    source: GRUVBOX,
    bg: "#282828",
    surface: "#3C3836",
    surface2: "#504945",
    ink: "#EBDBB2",
    muted: "#BDAE93",
    accent: "#FABD2F",
    red: "#FB4934",
    gold: "#FABD2F",
    line: "#504945",
    note: "Contraste chaud, pensé pour les longues sessions.",
  },
  {
    key: "gruvbox-clair",
    label: "Gruvbox clair",
    family: "Gruvbox",
    mode: "light",
    sibling: "gruvbox",
    source: GRUVBOX,
    bg: "#FBF1C7",
    surface: "#FFFDF2",
    surface2: "#F2E5BC",
    ink: "#3C3836",
    muted: "#6B5F54",
    accent: "#AF3A03",
    red: "#9D0006",
    gold: "#B57614",
    line: "#E0CFA0",
  },

  /* ---------- Solarized ---------- */
  {
    key: "solarized-clair",
    label: "Solarized clair",
    family: "Solarized",
    mode: "light",
    sibling: "solarized-sombre",
    source: SOLARIZED,
    bg: "#FDF6E3",
    surface: "#FFFCF0",
    surface2: "#EEE8D5",
    ink: "#073642",
    muted: "#586E75",
    accent: "#2075B0",
    red: "#DC322F",
    gold: "#B58900",
    line: "#E4DCC2",
    note: "Les 16 teintes calculées par Ethan Schoonover.",
  },
  {
    key: "solarized-sombre",
    label: "Solarized sombre",
    family: "Solarized",
    mode: "dark",
    sibling: "solarized-clair",
    source: SOLARIZED,
    bg: "#002B36",
    surface: "#073642",
    surface2: "#0B4250",
    ink: "#EEE8D5",
    muted: "#93A1A1",
    accent: "#57B0E8",
    red: "#E2645F",
    gold: "#C9A227",
    line: "#0B4250",
  },

  /* ---------- Rosé Pine ---------- */
  {
    key: "rose-pine",
    label: "Rosé Pine",
    family: "Rosé Pine",
    mode: "dark",
    sibling: "rose-pine-aube",
    source: ROSE,
    bg: "#191724",
    surface: "#1F1D2E",
    surface2: "#26233A",
    ink: "#E0DEF4",
    muted: "#908CAA",
    accent: "#C4A7E7",
    red: "#EB6F92",
    gold: "#F6C177",
    line: "#26233A",
    note: "Iris, mousse et or : six teintes seulement.",
  },
  {
    key: "rose-pine-lune",
    label: "Rosé Pine Lune",
    family: "Rosé Pine",
    mode: "dark",
    sibling: "rose-pine-aube",
    source: ROSE,
    bg: "#232136",
    surface: "#2A273F",
    surface2: "#393552",
    ink: "#E0DEF4",
    muted: "#9C98B6",
    accent: "#C4A7E7",
    red: "#EB6F92",
    gold: "#F6C177",
    line: "#393552",
  },
  {
    key: "rose-pine-aube",
    label: "Rosé Pine Aube",
    family: "Rosé Pine",
    mode: "light",
    sibling: "rose-pine",
    source: ROSE,
    bg: "#FAF4ED",
    surface: "#FFFAF3",
    surface2: "#F2E9E1",
    ink: "#4F4A6E",
    muted: "#6A6586",
    accent: "#286983",
    red: "#B4637A",
    gold: "#EA9D34",
    line: "#EFE2D9",
  },

  /* ---------- Tokyo Night ---------- */
  {
    key: "tokyo-night",
    label: "Tokyo Night",
    family: "Tokyo Night",
    mode: "dark",
    sibling: "tokyo-jour",
    source: TOKYO,
    bg: "#1A1B26",
    surface: "#1F2335",
    surface2: "#292E42",
    ink: "#C0CAF5",
    muted: "#9AA5CE",
    accent: "#7AA2F7",
    red: "#F7768E",
    gold: "#E0AF68",
    line: "#292E42",
    note: "Bleu nuit de Shinjuku, dégradés froids.",
  },
  {
    key: "tokyo-jour",
    label: "Tokyo Jour",
    family: "Tokyo Night",
    mode: "light",
    sibling: "tokyo-night",
    source: TOKYO,
    bg: "#E6E7ED",
    surface: "#F2F3F7",
    surface2: "#D6D8DF",
    ink: "#343B59",
    muted: "#5A607D",
    accent: "#2959AA",
    red: "#8C4351",
    gold: "#8F5E15",
    line: "#D0D3DC",
  },

  /* ---------- Everforest ---------- */
  {
    key: "everforest",
    label: "Everforest",
    family: "Everforest",
    mode: "dark",
    sibling: "everforest-clair",
    source: EVERFOREST,
    bg: "#2D353B",
    surface: "#343F44",
    surface2: "#3D484D",
    ink: "#D3C6AA",
    muted: "#A6B0A0",
    accent: "#A7C080",
    red: "#E67E80",
    gold: "#DBBC7F",
    line: "#3D484D",
    note: "Forêt : vert sauge sur gris-vert.",
  },
  {
    key: "everforest-clair",
    label: "Everforest clair",
    family: "Everforest",
    mode: "light",
    sibling: "everforest",
    source: EVERFOREST,
    bg: "#FDF6E3",
    surface: "#FFFBEF",
    surface2: "#F4F0D9",
    ink: "#3D484D",
    muted: "#6A7A70",
    accent: "#6C7A00",
    red: "#B34747",
    gold: "#A6841C",
    line: "#E7E1C6",
  },

  /* ---------- Material 3 ---------- */
  {
    key: "material",
    label: "Material 3",
    family: "Material",
    mode: "light",
    sibling: "material-sombre",
    source: MATERIAL,
    bg: "#FFFBFE",
    surface: "#F7F2FA",
    surface2: "#E7E0EC",
    ink: "#1D1B20",
    muted: "#49454F",
    accent: "#6750A4",
    red: "#B3261E",
    gold: "#F2C14E",
    line: "#E7E0EC",
    note: "Rôles Material : surface, surface-variant, primary.",
  },
  {
    key: "material-sombre",
    label: "Material 3 sombre",
    family: "Material",
    mode: "dark",
    sibling: "material",
    source: MATERIAL,
    bg: "#1C1B1F",
    surface: "#2B2930",
    surface2: "#36343B",
    ink: "#E6E1E5",
    muted: "#CAC4D0",
    accent: "#D0BCFF",
    red: "#F2B8B5",
    gold: "#EFC46A",
    line: "#36343B",
  },

  /* ---------- Radix ---------- */
  {
    key: "radix",
    label: "Radix Sand",
    family: "Radix",
    mode: "light",
    sibling: "radix-nuit",
    source: RADIX,
    bg: "#FDFDFC",
    surface: "#F9F9F8",
    surface2: "#E9E8E6",
    ink: "#21201C",
    muted: "#63635E",
    accent: "#3E63DD",
    red: "#CE2C31",
    gold: "#F5D90A",
    line: "#DAD9D6",
    note: "Échelle 1→12 pensée pour les interfaces, pas pour l’illustration.",
  },
  {
    key: "radix-nuit",
    label: "Radix Nuit",
    family: "Radix",
    mode: "dark",
    sibling: "radix",
    source: RADIX,
    bg: "#111110",
    surface: "#191918",
    surface2: "#222221",
    ink: "#EEEEEC",
    muted: "#B5B3AD",
    accent: "#5B7CFA",
    red: "#FF6369",
    gold: "#FFE629",
    line: "#2A2A28",
  },

  /* ---------------------------------------------------------------- */
  /* Deux extrêmes volontaires : le noir vrai et le blanc vrai.         */
  /* Sur un écran OLED, #000 éteint les pixels : c’est le seul fond qui */
  /* ne consomme rien et qui ne « bave » pas dans le noir.              */
  /* ---------------------------------------------------------------- */
  {
    key: "noir-absolu",
    label: "Noir absolu",
    family: "Extrêmes",
    mode: "dark",
    sibling: "blanc-absolu",
    source: ENGRAM,
    bg: "#000000",
    surface: "#0B0B0C",
    surface2: "#141416",
    ink: "#F4F4F5",
    muted: "#A9A9AF",
    accent: "#8FA6FF",
    red: "#FF6B6B",
    gold: "#F5C451",
    line: "#212124",
    note: "OLED : pixels éteints, contraste maximal, reflets nuls.",
  },
  {
    key: "blanc-absolu",
    label: "Blanc absolu",
    family: "Extrêmes",
    mode: "light",
    sibling: "noir-absolu",
    source: ENGRAM,
    bg: "#FFFFFF",
    surface: "#FAFAFB",
    surface2: "#F1F1F3",
    ink: "#0A0A0B",
    muted: "#56565E",
    accent: "#2F4BD8",
    red: "#C22B2B",
    gold: "#8A6300",
    line: "#E4E4E8",
    note: "Écran clair, papier net : aucune teinte ajoutée.",
  },

  /* ---------------------------------------------------------------- */
  /* Famille « Atelier » : teintes douces, peu saturées, jamais         */
  /* pastel au point de perdre le contraste (le test AA tranche).       */
  /* ---------------------------------------------------------------- */
  {
    key: "rose-poudre",
    label: "Rose poudré",
    family: "Atelier",
    mode: "light",
    sibling: "rose-nuit",
    source: ENGRAM,
    bg: "#FDF6F8",
    surface: "#FFFFFF",
    surface2: "#F7E9EE",
    ink: "#2B1F23",
    muted: "#6E5A61",
    accent: "#A63D5F",
    red: "#B3261E",
    gold: "#8A6300",
    line: "#EEDCE2",
    note: "Rose de poudre : chaud, sans bonbon.",
  },
  {
    key: "rose-nuit",
    label: "Rose nuit",
    family: "Atelier",
    mode: "dark",
    sibling: "rose-poudre",
    source: ENGRAM,
    bg: "#171013",
    surface: "#211A1E",
    surface2: "#2B2227",
    ink: "#F6EDF0",
    muted: "#C3AFB7",
    accent: "#F291B0",
    red: "#FF7A85",
    gold: "#EFC26A",
    line: "#332830",
    note: "Le même rose, la nuit : encre claire, accents poudrés.",
  },
  {
    key: "lilas",
    label: "Lilas",
    family: "Atelier",
    mode: "light",
    sibling: "lilas-nuit",
    source: ENGRAM,
    bg: "#F8F5FD",
    surface: "#FFFFFF",
    surface2: "#EFE8FA",
    ink: "#241E33",
    muted: "#615A75",
    accent: "#6743B8",
    red: "#B3261E",
    gold: "#8A6300",
    line: "#E4DBF4",
    note: "Violet doux, pour les longues sessions du soir.",
  },
  {
    key: "lilas-nuit",
    label: "Lilas nuit",
    family: "Atelier",
    mode: "dark",
    sibling: "lilas",
    source: ENGRAM,
    bg: "#131120",
    surface: "#1C1930",
    surface2: "#262240",
    ink: "#EEEBF9",
    muted: "#B7B0D2",
    accent: "#B39DFF",
    red: "#FF7A85",
    gold: "#EFC26A",
    line: "#302B4A",
    note: "Violet profond, accents lumineux.",
  },
  {
    key: "peche",
    label: "Pêche",
    family: "Atelier",
    mode: "light",
    source: ENGRAM,
    bg: "#FFF7F1",
    surface: "#FFFFFF",
    surface2: "#FCEBDF",
    ink: "#2E2119",
    muted: "#75604F",
    accent: "#B4571F",
    red: "#B3261E",
    gold: "#8A5B00",
    line: "#F1DCCB",
    note: "Abricot doux : chaleureux sans dorer le texte.",
  },
  {
    key: "sauge",
    label: "Sauge",
    family: "Atelier",
    mode: "light",
    source: ENGRAM,
    bg: "#F5F8F4",
    surface: "#FFFFFF",
    surface2: "#E7EFE5",
    ink: "#1E2A20",
    muted: "#586B5B",
    accent: "#3F6B4E",
    red: "#A32B22",
    gold: "#7A5A00",
    line: "#DCE7DA",
    note: "Vert végétal désaturé, très calme en lecture longue.",
  },
  {
    key: "menthe",
    label: "Menthe",
    family: "Atelier",
    mode: "light",
    source: ENGRAM,
    bg: "#F1FAF6",
    surface: "#FFFFFF",
    surface2: "#DFF3EA",
    ink: "#162A23",
    muted: "#4F6E63",
    accent: "#1F7A63",
    red: "#A32B22",
    gold: "#7A5A00",
    line: "#D3EADF",
    note: "Vert d’eau : frais, lisible, sans acidité.",
  },
  {
    key: "argile",
    label: "Argile",
    family: "Atelier",
    mode: "light",
    source: ENGRAM,
    bg: "#F9F4EE",
    surface: "#FFFFFF",
    surface2: "#F0E5D8",
    ink: "#2C231B",
    muted: "#6E5F4F",
    accent: "#8A4A25",
    red: "#A32B22",
    gold: "#7A5A00",
    line: "#E9DACA",
    note: "Terre cuite : papier chaud, encre brune.",
  },
  {
    key: "acier",
    label: "Acier",
    family: "Atelier",
    mode: "dark",
    source: ENGRAM,
    bg: "#0E1417",
    surface: "#161E22",
    surface2: "#1F282D",
    ink: "#E9EFF2",
    muted: "#A4B4BC",
    accent: "#63A8CC",
    red: "#FF7A85",
    gold: "#E0BE73",
    line: "#243136",
    note: "Bleu-gris industriel : net, sans reflet.",
  },
];

export const DEFAULT_PALETTE_KEY = "papier";

export function paletteByKey(key: string): PaletteSeed {
  return PALETTES.find((palette) => palette.key === key) ?? PALETTES[0];
}

/* ------------------------------------------------------------------ */
/* Dérivation des jetons                                               */
/* ------------------------------------------------------------------ */

export interface ThemeTokens {
  bg: string;
  bgOutside: string;
  surface: string;
  surface2: string;
  line: string;
  lineStrong: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentInk: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  highlight: string;
  canvasDot: string;
  mode: PaletteMode;
  /** jetons décalés pour atteindre AA, avec le ratio obtenu */
  adjustments: { token: string; from: string; to: string; ratio: number }[];
}

/** Mélange linéaire en sRGB : suffisant pour des fonds, sans dérive de teinte. */
const mix = mixHex;

export function mixHex(a: string, b: string, weight: number): string {
  const ca = parseHex(a)!;
  const cb = parseHex(b)!;
  const t = Math.min(1, Math.max(0, weight));
  return toHex({
    r: Math.round(ca.r + (cb.r - ca.r) * t),
    g: Math.round(ca.g + (cb.g - ca.g) * t),
    b: Math.round(ca.b + (cb.b - ca.b) * t),
  });
}

/** Éclaircit ou assombrit pour atteindre un contraste, en gardant la teinte. */
function pull(
  color: string,
  against: string,
  target: number,
  mode: PaletteMode,
): { color: string; adjusted: boolean } {
  const direction = mode === "light" ? -1 : 1;
  return ensureContrast(color, against, target, direction);
}

/**
 * Le surlignage est un fond : c’est le texte posé dessus qui doit tenir.
 * On éclaircit donc vers le blanc (clair) ou vers le papier (sombre) jusqu’à
 * 4,5:1 avec l’encre, et jamais au-delà : la couleur reste reconnaissable.
 */
function fitHighlight(
  base: string,
  ink: string,
  bg: string,
  mode: PaletteMode,
): string {
  const target = mode === "light" ? "#FFFFFF" : bg;
  let candidate = base;
  for (let step = 0; step <= 16; step += 1) {
    candidate = mix(base, target, step * 0.06);
    if (contrastRatio(ink, candidate) >= 4.5) return candidate;
  }
  return candidate;
}

function shade(hex: string, delta: number): string {
  const hsl = rgbToHsl(parseHex(hex)!);
  return toHex(hslToRgb({ ...hsl, l: Math.min(100, Math.max(0, hsl.l + delta)) }));
}

/**
 * Construit l’ensemble des jetons d’une palette.
 * Ordre des contraintes : lisibilité du texte d’abord, esthétique ensuite.
 */
export function buildTheme(seed: PaletteSeed): ThemeTokens {
  const mode = seed.mode;
  const adjustments: ThemeTokens["adjustments"] = [];
  const adjust = (token: string, from: string, to: string, ratio: number) => {
    if (from.toUpperCase() !== to.toUpperCase()) {
      adjustments.push({ token, from, to, ratio: Math.round(ratio * 100) / 100 });
    }
    return to;
  };

  const bg = seed.bg;
  const surface = seed.surface;

  /* Texte courant : 7:1 visé (AAA), 4,5:1 minimum sur les deux fonds. */
  const inkStep = pull(seed.ink, bg, 7, mode);
  const inkOnSurface = pull(inkStep.color, surface, 4.5, mode);
  const ink = adjust(
    "ink",
    seed.ink,
    inkOnSurface.color,
    contrastRatio(inkOnSurface.color, surface),
  );

  const mutedStep = pull(seed.muted, bg, 4.5, mode);
  const mutedOnSurface = pull(mutedStep.color, surface, 4.5, mode);
  const muted = adjust(
    "muted",
    seed.muted,
    mutedOnSurface.color,
    contrastRatio(mutedOnSurface.color, surface),
  );

  /* Accent : 4,5:1 sur les deux fonds, sans perdre la teinte d’origine. */
  const accentStep = pull(seed.accent, bg, 4.5, mode);
  const accentOnSurface = pull(accentStep.color, surface, 4.5, mode);
  const accent = adjust(
    "accent",
    seed.accent,
    accentOnSurface.color,
    contrastRatio(accentOnSurface.color, surface),
  );

  /* Fond doux : teinte de l’accent, très proche du papier. */
  const hsl = rgbToHsl(parseHex(accent)!);
  const softHsl =
    mode === "light"
      ? { h: hsl.h, s: Math.min(hsl.s, 48), l: Math.max(90, 96 - hsl.s * 0.1) }
      : { h: hsl.h, s: Math.min(hsl.s, 34), l: 21 };
  const accentSoft = toHex(hslToRgb(softHsl));
  const inkOnSoft = pull(accent, accentSoft, 4.5, mode);
  const accentInk = adjust(
    "accentInk",
    accent,
    inkOnSoft.color,
    contrastRatio(inkOnSoft.color, accentSoft),
  );

  const onAccent = bestTextOn(accent);

  /* Lignes : jamais décoratives seules, elles doivent se voir (1,2:1). */
  const lineBase = seed.line ?? mix(ink, bg, mode === "light" ? 0.18 : 0.26);
  const lineStrong = mix(ink, bg, mode === "light" ? 0.34 : 0.44);

  const dangerBase = seed.red ?? (mode === "light" ? "#B3261E" : "#F2B8B5");
  const danger = adjust(
    "danger",
    dangerBase,
    pull(dangerBase, bg, 4.5, mode).color,
    contrastRatio(pull(dangerBase, bg, 4.5, mode).color, bg),
  );
  const dangerSoft =
    mode === "light" ? mix(danger, bg, 0.12) : mix(danger, bg, 0.2);

  const highlightBase = seed.gold ?? (mode === "light" ? "#F6E3A1" : "#E0AF68");
  const highlight = fitHighlight(highlightBase, ink, bg, mode);

  const surface2 = seed.surface2 ?? mix(surface, ink, mode === "light" ? 0.05 : 0.08);
  const bgOutside = mode === "light" ? shade(bg, -3) : shade(bg, -2.5);
  const canvasDot = mix(ink, bg, mode === "light" ? 0.22 : 0.3);

  return {
    bg,
    bgOutside,
    surface: surface.toUpperCase(),
    surface2,
    line: lineBase,
    lineStrong,
    ink,
    muted,
    accent,
    accentSoft,
    accentInk,
    onAccent,
    danger,
    dangerSoft,
    highlight,
    canvasDot,
    mode,
    adjustments,
  };
}

/** Variables CSS correspondantes, prêtes pour `<html style>` ou un aperçu. */
export function themeVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--bg": tokens.bg,
    "--bg-outside": tokens.bgOutside,
    "--surface": tokens.surface,
    "--surface-2": tokens.surface2,
    "--line": tokens.line,
    "--line-strong": tokens.lineStrong,
    "--ink": tokens.ink,
    "--muted": tokens.muted,
    "--accent": tokens.accent,
    "--accent-soft": tokens.accentSoft,
    "--accent-ink": tokens.accentInk,
    "--on-accent": tokens.onAccent,
    "--danger": tokens.danger,
    "--danger-soft": tokens.dangerSoft,
    "--highlight": tokens.highlight,
    "--canvas-dot": tokens.canvasDot,
  };
}

const cache = new Map<string, ThemeTokens>();

export function tokensFor(key: string): ThemeTokens {
  const palette = paletteByKey(key);
  const hit = cache.get(palette.key);
  if (hit) return hit;
  const tokens = buildTheme(palette);
  cache.set(palette.key, tokens);
  return tokens;
}

/** Palette jumelle (bascule clair ↔ sombre sur le même univers). */
export function siblingOf(key: string, mode: PaletteMode): string {
  const current = paletteByKey(key);
  if (current.sibling) {
    const sibling = paletteByKey(current.sibling);
    if (sibling.mode === mode) return sibling.key;
  }
  const sameFamily = PALETTES.filter(
    (palette) => palette.family === current.family && palette.mode === mode,
  );
  if (sameFamily[0]) return sameFamily[0].key;
  const anyMode = PALETTES.filter((palette) => palette.mode === mode);
  return (anyMode[0] ?? PALETTES[0]).key;
}

export const PALETTE_FAMILIES = Array.from(
  new Set(PALETTES.map((palette) => palette.family)),
);
