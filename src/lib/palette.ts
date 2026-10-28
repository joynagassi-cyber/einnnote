import { deriveAccent, hslToRgb, parseHex, rgbToHsl, toHex, type Hsl, type Rgb } from "@/lib/accent";
import type { PaletteMode } from "@/lib/themes";

/**
 * **Couleurs tirées du fond.**
 *
 * Quand une image est posée derrière l’interface, le thème ne peut plus être
 * choisi à l’aveugle : un accent bleu sur une forêt brune, c’est une faute de
 * goût visible à chaque bouton. On lit donc l’image et on en tire **trois**
 * couleurs — un accent, un second ton, une teinte sombre pour le voile — puis
 * on les corrige jusqu’à ce que le texte reste lisible.
 *
 * ### Pourquoi pas `colorthief` ni `node-vibrant`
 *
 * Les deux ont été regardés, pas supposés :
 *
 * | Paquet | Version | Ce qu’il impose ici |
 * |---|---|---|
 * | `colorthief` | 3.5.0 | il lui faut une `<img>` **et** un `<canvas>` : il fait donc exactement ce qu’on fait déjà, en ajoutant une dépendance et en nous privant du test unitaire (pas de canvas en jsdom) |
 * | `node-vibrant` | 4.0.4 | il traîne `@vibrant/image-node` et `@types/node` côté navigateur ; ses cinq « swatches » imposent **sa** notion de Vibrant/Muted, pas notre exigence WCAG |
 *
 * On garde donc le canvas **48 × 48** (2 304 échantillons, une lecture d’image
 * instantanée) et un algorithme écrit ici : pur, testable sans navigateur, et
 * dont chaque étape se justifie par une contrainte du produit (lisibilité,
 * nombre de teintes, voile).
 *
 * ### Ce que le module promet
 *
 * 1. **Trois couleurs, jamais zéro** : une image grise donne quand même un
 *    accent (le gris), une teinte sombre et une secondaire — sans `NaN`.
 * 2. **Un accent qui passe AA** : il est corrigé par `deriveAccent`, donc il est
 *    mesuré contre le verre réel, pas contre du blanc théorique.
 * 3. **Un texte de bouton qui passe AA** : noir ou blanc, choisi au ratio, 4,5
 *    minimum garanti (l’un des deux atteint toujours ~4,58 au pire cas).
 * 4. **Déterministe** : mêmes pixels, mêmes couleurs. Un fond ne « scintille »
 *    pas d’un rendu à l’autre.
 */

export type OnAccent = "#FFFFFF" | "#000000";

export interface WallColors {
  /** l’accent, corrigé pour rester lisible sur le verre */
  accent: string;
  /** fond teinté de l’accent (badges, sélections) */
  accentSoft: string;
  /** encre sur `accentSoft` */
  accentInk: string;
  /** second ton, décalé d’au moins 60° de teinte quand l’image le permet */
  secondary: string;
  /** teinte sombre : c’est elle qui colore le voile des cartes (thème sombre) */
  deep: string;
  /** couleur moyenne réelle de l’image : le voile d’un thème clair */
  tone: string;
  /** texte posé sur l’accent — noir ou blanc, au ratio */
  onAccent: OnAccent;
  /** contraste mesuré accent / fond */
  contrast: number;
  /** contraste mesuré du texte du bouton */
  onAccentContrast: number;
  /** part de l’image que l’accent représente, 0–1 (confiance du choix) */
  confidence: number;
}

