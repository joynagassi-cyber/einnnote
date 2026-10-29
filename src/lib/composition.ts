import type { AppSettings, Personalization } from "@/types";
import { PRESENTATION, controlById, formatValue } from "@/lib/presentation";
import { paletteByKey, tokensFor } from "@/lib/themes";
import { ACCENT_PRESETS } from "@/lib/accents";
import { wallById } from "@/lib/walls";
import { DEFAULT_PERSONALIZATION } from "@/stores/useAppStore";

/**
 * **La composition de l’apparence, en couches.**
 *
 * Le défaut de l’ancien écran n’était pas visuel : il était mental. On y
 * présentait une liste plate (mode, 23 palettes, 6 signatures, 49 fonds, un
 * accent, des formes, une typographie), ce qui laissait croire que **le thème
 * est la décision** et que le reste s’y ajoute vaguement. En réalité un thème
 * n’est qu’un **socle** : il donne des jetons neutres, puis quatre couches
 * s’empilent par-dessus et peuvent encore tout déplacer.
 *
 * Ce module décrit cet empilement une fois pour toutes :
 *
 * ```
 * 1 · Palette   socle     → --bg, --surface, --ink, --muted, --accent
 * 2 · Fond      image     → teinte le verre et le voile (ne change pas les jetons)
 * 3 · Accent    couleur   → écrase l’accent du socle (image, preset ou libre)
 * 4 · Formes    géométrie  → rayons, densité, traits, relief (aucune couleur)
 * 5 · Texte     typographie → police, taille, interligne, largeur
 * ```
 *
 * Deux règles en découlent, et une seule fonction les rend vraies :
 *
 * - **rien n’est définitif** : chaque couche reste modifiable après coup ;
 * - **les couches ne se contredisent pas** : les formes ne touchent jamais aux
 *   couleurs, la typographie ne touche jamais aux formes. Un test le vérifie en
 *   changeant une couche et en constatant que les autres résumés ne bougent pas.
 */

export type LayerId = "palette" | "fond" | "accent" | "formes" | "texte";

/** Ce que fait une couche à la précédente. */
export type LayerAction =
  /** pose les jetons de base */
  | "socle"
  /** ajoute une image et une teinte par-dessus */
  | "superpose"
  /** remplace une couleur du socle */
  | "ecrase"
  /** ne touche qu’à la géométrie */
  | "geometrie"
  /** ne touche qu’au texte */
  | "typographie";

export interface LayerDef {
  id: LayerId;
  /** numéro d’empilement, de 1 (socle) à 5 */
  index: number;
  label: string;
  /** une phrase : ce que la couche décide */
  question: string;
  action: LayerAction;
  /** ce qu’elle déplace réellement, en jetons */
  tokens: string[];
  /** nombre de réglages qu’elle offre */
  controls: number;
}

export const LAYERS: LayerDef[] = [
  {
    id: "palette",
    index: 1,
    label: "Palette",
    question: "Le socle : papier, surfaces, encre,texte secondaire.",
    action: "socle",
    tokens: ["--bg", "--surface", "--ink", "--muted", "--accent"],
    controls: 23,
  },
  {
    id: "fond",
    index: 2,
    label: "Fond",
    question: "L’image derrière l’interface, et la teinte de son voile.",
    action: "superpose",
    tokens: ["--tint", "--wall-blur", "--wall-dim"],
    controls: 25,
  },
  {
    id: "accent",
    index: 3,
    label: "Accent",
    question: "La couleur d’action — et celle du texte posé dessus.",
    action: "ecrase",
    tokens: ["--accent", "--primary", "--ring", "--on-accent"],
    controls: 10,
  },
  {
    id: "formes",
    index: 4,
    label: "Formes",
    question: "Rayons, densité, traits, relief : la géométrie seule.",
    action: "geometrie",
    tokens: ["--r-card", "--pad-screen", "--line", "--elev-card"],
    controls: 4,
  },
  {
    id: "texte",
    index: 5,
    label: "Texte",
    question: "Police, taille, interligne, largeur de lecture.",
    action: "typographie",
    tokens: ["--font-note", "--note-size", "--note-leading", "--reading-width"],
    controls: 4,
  },
];

export function layerById(id: LayerId): LayerDef {
  const layer = LAYERS.find((entry) => entry.id === id);
  if (!layer) throw new Error(`couche inconnue : ${id}`);
  return layer;
}

