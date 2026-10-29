import type { BlockTarget } from "@/lib/editor/host";

/**
 * L’état de la sélection, vu par les surfaces de commande.
 *
 * Ce type a quitté `EditorToolbar` pour vivre ici : la barre de mise en forme,
 * le pupitre et la palette décrivent **le même instant**, et un composant ne
 * doit pas être la source d’un type partagé. `EditorToolbar` le ré-exporte pour
 * que ses appelants n’aient rien à changer.
 */

export type Align = "left" | "center" | "right";

export interface EditorSnapshot {
  kind: BlockTarget;
  marks: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    code: boolean;
    highlight: boolean;
    link: boolean;
    superscript: boolean;
    subscript: boolean;
  };
  bullet: boolean;
  ordered: boolean;
  task: boolean;
  checked: boolean;
  marked: boolean;
  indent: number;
  align: Align;
  words: number;
}

/** Un instant vide : utile pour les tests et le premier rendu. */
export const EMPTY_SNAPSHOT: EditorSnapshot = {
  kind: "p",
  marks: {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    code: false,
    highlight: false,
    link: false,
    superscript: false,
    subscript: false,
  },
  bullet: false,
  ordered: false,
  task: false,
  checked: false,
  marked: false,
  indent: 0,
  align: "left",
  words: 0,
};
