/**
 * Presets d’accent : une seule source pour l’interface (pastilles, libellés)
 * et pour les tests de contraste. Les valeurs CSS vivent dans `index.css` ;
 * `src/lib/accents.test.ts` vérifie que les deux ne divergent pas.
 */

export interface AccentPreset {
  key: string;
  label: string;
  /** couleur d’action en thème clair et sombre */
  light: string;
  dark: string;
  softLight: string;
  softDark: string;
  inkLight: string;
  inkDark: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    key: "teal",
    label: "Teal",
    light: "#0F766E",
    dark: "#5EC8BD",
    softLight: "#D9EEEA",
    softDark: "#2D3A38",
    inkLight: "#0B5C56",
    inkDark: "#93E2D9",
  },
  {
    key: "indigo",
    label: "Indigo Gemini",
    light: "#4257D6",
    dark: "#A5B4FC",
    softLight: "#DEE3FB",
    softDark: "#242A47",
    inkLight: "#3B4CC0",
    inkDark: "#C7CFFC",
  },
  {
    key: "blue",
    label: "Bleu",
    light: "#1D4ED8",
    dark: "#7EA6FF",
    softLight: "#DCE6FA",
    softDark: "#22304D",
    inkLight: "#173A9C",
    inkDark: "#B9CCFF",
  },
  {
    key: "violet",
    label: "Violet",
    light: "#6D28D9",
    dark: "#B49CFF",
    softLight: "#E8E0FA",
    softDark: "#2C2547",
    inkLight: "#52209F",
    inkDark: "#D5C8FF",
  },
  {
    key: "green",
    label: "Vert",
    /* #15803D tombait à 4,45:1 sur le papier : sous le seuil AA. */
    light: "#14753A",
    dark: "#6FD08C",
    softLight: "#D5EDE0",
    softDark: "#1F3327",
    inkLight: "#106030",
    inkDark: "#A5E6B8",
  },
  {
    key: "terracotta",
    label: "Terracotta",
    /* #B4532A tombait à 4,43:1 sur le papier : sous le seuil AA. */
    light: "#A94B24",
    dark: "#E8946C",
    softLight: "#F6E2D5",
    softDark: "#3A2519",
    inkLight: "#8D3F1F",
    inkDark: "#F4B795",
  },
  {
    key: "plum",
    label: "Prune",
    light: "#86198F",
    dark: "#D68AE0",
    softLight: "#F3D8F5",
    softDark: "#35203A",
    inkLight: "#6B1372",
    inkDark: "#EEC0F3",
  },
  {
    key: "graphite",
    label: "Graphite",
    light: "#3F3F46",
    dark: "#C9C9D1",
    softLight: "#E8E8EA",
    softDark: "#302F33",
    inkLight: "#2B2B31",
    inkDark: "#E4E4EA",
  },
];

export function presetByKey(key: string): AccentPreset | undefined {
  return ACCENT_PRESETS.find((preset) => preset.key === key);
}
