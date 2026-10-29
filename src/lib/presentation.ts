import { mixHex, type ThemeTokens } from "@/lib/themes";
import type {
  BorderStyle,
  Density,
  ElevationStyle,
  PaperTint,
  Personalization,
  RadiusStyle,
} from "@/types";

/**
 * **Présentation : la seule source de vérité des réglages d'apparence.**
 *
 * Le défaut réparé ici est celui qu'on ne voit pas en lisant l'écran : les
 * teintes de papier et le contraste des bordures étaient écrits en CSS
 * (`:root[data-paper="ivory"] { --bg: … }`), alors que la palette du thème pose
 * `--bg` en **style en ligne** sur `<html>`. Le style en ligne gagne : les deux
 * réglages ne faisaient donc rien du tout. Un réglage qui ne change rien est
 * pire qu'un réglage absent — il fait croire à un bug de l'application.
 *
 * D'où la règle, unique : *les jetons de couleur se calculent en JavaScript,
 * une seule fois, à partir de la palette et des réglages ; le CSS ne peint
 * que ce qu'on lui donne.*
 *
 * Deux conséquences :
 *
 * 1. les teintes de papier ne sont plus quatre palettes figées mais un
 *    **déplacement de teinte** appliqué à la palette choisie — sable, ivoire,
 *    gris et brume fonctionnent donc avec les vingt-trois thèmes, en clair
 *    comme en sombre ;
 * 2. les contrôles de l'écran sont décrits dans `PRESENTATION`, pas écrits un
 *    par un : ajouter un réglage = une entrée ici + une règle CSS. Aucun écran
 *    ne connaît la liste.
 */

/* ------------------------------------------------------------------ */
/* Contrôles — décrits, pas codés en dur dans la page                  */
/* ------------------------------------------------------------------ */

export type ControlId = keyof Personalization;

interface BaseControl {
  id: ControlId;
  label: string;
  hint?: string;
}

export interface ChoiceControl extends BaseControl {
  kind: "choice";
  options: { value: string; label: string; hint?: string; swatch?: string }[];
}

export interface SliderControl extends BaseControl {
  kind: "slider";
  min: number;
  max: number;
  step: number;
  unit: string;
}

export type Control = ChoiceControl | SliderControl;

export interface Section {
  id: string;
  title: string;
  hint: string;
  controls: Control[];
}

const DENSITY: Density[] = ["compact", "regular", "airy"];
const RADIUS: RadiusStyle[] = ["sharp", "regular", "soft"];
const BORDERS: BorderStyle[] = ["subtle", "regular", "strong"];
const ELEVATION: ElevationStyle[] = ["flat", "regular", "raised"];

/**
 * Les sections de l'écran, dans l'ordre où un choix se prend.
 *
 * L'ordre n'est pas arbitraire : on choisit d'abord la **forme** (ce qui
 * change le plus la lecture), puis le **papier**, puis la **mesure** — la
 * longueur de ligne et l'interligne, les deux réglages qui décident du confort
 * de lecture (Bear et Obsidian les mettent en avant pour la même raison).
 */
export const PRESENTATION: Section[] = [
  {
    id: "formes",
    title: "Formes",
    hint: "Ce qui change le plus la lecture : l’espacement, les angles, les traits.",
    controls: [
      {
        id: "density",
        kind: "choice",
        label: "Densité",
        hint: "Marges de l’écran et des cartes",
        options: [
          { value: DENSITY[0], label: "Compacte", hint: "Plus de contenu par écran" },
          { value: DENSITY[1], label: "Standard" },
          { value: DENSITY[2], label: "Aérée", hint: "Pour de longues sessions" },
        ],
      },
      {
        id: "radius",
        kind: "choice",
        label: "Angles",
        hint: "Arrondi des champs, des cartes et des feuilles",
        options: [
          { value: RADIUS[0], label: "Nets" },
          { value: RADIUS[1], label: "Doux" },
          { value: RADIUS[2], label: "Très ronds" },
        ],
      },
      {
        id: "borders",
        kind: "choice",
        label: "Traits",
        hint: "Contraste des séparations",
        options: [
          { value: BORDERS[0], label: "Discrets" },
          { value: BORDERS[1], label: "Normaux" },
          { value: BORDERS[2], label: "Marqués" },
        ],
      },
      {
        id: "elevation",
        kind: "choice",
        label: "Relief",
        hint: "Ombre portée des cartes et des feuilles",
        options: [
          { value: ELEVATION[0], label: "Plat" },
          { value: ELEVATION[1], label: "Standard" },
          { value: ELEVATION[2], label: "Surélevé" },
        ],
      },
    ],
  },
  {
    id: "papier",
    title: "Papier",
    hint: "La teinte du fond, appliquée à la palette choisie — elle ne la remplace pas.",
    controls: [
      {
        id: "paper",
        kind: "choice",
        label: "Teinte du papier",
        options: [
          { value: "sand", label: "Sable", swatch: "#F6F1E7" },
          { value: "ivory", label: "Ivoire", swatch: "#FBF8F0" },
          { value: "grey", label: "Gris", swatch: "#F2F2F0" },
          { value: "mist", label: "Brume", swatch: "#EFF2F1" },
        ],
      },
    ],
  },
  {
    id: "mesure",
    title: "Mesure",
    hint: "Deux réglages décident du confort de lecture : la longueur de ligne et l’interligne.",
    controls: [
      {
        id: "noteLeading",
        kind: "slider",
        label: "Interligne des notes",
        hint: "Entre 1,3 et 1,6 fois la taille du texte selon la police",
        min: 20,
        max: 38,
        step: 1,
        unit: " px",
      },
      {
        id: "readingWidth",
        kind: "slider",
        label: "Largeur de lecture",
        hint: "En bureau : au-delà de 80 caractères par ligne, l’œil perd le début",
        min: 520,
        max: 980,
        step: 20,
        unit: " px",
      },
      {
        id: "canvasStrength",
        kind: "slider",
        label: "Force du canevas",
        hint: "Opacité du pointillé, des lignes ou du quadrillage",
        min: 0,
        max: 100,
        step: 5,
        unit: " %",
      },
    ],
  },
];