/** Couleur de repli quand aucune image n’est chargée : le gris de la palette. */
export const FALLBACK_DEEP = "#22201C";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Luminance relative WCAG d’une couleur RVB (0–1). */
function luminanceOf({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const x = value / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Écart entre deux teintes, en degrés (0–180). */
export function hueDistance(a: number, b: number): number {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

/**
 * Poids d’un pixel dans le vote.
 *
 * Le vote doit répondre à une question simple : **de quelle couleur est cette
 * image ?** Il y a donc trois facteurs, et deux pièges :
 *
 * 1. **la surface prime** — c’est l’erreur qui a produit les accents rouges :
 *    pondérer surtout par la saturation fait gagner une petite tache vive
 *    (un reflet, un néon) contre un ciel entier ;
 * 2. la saturation **oriente** sans décider : elle donne +65 % au maximum ;
 * 3. les extrêmes de luminosité comptent moins — un ciel presque blanc et une
 *    ombre presque noire portent peu de couleur — mais jamais zéro, sinon les
 *    images pastel (fleurs, sel) n’auraient plus de teinte du tout.
 */
export function pixelWeight(rgb: Rgb): number {
  const { s, l } = rgbToHsl(rgb);
  const saturation = s / 100;
  const midness = clamp(1 - Math.abs(l / 100 - 0.5) * 1.3, 0.15, 1);
  return (0.35 + 0.65 * saturation) * Math.sqrt(midness);
}

/**
 * Teinte sombre et franche, utilisée pour le voile.
 *
 * On prend la moyenne pondérée des pixels les plus sombres de l’image (le bas
 * de l’histogramme de luminosité), puis on la ramène sous 22 % de luminosité :
 * un voile plus clair laisserait le texte flotter, un voile noir tuerait
 * l’image.
 */
export function deepTone(samples: { rgb: Rgb; weight: number }[]): string {
  if (samples.length === 0) return FALLBACK_DEEP;
  const sorted = [...samples].sort((a, b) => rgbToHsl(a.rgb).l - rgbToHsl(b.rgb).l);
  const cut = Math.max(1, Math.round(sorted.length * 0.35));
  const darkest = sorted.slice(0, cut);
  const total = darkest.reduce((sum, sample) => sum + Math.max(0.001, sample.weight), 0);
  const mean = darkest.reduce(
    (acc, sample) => ({
      r: acc.r + (sample.rgb.r * Math.max(0.001, sample.weight)) / total,
      g: acc.g + (sample.rgb.g * Math.max(0.001, sample.weight)) / total,
      b: acc.b + (sample.rgb.b * Math.max(0.001, sample.weight)) / total,
    }),
    { r: 0, g: 0, b: 0 },
  );
  const hsl = rgbToHsl(mean);
  let tone = hslToRgb({
    h: hsl.h,
    s: clamp(hsl.s, 8, 68),
    l: Math.min(hsl.l, 22),
  });

  /* La luminosité HSL n’est pas la luminance perçue : un ambre à 22 % de
     luminosité HSL renvoie encore 0,06 de luminance, trop clair pour un voile.
     On corrige donc sur la grandeur mesurée, pas sur celle qu’on croit. */
  for (let pass = 0; pass < 12 && luminanceOf(tone) > DEEP_LUMINANCE; pass += 1) {
    tone = { r: tone.r * 0.9, g: tone.g * 0.9, b: tone.b * 0.9 };
  }
  return toHex(tone);
}

/** Luminance maximale d’un voile : au-delà, le texte flotte sur l’image. */
export const DEEP_LUMINANCE = 0.045;

/**
 * Devine le format quand l’appelant ne le dit pas.
 *
 * C’est la ceinture **et** les bretelles : la panne du 28 octobre venait d’un
 * flux RVBA lu comme du RVB. Un pixel RVBA a presque toujours son octet alpha
 * à 255 ; si c’est le cas pour la grande majorité des pixels et que la longueur
 * est un multiple de 4, c’est du RVBA. On ne devine jamais entre deux formats
 * plausibles sans un signal aussi net.
 */
export function detectChannels(pixels: ArrayLike<number>): 3 | 4 {
  if (pixels.length % 4 !== 0) return 3;
  const count = pixels.length / 4;
  let opaque = 0;
  const step = Math.max(1, Math.floor(count / 512));
  let sampled = 0;
  for (let index = 0; index < count; index += step) {
    if (pixels[index * 4 + 3] >= 250) opaque += 1;
    sampled += 1;
  }
  return opaque / Math.max(1, sampled) > 0.9 ? 4 : 3;
}

export interface ExtractOptions {
  /** clair ou sombre : l’accent doit être corrigé pour ce mode */
  mode: PaletteMode;
  /** couleur réelle du verre, sur laquelle l’accent sera posé */
  background: string;
  /** nombre de cases du histogramme de teintes (24 → 15° par case) */
  bins?: number;
  /**
   * Nombre de canaux par pixel : **3 (RVB) ou 4 (RVBA)**.
   *
   * Ce paramètre a coûté un vrai défaut : `canvas.getImageData()` renvoie du
   * RVBA, et l’extracteur lisait des triplets. L’octet alpha était donc pris
   * pour un canal de couleur, ce qui produisait des accents rouges/violets
   * sans rapport avec l’image — « l’aurore boréale donne du rouge ». Les deux
   * formats sont désormais acceptés, et `sampleImage` normalise en RVB.
   */
  channels?: 3 | 4;
}

interface Bin {
  hue: number;
  /** surface relative de la teinte (poids cumulés) */
  weight: number;
  /** saturation moyenne de la teinte dans cette case */
  saturation: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Score d’une teinte : **la surface d’abord, la couleur ensuite**.
 *
 * `area^0.8` donne l’avantage à ce qui occupe l’image ; `sat^0.9` laisse une
 * région franche battre *de peu* une zone délavée — jamais la renverser. Les
 * deux exposants sont réglés par deux cas mesurés : un ciel à 78 % contre une
 * tache à 22 % doit donner le ciel (`palette.test.ts`), et un parterre de
 * fleurs sur fond crème doit donner des fleurs (photographies du dépôt).
 */
function binScore(bin: Bin, total: number): number {
  const area = total > 0 ? bin.weight / total : 0;
  if (area < MIN_AREA) return 0;
  return area ** 0.8 * Math.max(0.05, bin.saturation) ** 0.9;
}

/** Sous cette part de l’image, une teinte est un détail, pas une couleur. */
const MIN_AREA = 0.03;

/**
 * Rayon de la famille chromatique de l’image, en degrés.
 *
 * 60° : assez large pour garder un dégradé (bleu → turquoise), assez étroit
 * pour exclure un soleil jaune dans un décor bleu.
 */
const HUE_FAMILY = 60;

/**
 * Extrait les trois couleurs d’un flux de pixels RVB (48 × 48 = 2 304 triplets).
 *
 * Le vote se fait par **cases de teinte** plutôt que par couleur exacte : une
 * photographie n’a presque jamais deux pixels identiques, et une quantification
 * par couleur exacte renverrait les 224 teintes du fichier, pas les couleurs
 * perçues.
 */
export function extractColors(
  pixels: ArrayLike<number>,
  options: ExtractOptions,
): WallColors {
  const stride = options.channels ?? detectChannels(pixels);
  const bins = options.bins ?? 24;
  const size = 360 / bins;
  const histogram = new Map<number, Bin>();
  const samples: { rgb: Rgb; weight: number }[] = [];

  for (let index = 0; index + stride - 1 < pixels.length; index += stride) {
    /* Un pixel entièrement transparent ne porte aucune couleur : le compter,
       c’est compter du noir (les SVG ont des zones vides). */
    if (stride === 4 && pixels[index + 3] < 8) continue;
    const rgb = { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] };
    if (!Number.isFinite(rgb.r) || !Number.isFinite(rgb.g) || !Number.isFinite(rgb.b)) {
      continue;
    }
    samples.push({ rgb, weight: Math.max(0.05, pixelWeight(rgb)) });
    const hsl = rgbToHsl(rgb);
    /* Un gris n’a pas de teinte : il n’entre pas dans le vote des teintes (il
       est déjà pris en compte par la teinte sombre). */
    if (hsl.s < 8) continue;
    const weight = pixelWeight(rgb);
    if (weight <= 0) continue;

    const key = Math.floor(hsl.h / size) % bins;
    const bin = histogram.get(key) ?? {
      hue: hsl.h,
      weight: 0,
      saturation: 0,
      r: 0,
      g: 0,
      b: 0,
    };
    bin.weight += weight;
    bin.saturation += (hsl.s / 100) * weight;
    bin.r += rgb.r * weight;
    bin.g += rgb.g * weight;
    bin.b += rgb.b * weight;
    histogram.set(key, bin);
  }

  const totalWeight = [...histogram.values()].reduce((sum, bin) => sum + bin.weight, 0);
  /* La saturation devient une moyenne avant le classement. */
  for (const bin of histogram.values()) {
    bin.saturation = bin.weight > 0 ? bin.saturation / bin.weight : 0;
  }
  /*
   * **La famille avant le détail.**
   *
   * Un décor d’hiver bleu pâle contient un soleil jaune : sans contrainte, le
   * jaune gagne (il est saturé, le reste est délavé) et l’accent ne ressemble
   * plus à l’image. On calcule donc la teinte dominante par moyenne circulaire
   * des surfaces, puis on **restreint le vote à sa famille** (± 60°). La
   * saturation ne départage plus que dans cette famille — elle choisit la
   * nuance, pas le sujet.
   */
  let sumX = 0;
  let sumY = 0;
  for (const bin of histogram.values()) {
    const angle = (bin.hue * Math.PI) / 180;
    sumX += Math.cos(angle) * bin.weight;
    sumY += Math.sin(angle) * bin.weight;
  }
  const dominantHue = ((Math.atan2(sumY, sumX) * 180) / Math.PI + 360) % 360;
  const family = [...histogram.values()].filter(
    (bin) => hueDistance(bin.hue, dominantHue) <= HUE_FAMILY,
  );
  const pool = family.length > 0 ? family : [...histogram.values()];
  const ranked = pool.sort(
    (a, b) => binScore(b, totalWeight) - binScore(a, totalWeight),
  );
  /* La secondaire, elle, doit sortir de la famille : c’est le principe même
     d’un second ton. On la cherche donc dans **toutes** les cases. */
  const rankedAll = [...histogram.values()].sort(
    (a, b) => binScore(b, totalWeight) - binScore(a, totalWeight),
  );

  /* Aucune couleur franche (photo en noir et blanc, capture d’écran grise) :
     on retombe sur la moyenne réelle, désaturée mais lisible. */
  if (ranked.length === 0) {
    const colours: Rgb[] = [];
    for (let index = 0; index + stride - 1 < pixels.length; index += stride) {
      if (stride === 4 && pixels[index + 3] < 8) continue;
      const rgb = { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] };
      if (Number.isFinite(rgb.r) && Number.isFinite(rgb.g) && Number.isFinite(rgb.b)) {
        colours.push(rgb);
      }
    }
    const mean = colours.length
      ? toHex({
          r: colours.reduce((sum, rgb) => sum + rgb.r, 0) / colours.length,
          g: colours.reduce((sum, rgb) => sum + rgb.g, 0) / colours.length,
          b: colours.reduce((sum, rgb) => sum + rgb.b, 0) / colours.length,
        })
      : FALLBACK_DEEP;
    const derived = deriveAccent(mean, options.mode, options.background);
    const onAccent = pickOnAccent(derived.palette.accent);
    return {
      accent: derived.palette.accent,
      accentSoft: derived.palette.accentSoft,
      accentInk: derived.palette.accentInk,
      secondary: derived.palette.accent,
      deep: deepTone(samples),
      tone: meanTone(samples),
      onAccent: onAccent.color,
      contrast: derived.onBackground,
      onAccentContrast: onAccent.contrast,
      confidence: 0,
    };
  }

  const best = ranked[0];
  const bestHue = rgbToHsl({
    r: best.r / best.weight,
    g: best.g / best.weight,
    b: best.b / best.weight,
  }).h;
  const bestColor = toHex({
    r: best.r / best.weight,
    g: best.g / best.weight,
    b: best.b / best.weight,
  });

  /* La secondaire doit être **une autre** couleur : à moins de 60° d’écart,
     deux teintes se lisent comme une seule. Si l’image n’offre rien d’autre,
     on la fabrique par rotation — c’est une décision, pas un mensonge : le
     champ `confidence` dit que l’image n’avait pas de second ton. */
  const distant = rankedAll.find((bin) => hueDistance(bin.hue, bestHue) >= 60);
  const secondaryColor = distant
    ? toHex({
        r: distant.r / distant.weight,
        g: distant.g / distant.weight,
        b: distant.b / distant.weight,
      })
    : rotate(bestColor, 42);

  const derived = deriveAccent(
    signature(bestColor, options.mode),
    options.mode,
    options.background,
  );
  const onAccent = pickOnAccent(derived.palette.accent);

  return {
    accent: derived.palette.accent,
    accentSoft: derived.palette.accentSoft,
    accentInk: derived.palette.accentInk,
    secondary: deriveAccent(
      signature(secondaryColor, options.mode),
      options.mode,
      options.background,
    ).palette.accent,
    deep: deepTone(samples),
    tone: meanTone(samples),
    onAccent: onAccent.color,
    contrast: derived.onBackground,
    onAccentContrast: onAccent.contrast,
    confidence: totalWeight > 0 ? Math.min(1, best.weight / totalWeight) : 0,
  };
}

/**
 * Couleur moyenne réelle des pixels — sans pondération.
 *
 * Elle ne sert pas à choisir l’accent (elle serait grise), mais de voile pour
 * les thèmes clairs : un voile sombre sur du papier clair tue le contraste,
 * alors qu’un voile de la couleur de l’image teinte sans assombrir.
 */
export function meanTone(samples: { rgb: Rgb; weight: number }[]): string {
  if (samples.length === 0) return FALLBACK_DEEP;
  const sum = samples.reduce(
    (acc, sample) => ({ r: acc.r + sample.rgb.r, g: acc.g + sample.rgb.g, b: acc.b + sample.rgb.b }),
    { r: 0, g: 0, b: 0 },
  );
  return toHex({ r: sum.r / samples.length, g: sum.g / samples.length, b: sum.b / samples.length });
}

/**
 * **Signature chromatique** : la couleur lue, rendue présentable.
 *
 * Une photographie réelle donne presque toujours une couleur **délavée** :
 * moyenne d’un ciel et d’une eau, elle tourne au gris-bleu. La poser telle
 * quelle comme accent donne une interface terne, où l’on ne voit pas que la
 * couleur vient de l’image. On garde donc la **teinte** (l’information qui
 * vient de l’image) et on relève saturation et luminosité dans une bande
 * tenable — puis `deriveAccent` corrige le contraste contre le verre réel.
 *
 * Ce n’est pas un mensonge sur l’image : c’est le même bleu, affirmé.
 */
export function signature(hex: string, mode: PaletteMode): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  return toHex(
    hslToRgb({
      h: hsl.h,
      s: clamp(Math.max(hsl.s * 1.5, 42), 24, 78),
      l:
        mode === "dark"
          ? clamp(Math.max(hsl.l, 52), 46, 66)
          : clamp(Math.min(hsl.l, 46), 30, 48),
    }),
  );
}

/** Rotation de teinte : sert de second ton quand l’image n’en propose pas. */
export function rotate(hex: string, degrees: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const hsl: Hsl = rgbToHsl(rgb);
  return toHex(
    hslToRgb({ h: hsl.h + degrees, s: clamp(hsl.s, 30, 80), l: clamp(hsl.l, 34, 62) }),
  );
}

/* ------------------------------------------------------------------ */
/* Texte des boutons                                                   */
/* ------------------------------------------------------------------ */

const LINEAR = (value: number) => {
  const x = value / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const rgb = parseHex(hex) ?? { r: 0, g: 0, b: 0 };
  return 0.2126 * LINEAR(rgb.r) + 0.7152 * LINEAR(rgb.g) + 0.0722 * LINEAR(rgb.b);
}

/** Ratio de contraste WCAG 2.1 (1 → 21). */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a) + 0.05, luminance(b) + 0.05];
  return x > y ? x / y : y / x;
}