/** État d’une couche : ce qu’elle vaut maintenant, en une ligne. */
export interface LayerState {
  id: LayerId;
  index: number;
  label: string;
  question: string;
  action: LayerAction;
  /** valeur actuelle, lisible (« Papier calme », « Tokyo », « du fond »…) */
  value: string;
  /** précision courte : ce qui rend la valeur vérifiable */
  detail: string;
  /** vrai si elle déplace quelque chose par rapport au socle */
  active: boolean;
}

const personalization = (settings: AppSettings): Personalization =>
  settings.personalization ?? DEFAULT_PERSONALIZATION;

/** Comment nommer un réglage de forme ou de mesure, sans le réécrire. */
function valueLabel(id: keyof Personalization, value: string | number): string {
  const control = controlById(id as never);
  if (!control) return String(value);
  return formatValue(control, value);
}

export function composeAppearance(settings: AppSettings): LayerState[] {
  const palette = paletteByKey(settings.paletteKey);
  const wall = settings.wallpaper ? wallById(settings.wallpaper) : undefined;
  const ui = personalization(settings);
  const preset = ACCENT_PRESETS.find((entry) => entry.key === settings.accent);

  const accentValue = settings.dynamicAccent && wall
    ? "Tiré du fond"
    : settings.accentMode === "custom" && settings.customAccent
      ? settings.customAccent.toUpperCase()
      : settings.accentMode === "preset"
        ? (preset?.label ?? settings.accent)
        : "Du thème";

  return [
    {
      id: "palette",
      index: 1,
      label: "Palette",
      question: layerById("palette").question,
      action: "socle",
      value: palette.label,
      detail: palette.mode === "dark" ? "sombre" : "clair",
      active: true,
    },
    {
      id: "fond",
      index: 2,
      label: "Fond",
      question: layerById("fond").question,
      action: "superpose",
      value: wall ? wall.label : "Aucun",
      detail: wall
        ? `voile ${Math.round(settings.wallDim)} % · flou ${Math.round(settings.wallBlur)} px`
        : "papier uni",
      active: Boolean(wall),
    },
    {
      id: "accent",
      index: 3,
      label: "Accent",
      question: layerById("accent").question,
      action: "ecrase",
      value: accentValue,
      detail: wall && settings.dynamicAccent
        ? "lu dans l’image, corrigé AA"
        : settings.accentMode === "theme"
          ? "celui de la palette"
          : "vérifié AA",
      active: Boolean(wall && settings.dynamicAccent) || settings.accentMode !== "theme",
    },
    {
      id: "formes",
      index: 4,
      label: "Formes",
      question: layerById("formes").question,
      action: "geometrie",
      value: [
        valueLabel("density", ui.density),
        valueLabel("radius", ui.radius),
        valueLabel("borders", ui.borders),
      ].join(" · "),
      detail: valueLabel("elevation", ui.elevation),
      active:
        ui.density !== DEFAULT_PERSONALIZATION.density ||
        ui.radius !== DEFAULT_PERSONALIZATION.radius ||
        ui.borders !== DEFAULT_PERSONALIZATION.borders ||
        ui.elevation !== DEFAULT_PERSONALIZATION.elevation,
    },
    {
      id: "texte",
      index: 5,
      label: "Texte",
      question: layerById("texte").question,
      action: "typographie",
      value: settings.font === "literata" ? "Literata" : "Inter",
      detail: `${settings.fontSize} px · interligne ${ui.noteLeading} px`,
      active:
        settings.font !== "literata" ||
        settings.fontSize !== 17 ||
        ui.noteLeading !== DEFAULT_PERSONALIZATION.noteLeading,
    },
  ];
}

/**
 * La recette, en une phrase : ce que l’écran affiche sous l’aperçu.
 * Elle sert à répondre d’un coup d’œil à « qu’est-ce qui est appliqué ? »,
 * sans ouvrir cinq sections.
 */
export function compositionLine(settings: AppSettings): string {
  const layers = composeAppearance(settings);
  return layers.map((layer) => layer.value).join(" · ");
}

/** Nombre de couches qui déplacent réellement quelque chose. */
export function activeLayers(settings: AppSettings): number {
  return composeAppearance(settings).filter((layer) => layer.active).length;
}

/** Nombre de réglages exposés par les sections Formes et Mesure. */
export const FORM_CONTROL_COUNT = PRESENTATION.reduce(
  (sum, section) => sum + section.controls.length,
  0,
);

/** Palette effective des jetons : utile à l’aperçu. */
export function previewTokens(settings: AppSettings) {
  return tokensFor(settings.paletteKey);
}
