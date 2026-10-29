import type { Block } from "@/types";

/**
 * Le contrat de l’éditeur — et rien d’autre.
 *
 * Tout le produit (barre de mise en forme, palette, pupitre, fiche, registre de
 * commandes) parle à cette interface. Aucun de ces fichiers ne connaît Quill :
 * le jour où la bibliothèque change, seul l’adaptateur change. C’était déjà
 * l’intention avec l’ancien éditeur ; c’est maintenant une frontière réelle,
 * tenue par un seul fichier (`lib/editor/quill/adapt.ts`).
 */

export type BlockTarget = "p" | "h1" | "h2" | "h3" | "quote" | "rule";

export type MarkName =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "highlight"
  | "link"
  | "superscript"
  | "subscript";

export type Align = "left" | "center" | "right";

/** L’état d’un bloc, tel que la barre d’outils doit le montrer. */
export interface BlockAttrs {
  id: string | null;
  kind: BlockTarget;
  bullet: boolean;
  ordered: boolean;
  task: boolean;
  checked: boolean;
  indent: number;
  align: Align;
  marked: boolean;
}

export const EMPTY_ATTRS: BlockAttrs = {
  id: null,
  kind: "p",
  bullet: false,
  ordered: false,
  task: false,
  checked: false,
  indent: 0,
  align: "left",
  marked: false,
};

/* ------------------------------------------------------------------ */
/* Casse d’un passage                                                  */
/* ------------------------------------------------------------------ */

export type CaseMode = "upper" | "lower" | "sentence" | "capitalize";

export const CASE_MODES: { mode: CaseMode; label: string; hint: string }[] = [
  { mode: "upper", label: "MAJUSCULES", hint: "Aa → AA" },
  { mode: "lower", label: "minuscules", hint: "AA → aa" },
  { mode: "sentence", label: "Capitale en tête de phrase", hint: "aa → Aa" },
  { mode: "capitalize", label: "Capitale à chaque mot", hint: "aa bb → Aa Bb" },
];

/** La transformation, pure : elle ne connaît ni éditeur ni navigateur. */
export function applyCase(value: string, mode: CaseMode): string {
  switch (mode) {
    case "upper":
      return value.toUpperCase();
    case "lower":
      return value.toLowerCase();
    case "sentence":
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    case "capitalize":
      return value.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase());
  }
}

/* ------------------------------------------------------------------ */
/* L’éditeur                                                           */
/* ------------------------------------------------------------------ */

export interface EditorHost {
  /** prêt à recevoir des ordres (l’instance existe) */
  readonly isReady: boolean;

  focus(): void;
  /** place le curseur au premier ou au dernier caractère */
  focusAt(where: "start" | "end"): void;

  /* --- sélection ---------------------------------------------------- */
  hasSelection(): boolean;
  selectedText(): string;
  /** bornes absolues de la sélection, en décalages de texte */
  selectionOffsets(): { from: number; to: number };
  selectRange(from: number, to: number): void;

  /* --- marques ------------------------------------------------------ */
  isMarkActive(mark: MarkName): boolean;
  toggleMark(mark: MarkName): void;
  /** `null` retire le surlignage */
  highlight(color: string | null): void;
  /** la couleur du texte au curseur, `null` si c’est la couleur du thème */
  currentColor(): string | null;
  /** `null` remet le texte dans la couleur du thème */
  setColor(color: string | null): void;
  /** `null` retire le lien */
  setLink(href: string | null): void;
  currentHref(): string | undefined;
  clearMarks(): void;

  /* --- blocs -------------------------------------------------------- */
  attrs(): BlockAttrs;
  setAttrs(attrs: Partial<BlockAttrs>): boolean;
  turnInto(target: BlockTarget): boolean;
  toggleMeta(name: "bullet" | "ordered"): boolean;
  toggleQuote(): boolean;
  toggleTask(): boolean;
  toggleChecked(): boolean;
  changeIndent(delta: number): boolean;
  setAlign(align: Align): boolean;
  clearFormatting(): boolean;
  moveBlock(direction: -1 | 1): boolean;
  duplicateBlock(): boolean;
  deleteBlock(): boolean;
  insertRule(): boolean;

  /* --- tableaux ------------------------------------------------------ */
  /** insère un tableau vide de `rows` × `cols` au curseur */
  insertTable(rows: number, cols: number): boolean;
  /** le curseur est-il dans une cellule ? */
  inTable(): boolean;
  /** un geste de tableau, sans paramètre : les rangées et colonnes se comptent
   *  depuis la cellule où se trouve le curseur */
  tableCommand(
    action:
      | "rowAbove"
      | "rowBelow"
      | "columnLeft"
      | "columnRight"
      | "deleteRow"
      | "deleteColumn"
      | "deleteTable",
  ): boolean;
  /** coupe le bloc au curseur et applique des attributs au nouveau bloc */
  splitBlock(patch?: Partial<BlockAttrs>): boolean;
  toggleCheckedById(blockId: string): boolean;
  blockIdAtCursor(): string | null;

  /* --- texte -------------------------------------------------------- */
  insertText(text: string): void;
  /** le texte du bloc où se trouve le curseur, sans mise en forme */
  blockText(): string;
  changeCase(mode: CaseMode): boolean;
  words(): number;
  text(): string;
  blocks(): Block[];
  setBlocks(blocks: Block[]): void;

  /* --- recherche ---------------------------------------------------- */
  replaceAll(query: string, replacement: string): number;
  replaceOne(match: { from: number; to: number }, replacement: string): void;

  /* --- historique --------------------------------------------------- */
  undo(): void;
  redo(): void;
}