/**
 * Noir ou blanc, au meilleur ratio.
 *
 * Théorème utile : pour **toute** couleur, l’un des deux atteint au moins
 * 4,58:1 (le pire cas est le gris de luminance ≈ 0,18). Le seuil de 4,5:1 du
 * brief est donc toujours tenable — on mesure quand même, parce qu’un jour une
 * couleur semi-transparente arrivera et que ce jour-là il faudra le savoir.
 */
export function pickOnAccent(background: string): { color: OnAccent; contrast: number } {
  const white = contrast(background, "#FFFFFF");
  const black = contrast(background, "#000000");
  return white >= black
    ? { color: "#FFFFFF", contrast: white }
    : { color: "#000000", contrast: black };
}

/** Seuil WCAG pour du texte normal. */
export const AA = 4.5;

/* ------------------------------------------------------------------ */
/* Variables CSS                                                       */
/* ------------------------------------------------------------------ */

/**
 * Les variables shadcn/ui, écrites **comme des couleurs**.
 *
 * C’est un changement de format assumé : shadcn stocke d’abord des triplets
 * HSL (« 174 82% 27% ») pour pouvoir injecter une opacité avec
 * `hsl(var(--primary) / .4)`. Or ce format est **incompatible** avec une
 * transition de couleur (`@property … syntax: '<color>'`) et avec
 * `color-mix()`. On stocke donc une couleur réelle, et Tailwind fabrique
 * l’opacité avec `color-mix(… calc(<alpha-value> * 100%), transparent)` —
 * même résultat, variables animables.
 */
