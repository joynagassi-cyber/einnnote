/**
 * Le contrat Quill 2, écrit à la main.
 *
 * Quill 2.0.3 ne publie pas de types, et `@types/quill` décrit encore l’API 1
 * (`pasteHTML`, pas de `getSemanticHTML`). Installer ces types reviendrait à
 * faire décrire au compilateur une bibliothèque qui n’est pas là : on déclare
 * donc **ce qu’on utilise**, et rien de plus. Chaque ajout ici est un choix
 * conscient, pas une importation.
 */
declare module "quill" {
  export interface DeltaAttributes {
    [key: string]: unknown;
  }

  export interface DeltaOp {
    insert?: string | Record<string, unknown>;
    delete?: number;
    retain?: number | Record<string, unknown>;
    attributes?: DeltaAttributes;
  }

  export interface Delta {
    ops: DeltaOp[];
  }

  export interface Range {
    index: number;
    length: number;
  }

  export interface Bounds {
    left: number;
    top: number;
    height: number;
    width: number;
  }

  export interface QuillOptions {
    theme?: "snow" | "bubble" | "";
    modules?: Record<string, unknown>;
    formats?: string[];
    placeholder?: string;
    readOnly?: boolean;
    scrollingContainer?: string | HTMLElement;
    bounds?: string | HTMLElement;
    debug?: "error" | "warn" | "log" | false;
  }

  export type Source = "user" | "api" | "silent";

  export default class Quill {
    constructor(container: HTMLElement | string, options?: QuillOptions);

    root: HTMLElement;

    clipboard: {
      convert(input: { html?: string; text?: string }): Delta;
      dangerouslyPasteHTML(html: string, source?: Source): void;
      dangerouslyPasteHTML(index: number, html: string, source?: Source): void;
    };

    getContents(index?: number, length?: number): Delta;
    setContents(delta: Delta, source?: Source): Delta;
    updateContents(delta: Delta, source?: Source): Delta;
    getLength(): number;
    getText(index?: number, length?: number): string;
    getSemanticHTML(index?: number, length?: number): string;

    insertText(index: number, text: string, formats?: DeltaAttributes, source?: Source): void;
    deleteText(index: number, length: number, source?: Source): Delta;
    insertEmbed(index: number, type: string, value: unknown, source?: Source): void;

    format(name: string, value: unknown, source?: Source): void;
    formatLine(index: number, length: number, formats: DeltaAttributes, source?: Source): Delta;
    formatLine(index: number, length: number, name: string, value: unknown, source?: Source): Delta;
    formatText(index: number, length: number, formats: DeltaAttributes, source?: Source): Delta;
    formatText(index: number, length: number, name: string, value: unknown, source?: Source): Delta;
    getFormat(range?: Range): DeltaAttributes;
    getFormat(index: number, length?: number): DeltaAttributes;

    getSelection(focus?: boolean): Range | null;
    setSelection(index: number, length?: number, source?: Source): void;
    scrollSelectionIntoView(): void;
    getBounds(index: number, length?: number): Bounds;

    getLine(index: number): [unknown, number];
    getLines(index?: number, length?: number): unknown[];
    getIndex(blot: unknown): number;
    getLeaf(index: number): unknown;

    enable(enabled?: boolean): void;
    disable(): void;
    hasFocus(): boolean;
    focus(): void;
    blur(): void;
    setText(text: string, source?: Source): void;

    on(event: "text-change", handler: (delta: Delta, oldDelta: Delta, source: Source) => void): void;
    on(event: "selection-change", handler: (range: Range | null, old: Range | null, source: Source) => void): void;
    on(event: "editor-change", handler: (...args: unknown[]) => void): void;
    on(event: string, handler: (...args: never[]) => void): void;
    off(event: string, handler: (...args: never[]) => void): void;
    once(event: string, handler: (...args: never[]) => void): void;

    getModule(name: string): unknown;
  }

  /** Parchment vit dans le paquet `parchment`, réexporté par Quill. */
  export const Parchment: {
    Scope: { TYPE: number; LEVEL: number; ATTRIBUTE: number; BLOT: number; INLINE: number; BLOCK: number };
    Attributor: new (attrName: string, keyName: string, options: Record<string, unknown>) => unknown;
    ClassAttributor: new (attrName: string, keyName: string, options: Record<string, unknown>) => unknown;
    StyleAttributor: new (attrName: string, keyName: string, options: Record<string, unknown>) => unknown;
    Inline: new (...args: never[]) => unknown;
    BlockEmbed: new (...args: never[]) => unknown;
    register: (target: unknown, name?: string) => void;
  };

  export const Delta: new (ops?: DeltaOp[]) => Delta & {
    ops: DeltaOp[];
    insert(text: string, attributes?: DeltaAttributes): Delta;
  };

  export const Range: {
    transform(range: Range, delta: Delta): Range;
  };
}
