import type { ComponentType } from "react";
import type { EditorHost } from "@/lib/editor/host";
import {
  ArrowDown,
  ArrowUUpLeft,
  ArrowUp,
  ArrowCounterClockwise,
  CaretDoubleDown,
  CaretDoubleUp,
  Clock,
  Code,
  CopySimple,
  Eraser,
  Highlighter,
  IdentificationCard,
  LinkSimple,
  ArrowSquareOut,
  ListBullets,
  ListChecks,
  ListNumbers,
  MagnifyingGlass,
  Minus,
  NotePencil,
  Quotes,
  Sparkle,
  Square,
  SquaresFour,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextHOne,
  TextHThree,
  TextHTwo,
  TextIndent,
  TextItalic,
  TextOutdent,
  TextStrikethrough,
  TextSubscript,
  TextSuperscript,
  TextUnderline,
  Trash,
  BookOpen,
} from "@phosphor-icons/react";
import type { EditorSnapshot } from "@/lib/editor/snapshot";
import { CASE_MODES } from "@/lib/editor/host";
import { todayLabel } from "@/lib/editor/transform";
import { HIGHLIGHTS } from "@/lib/editor/highlights";

/**
 * **Le registre des commandes** — une seule liste, cinq surfaces.
 *
 * Le pupitre, la palette, la barre de sélection, la fiche et les raccourcis
 * lisent tous ce fichier. Une commande absente d’ici ne peut apparaître nulle
 * part : c’est la règle qui empêche les cinq surfaces de diverger à la troisième
 * évolution.
 *
 * Trois principes :
 *
 * 1. **Un identifiant stable, un libellé français.** L’identifiant ne change
 *    jamais (il est enregistré dans les préférences) ; le libellé peut être
 *    retouché sans casser une configuration.
 * 2. **Une commande indisponible est grisée, jamais absente.** `available`
 *    répond « ça s’applique ici ? » et `unavailable` explique pourquoi non.
 * 3. **Aucune commande ne touche au store.** Elles appellent les fonctions
 *    déjà testées de `lib/editor` ; le contexte fournit le reste.
 */

export type Moment = "texte" | "selection" | "liste" | "tableau" | "note";

export type CommandId = string;

export interface CommandContext {
  editor: EditorHost | null;
  snapshot: EditorSnapshot;
  toast: (message: string, tone?: "neutral" | "accent" | "danger") => void;
  /** ouvre « Chercher » dans la note */
  find: (mode?: "find" | "replace") => void;
  /** ouvre la fiche de la note */
  fiche: () => void;
  /** bascule le mode lecture */
  reading: () => void;
  /** ouvre le sélecteur de note pour écrire `[[Titre]]` */
  link: () => void;
  /** suit le lien de note où se trouve le curseur (chemin clavier) */
  openLinkAtCursor: () => void;
}

interface IconProps {
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}

export interface Command {
  id: CommandId;
  label: string;
  /** raccourci, ou précision courte affichée à droite */
  hint: string;
  group: string;
  moment: Moment;
  icon: ComponentType<IconProps>;
  run: (ctx: CommandContext) => void;
  /** faux → commande grisée ; absent → toujours disponible */
  available?: (snapshot: EditorSnapshot) => boolean;
  /** explication affichée quand `available` est faux */
  unavailable?: string;
  /** mots supplémentaires pour la recherche */
  keywords?: string[];
}

export const GROUPS = [
  "Modifier",
  "Blocs",
  "Listes",
  "Insérer",
  "Se déplacer",
  "Document",
] as const;

/* ------------------------------------------------------------------ */
/* Petites fabriques : moins de bruit dans la table                    */
/* ------------------------------------------------------------------ */

const withEditor =
  (action: (editor: EditorHost) => void) =>
  (ctx: CommandContext): void => {
    if (!ctx.editor) return;
    action(ctx.editor);
  };