export function shadcnVars(
  colors: WallColors,
  mode: PaletteMode = "dark",
): Record<string, string> {
  return {
    "--primary": colors.accent,
    "--primary-foreground": colors.onAccent,
    "--ring": colors.accent,
    "--accent": colors.accent,
    "--accent-foreground": colors.onAccent,
    "--accent-soft": colors.accentSoft,
    "--accent-ink": colors.accentInk,
    "--on-accent": colors.onAccent,
    "--accent-2": colors.secondary,
    /* Le voile suit le mode : sombre sur du verre sombre, couleur de l’image
       sur du papier clair. Un voile sombre sur du papier clair ferait tomber
       le texte secondaire sous AA (mesuré, voir `glass.test.ts`). */
    "--tint": mode === "dark" ? colors.deep : colors.tone,
  };
}

/**
 * Voile de repli, sans extraction : on ne connaît que la couleur moyenne du
 * fond (déclarée dans `walls.ts`). Il sert le temps que le canvas réponde — et
 * définitivement si l’image ne peut pas être lue (hors ligne, format refusé).
 */
export function veilFromTone(tone: string, mode: PaletteMode): string {
  if (mode === "light") return tone;
  const rgb = parseHex(tone);
  if (!rgb) return FALLBACK_DEEP;
  let darkened = { ...rgb };
  for (let pass = 0; pass < 12 && luminanceOf(darkened) > DEEP_LUMINANCE; pass += 1) {
    darkened = { r: darkened.r * 0.9, g: darkened.g * 0.9, b: darkened.b * 0.9 };
  }
  return toHex(darkened);
}

/** Le voile réellement appliqué aux cartes, pour le test de contraste. */
export function veilTint(colors: WallColors, mode: PaletteMode): string {
  return mode === "dark" ? colors.deep : colors.tone;
}

/** Applique les couleurs au document. Une seule porte d’écriture. */
export function applyWallColors(
  root: HTMLElement,
  colors: WallColors,
  mode: PaletteMode = "dark",
): void {
  for (const [name, value] of Object.entries(shadcnVars(colors, mode))) {
    root.style.setProperty(name, value);
  }
  root.dataset.wallAccent = colors.accent;
}
