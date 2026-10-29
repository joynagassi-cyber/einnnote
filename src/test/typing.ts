import { act } from "@testing-library/react";
import { editingEngine } from "@/lib/editor/quill/bridge";

/**
 * Écrire dans la note, comme le ferait le clavier.
 *
 * jsdom n’édite pas un `contenteditable` : une frappe simulée n’atteindrait
 * jamais le moteur. On écrit donc **par l’API de l’éditeur**, à la position du
 * curseur — c’est exactement ce que fait la barre de mise en forme en
 * production, et ça déclenche les mêmes événements (`text-change`,
 * `selection-change`) que la frappe réelle.
 */
export function typeInNote(text: string): void {
  const quill = editingEngine();
  if (!quill) throw new Error("L’éditeur n’est pas monté.");
  const range = quill.getSelection() ?? {
    index: Math.max(0, quill.getLength() - 1),
    length: 0,
  };
  act(() => {
    if (range.length) quill.deleteText(range.index, range.length, "api");
    quill.insertText(range.index, text, {}, "api");
    quill.setSelection(range.index + text.length, 0, "api");
  });
}

/** Placer le curseur à la fin du document, sans passer par le DOM. */
export function caretAtEndOfNote(): void {
  const quill = editingEngine();
  if (!quill) throw new Error("L’éditeur n’est pas monté.");
  act(() => {
    quill.setSelection(Math.max(0, quill.getLength() - 1), 0, "api");
  });
}

/** Sélectionner un passage, comme le ferait un glissement de souris. */
export function selectInNote(from: number, to: number): void {
  const quill = editingEngine();
  if (!quill) throw new Error("L’éditeur n’est pas monté.");
  act(() => {
    quill.setSelection(from, Math.max(0, to - from), "api");
  });
}

/** Le nombre de caractères du document, hors saut de ligne final. */
export function noteLength(): number {
  const quill = editingEngine();
  if (!quill) throw new Error("L’éditeur n’est pas monté.");
  return quill.getLength() - 1;
}