const chain =
  (action: (editor: EditorHost) => void) =>
  (ctx: CommandContext): void => {
    if (!ctx.editor) return;
    action(ctx.editor);
    ctx.editor.focus();
  };

const HIGHLIGHT_COMMANDS: Command[] = HIGHLIGHTS.map((highlight) => ({
  id: `highlight-${highlight.label.toLowerCase()}`,
  label: `Surligner · ${highlight.label.toLowerCase()}`,
  hint: "Cinq teintes, pas plus",
  group: "Modifier",
  moment: "selection",
  icon: Highlighter,
  keywords: ["surligneur", "marqueur", "couleur"],
  run: chain((editor) =>
    editor.highlight(highlight.color),
  ),
}));

/* ------------------------------------------------------------------ */
/* Le registre                                                         */
/* ------------------------------------------------------------------ */

export const COMMANDS: Command[] = [
  /* ------------------------------------------------------------ Modifier */
  {
    id: "undo",
    label: "Annuler",
    hint: "Ctrl+Z",
    group: "Modifier",
    moment: "texte",
    icon: ArrowUUpLeft,
    run: chain((editor) => editor.undo()),
  },
  {
    id: "redo",
    label: "Rétablir",
    hint: "Ctrl+Maj+Z",
    group: "Modifier",
    moment: "texte",
    icon: ArrowCounterClockwise,
    run: chain((editor) => editor.redo()),
  },
  {
    id: "bold",
    label: "Mettre en gras",
    hint: "Ctrl+B",
    group: "Modifier",
    moment: "selection",
    icon: TextB,
    keywords: ["gras", "audace"],
    run: chain((editor) => editor.toggleMark("bold")),
  },
  {
    id: "italic",
    label: "Mettre en italique",
    hint: "Ctrl+I",
    group: "Modifier",
    moment: "selection",
    icon: TextItalic,
    keywords: ["penché"],
    run: chain((editor) => editor.toggleMark("italic")),
  },
  {
    id: "underline",
    label: "Souligner",
    hint: "Ctrl+U",
    group: "Modifier",
    moment: "selection",
    icon: TextUnderline,
    run: chain((editor) => editor.toggleMark("underline")),
  },
  {
    id: "strike",
    label: "Barrer",
    hint: "Ctrl+Maj+X",
    group: "Modifier",
    moment: "selection",
    icon: TextStrikethrough,
    keywords: ["barré", "rayé"],
    run: chain((editor) => editor.toggleMark("strike")),
  },
  {
    id: "code",
    label: "Code en ligne",
    hint: "Ctrl+E",
    group: "Modifier",
    moment: "selection",
    icon: Code,
    run: chain((editor) => editor.toggleMark("code")),
  },
  ...HIGHLIGHT_COMMANDS,
  {
    id: "unhighlight",
    label: "Retirer le surlignage",
    hint: "Texte nu",
    group: "Modifier",
    moment: "selection",
    icon: Eraser,
    available: (snapshot) => snapshot.marks.highlight,
    unavailable: "Aucun surlignage sous le curseur",
    run: chain((editor) => editor.highlight(null)),
  },
  {
    id: "superscript",
    label: "Exposant",
    hint: "x²",
    group: "Modifier",
    moment: "selection",
    icon: TextSuperscript,
    run: chain((editor) => editor.toggleMark("superscript")),
  },
  {
    id: "subscript",
    label: "Indice",
    hint: "x₂",
    group: "Modifier",
    moment: "selection",
    icon: TextSubscript,
    run: chain((editor) => editor.toggleMark("subscript")),
  },
  {
    id: "link",
    label: "Insérer un lien",
    hint: "Ctrl+K dans la barre",
    group: "Modifier",
    moment: "selection",
    icon: LinkSimple,
    keywords: ["url", "adresse"],
    run: (ctx) => {
      if (!ctx.editor) return;
      const editor = ctx.editor;
      const previous = editor.currentHref();
      const href = window.prompt("Adresse du lien", previous ?? "https://");
      if (href === null) return;
      editor.setLink(href.trim() === "" ? null : href.trim());
    },
  },
  {
    id: "clear",
    label: "Effacer la mise en forme",
    hint: "Texte nu, bloc nu",
    group: "Modifier",
    moment: "selection",
    icon: Eraser,
    keywords: ["nettoyer", "remettre à zéro"],
    run: withEditor((editor) => editor.clearFormatting()),
  },
  ...CASE_MODES.map<Command>((mode) => ({
    id: `case-${mode.mode}`,
    label: `Casse · ${mode.label}`,
    hint: mode.hint,
    group: "Modifier",
    moment: "selection",
    icon: TextB,
    keywords: ["majuscules", "minuscules", "capitale"],
    run: withEditor((editor) => editor.changeCase(mode.mode)),
  })),

  /* --------------------------------------------------------------- Blocs */
  {
    id: "paragraph",
    label: "Texte normal",
    hint: "Ctrl+Alt+0",
    group: "Blocs",
    moment: "texte",
    icon: TextAlignLeft,
    run: withEditor((editor) => editor.turnInto("p")),
  },
  {
    id: "h1",
    label: "Titre 1",
    hint: "Ctrl+Alt+1",
    group: "Blocs",
    moment: "texte",
    icon: TextHOne,
    keywords: ["entête", "section"],
    run: withEditor((editor) => editor.turnInto("h1")),
  },
  {
    id: "h2",
    label: "Titre 2",
    hint: "Ctrl+Alt+2",
    group: "Blocs",
    moment: "texte",
    icon: TextHTwo,
    keywords: ["entête", "sous-section"],
    run: withEditor((editor) => editor.turnInto("h2")),
  },
  {
    id: "h3",
    label: "Titre 3",
    hint: "Ctrl+Alt+3",
    group: "Blocs",
    moment: "texte",
    icon: TextHThree,
    keywords: ["entête", "détail"],
    run: withEditor((editor) => editor.turnInto("h3")),
  },
  {
    id: "quote",
    label: "Citation",
    hint: "Ctrl+Maj+9",
    group: "Blocs",
    moment: "texte",
    icon: Quotes,
    keywords: ["citation", "citer"],
    run: withEditor((editor) => editor.toggleQuote()),
  },
  {
    id: "rule",
    label: "Filet de séparation",
    hint: "Séparateur",
    group: "Blocs",
    moment: "texte",
    icon: Minus,
    run: withEditor((editor) => editor.turnInto("rule")),
  },
  {
    id: "align-left",
    label: "Aligner à gauche",
    hint: "Défaut",
    group: "Blocs",
    moment: "texte",
    icon: TextAlignLeft,
    run: withEditor((editor) => editor.setAlign("left")),
  },
  {
    id: "align-center",
    label: "Aligner au centre",
    hint: "",
    group: "Blocs",
    moment: "texte",
    icon: TextAlignCenter,
    run: withEditor((editor) => editor.setAlign("center")),
  },
  {
    id: "align-right",
    label: "Aligner à droite",
    hint: "",
    group: "Blocs",
    moment: "texte",
    icon: TextAlignRight,
    run: withEditor((editor) => editor.setAlign("right")),
  },
  {
    id: "marked",
    label: "Marquer le passage",
    hint: "Le retrouver à la relecture",
    group: "Blocs",
    moment: "texte",
    icon: NotePencil,
    keywords: ["signet", "marque"],
    run: withEditor((editor) => {
      const attrs = editor.attrs();
      editor.setAttrs({ marked: attrs.marked !== true });
    }),
  },
  {
    id: "duplicate-block",
    label: "Dupliquer le bloc",
    hint: "",
    group: "Blocs",
    moment: "texte",
    icon: CopySimple,
    run: withEditor((editor) => editor.duplicateBlock()),
  },
  {
    id: "delete-block",
    label: "Supprimer le bloc",
    hint: "",
    group: "Blocs",
    moment: "texte",
    icon: Trash,
    keywords: ["effacer", "paragraphe"],
    run: withEditor((editor) => editor.deleteBlock()),
  },

  /* -------------------------------------------------------------- Listes */
  {
    id: "bullet",
    label: "Liste à puces",
    hint: "Ctrl+Maj+8",
    group: "Listes",
    moment: "liste",
    icon: ListBullets,
    keywords: ["puces", "points"],
    run: withEditor((editor) => editor.toggleMeta("bullet")),
  },
  {
    id: "ordered",
    label: "Liste numérotée",
    hint: "Ctrl+Maj+7",
    group: "Listes",
    moment: "liste",
    icon: ListNumbers,
    keywords: ["numéros", "1."],
    run: withEditor((editor) => editor.toggleMeta("ordered")),
  },
  {
    id: "task",
    label: "Case à cocher",
    hint: "À faire",
    group: "Listes",
    moment: "liste",
    icon: ListChecks,
    keywords: ["coche", "checklist", "todo"],
    run: withEditor((editor) => editor.toggleTask()),
  },
  {
    id: "checked",
    label: "Cocher / décocher",
    hint: "",
    group: "Listes",
    moment: "liste",
    icon: Square,
    available: (snapshot) => snapshot.task,
    unavailable: "Le bloc courant n’est pas une case à cocher",
    run: withEditor((editor) => editor.toggleChecked()),
  },
  {
    id: "indent",
    label: "Indenter",
    hint: "Tab",
    group: "Listes",
    moment: "liste",
    icon: TextIndent,
    available: (snapshot) => snapshot.indent < 3,
    unavailable: "Trois niveaux au maximum",
    run: withEditor((editor) => editor.changeIndent(1)),
  },
  {
    id: "outdent",
    label: "Désindenter",
    hint: "Maj+Tab",
    group: "Listes",
    moment: "liste",
    icon: TextOutdent,
    available: (snapshot) => snapshot.indent > 0,
    unavailable: "Le bloc est déjà au niveau zéro",
    run: withEditor((editor) => editor.changeIndent(-1)),
  },

  /* -------------------------------------------------------------- Insérer */
  {
    id: "date",
    label: "Insérer la date",
    hint: "Aujourd’hui",
    group: "Insérer",
    moment: "texte",
    icon: Sparkle,
    keywords: ["modèle", "date du jour"],
    run: (ctx) => {
      if (!ctx.editor) return;
      ctx.editor.insertText(todayLabel());
    },
  },
  {
    id: "note-link-open",
    label: "Ouvrir le lien sous le curseur",
    hint: "Accès clavier aux liens",
    group: "Se déplacer",
    moment: "texte",
    icon: ArrowSquareOut,
    keywords: ["lien", "note", "suivre", "wiki"],
    run: (ctx) => ctx.openLinkAtCursor(),
  },
  {
    id: "note-link",
    label: "Lier une note",
    hint: "[[Titre]]",
    group: "Insérer",
    moment: "texte",
    icon: LinkSimple,
    keywords: ["lien", "wiki", "renvoi", "rétro-lien"],
    run: (ctx) => ctx.link(),
  },
  {
    id: "time",
    label: "Insérer l’heure",
    hint: "Maintenant",
    group: "Insérer",
    moment: "texte",
    icon: Clock,
    keywords: ["modèle", "heure"],
    run: (ctx) => {
      if (!ctx.editor) return;
      const now = new Date();
      const label = `${`${now.getHours()}`.padStart(2, "0")}:${`${now.getMinutes()}`.padStart(2, "0")}`;
      ctx.editor.insertText(label);
    },
  },

  /* ---------------------------------------------------------- Se déplacer */
  {
    id: "move-up",
    label: "Monter le bloc",
    hint: "",
    group: "Se déplacer",
    moment: "texte",
    icon: ArrowUp,
    run: withEditor((editor) => editor.moveBlock(-1)),
  },
  {
    id: "move-down",
    label: "Descendre le bloc",
    hint: "",
    group: "Se déplacer",
    moment: "texte",
    icon: ArrowDown,
    run: withEditor((editor) => editor.moveBlock(1)),
  },
  {
    id: "start",
    label: "Aller au début",
    hint: "",
    group: "Se déplacer",
    moment: "note",
    icon: CaretDoubleUp,
    run: withEditor((editor) => editor.focusAt("start")),
  },
  {
    id: "end",
    label: "Aller à la fin",
    hint: "",
    group: "Se déplacer",
    moment: "note",
    icon: CaretDoubleDown,
    run: withEditor((editor) => editor.focusAt("end")),
  },

  /* ------------------------------------------------------------- Document */
  {
    id: "find",
    label: "Chercher dans la note",
    hint: "Ctrl+F",
    group: "Document",
    moment: "note",
    icon: MagnifyingGlass,
    keywords: ["rechercher"],
    run: (ctx) => ctx.find("find"),
  },
  {
    id: "replace",
    label: "Remplacer",
    hint: "",
    group: "Document",
    moment: "note",
    icon: SquaresFour,
    keywords: ["remplacer", "substituer"],
    run: (ctx) => ctx.find("replace"),
  },
  {
    id: "reading",
    label: "Mode lecture",
    hint: "Masque les barres",
    group: "Document",
    moment: "note",
    icon: BookOpen,
    keywords: ["lire", "lecture"],
    run: (ctx) => ctx.reading(),
  },
  {
    id: "fiche",
    label: "Cette note…",
    hint: "Vault, export, corbeille",
    group: "Document",
    moment: "note",
    icon: IdentificationCard,
    keywords: ["options", "menu", "propriétés"],
    run: (ctx) => ctx.fiche(),
  },
];