export const CONTROL_IDS: ControlId[] = PRESENTATION.flatMap((section) =>
  section.controls.map((control) => control.id),
);

export function controlById(id: ControlId): Control | undefined {
  for (const section of PRESENTATION) {
    const found = section.controls.find((control) => control.id === id);
    if (found) return found;
  }
  return undefined;
}

/** La valeur telle qu'elle s'écrit à droite du curseur. */
export function formatValue(control: Control, value: string | number): string {
  if (control.kind === "slider") return `${value}${control.unit}`;
  const option = control.options.find((entry) => entry.value === String(value));
  return option?.label ?? String(value);
}

/* ------------------------------------------------------------------ */
/* Teintes de papier                                                   */
/* ------------------------------------------------------------------ */

/**
 * Une teinte = **une direction**, pas une palette.
 *
 * `warm` tire le papier vers l'ivoire, `cool` vers la brume, `neutral` vers le
 * gris. La force diffère en sombre (moins de mélange : à faible luminosité, un
 * déplacement trop fort casse le contraste).
 */
const TINT: Record<PaperTint, { light: string; dark: string; weight: number }> = {
  sand: { light: "#F6F1E7", dark: "#211F1A", weight: 0 },
  ivory: { light: "#FBF8F0", dark: "#221F18", weight: 0.55 },
  grey: { light: "#F2F2F0", dark: "#1E1E1F", weight: 0.7 },
  mist: { light: "#EFF2F1", dark: "#1A2020", weight: 0.7 },
};

/**
 * Applique la teinte à des jetons réels.
 *
 * Seuls les jetons de **fond** bougent — jamais l'encre ni l'accent : la
 * lisibilité a été calculée pour la palette, on ne la rejoue pas. Les surfaces
 * suivent le fond pour rester cohérentes.
 */
export function tintTokens(tokens: ThemeTokens, paper: PaperTint): ThemeTokens {
  const tint = TINT[paper] ?? TINT.sand;
  if (tint.weight === 0) return tokens;
  const anchor = tokens.mode === "dark" ? tint.dark : tint.light;
  const weight = tokens.mode === "dark" ? tint.weight * 0.75 : tint.weight;
  return {
    ...tokens,
    bg: mixHex(tokens.bg, anchor, weight),
    bgOutside: mixHex(tokens.bgOutside, anchor, weight * 0.9),
    surface: mixHex(tokens.surface, anchor, weight * 0.5),
    surface2: mixHex(tokens.surface2, anchor, weight * 0.6),
    line: mixHex(tokens.line, anchor, weight * 0.25),
    canvasDot: mixHex(tokens.canvasDot, anchor, weight * 0.35),
  };
}

/**
 * Contraste des traits.
 *
 * `subtle` rapproche le trait de la surface (il s'efface), `strong` l'égale au
 * trait fort de la palette, `regular` ne touche à rien.
 */
export function borderTokens(tokens: ThemeTokens, borders: BorderStyle): ThemeTokens {
  if (borders === "subtle") {
    return { ...tokens, line: mixHex(tokens.line, tokens.surface, 0.55) };
  }
  if (borders === "strong") {
    return { ...tokens, line: tokens.lineStrong };
  }
  return tokens;
}

/** Les deux transformations, dans l'ordre où elles s'appliquent. */
export function presentTokens(tokens: ThemeTokens, ui: Personalization): ThemeTokens {
  return borderTokens(tintTokens(tokens, ui.paper), ui.borders);
}

/* ------------------------------------------------------------------ */
/* Application au DOM                                                  */
/* ------------------------------------------------------------------ */

/**
 * Attributs `data-*` et variables continues, dérivés du registre.
 *
 * Les attributs restent utiles : ils donnent des points d'accroche CSS
 * (`data-density`, `data-radius`, `data-elevation`) sans obliger le CSS à
 * connaître les valeurs possibles.
 */
export function presentationAttributes(ui: Personalization): Record<string, string> {
  return {
    density: ui.density,
    radius: ui.radius,
    borders: ui.borders,
    elevation: ui.elevation,
    paper: ui.paper,
  };
}

export function presentationVars(ui: Personalization): Record<string, string> {
  return {
    "--note-leading": `${ui.noteLeading}px`,
    "--reading-width": `${ui.readingWidth}px`,
    "--canvas-strength": String(ui.canvasStrength / 100),
  };
}

/**
 * Un réglage qui n'aurait aucun effet se voit **ici** : chaque contrôle du
 * registre doit produire soit un attribut, soit une variable. Un test le
 * vérifie, et c'est ce test qui empêche un futur contrôle décoratif.
 */
export function effectOf(id: ControlId, ui: Personalization): string | undefined {
  const attrs = presentationAttributes(ui);
  const vars = presentationVars(ui);
  if (id in attrs) return attrs[id];
  const varName = {
    noteLeading: "--note-leading",
    readingWidth: "--reading-width",
    canvasStrength: "--canvas-strength",
  }[id as "noteLeading" | "readingWidth" | "canvasStrength"];
  return varName ? vars[varName] : undefined;
}