/* ------------------------------------------------------------------ */
/* Lecture du registre                                                 */
/* ------------------------------------------------------------------ */

const byId = new Map(COMMANDS.map((command) => [command.id, command]));

export function commandById(id: CommandId): Command | undefined {
  return byId.get(id);
}

/** Un identifiant inconnu (commande retirée) est ignoré, pas remplacé. */
export function knownIds(ids: CommandId[]): CommandId[] {
  return ids.filter((id) => byId.has(id));
}

/**
 * Recherche insensible aux accents et à la casse : taper « surlign » doit
 * trouver « Surligner », et « entete » doit trouver « Titre 1 » (mot-clé
 * « entête »). On compare des formes normalisées, jamais l’affichage.
 */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchCommands(needle: string, source: Command[] = COMMANDS): Command[] {
  const query = normalize(needle);
  if (!query) return source;
  const words = query.split(/\s+/);
  return source.filter((command) => {
    const haystack = normalize(
      [command.label, command.hint, command.group, ...(command.keywords ?? [])].join(" "),
    );
    return words.every((word) => haystack.includes(word));
  });
}

/** Le registre trié : les groupes dans l’ordre du produit, puis les libellés. */
export function sortedCommands(source: Command[] = COMMANDS): Command[] {
  const rank = new Map(GROUPS.map((group, index) => [group, index]));
  return [...source].sort((a, b) => {
    const left = rank.get(a.group as (typeof GROUPS)[number]) ?? GROUPS.length;
    const right = rank.get(b.group as (typeof GROUPS)[number]) ?? GROUPS.length;
    if (left !== right) return left - right;
    return a.label.localeCompare(b.label, "fr");
  });
}

/** Disponible dans l’instant présent ? (`available` absent = toujours) */
export function isAvailable(command: Command, snapshot: EditorSnapshot): boolean {
  return command.available ? command.available(snapshot) : true;
}
