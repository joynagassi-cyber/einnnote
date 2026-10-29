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

/**
 * Sélectionner un passage, comme le ferait un glissement de souris.
 *
 * `source: "user"` reproduit un vrai déplacement du curseur — donc les
 * auditeurs `selection-change` se déclenchent, comme au clavier. C’est ce qu’il
 * faut pour vérifier un menu qui s’ouvre quand on revient dans un mot.
 */
export function selectInNote(
  from: number,
  to: number,
  source: "api" | "user" = "api",
): void {
  const quill = editingEngine();
  if (!quill) throw new Error("L’éditeur n’est pas monté.");
  act(() => {
    quill.setSelection(from, Math.max(0, to - from), source);
  });
}

/**
 * La position d’un texte dans le document, telle que la voit le moteur.
 *
 * On ne la calcule pas depuis le DOM : `textContent` colle les blocs les uns aux
 * autres, sans les sauts de ligne qui existent dans le document. Un curseur posé
 * à partir du DOM atterrirait une ou deux lignes plus haut.
 */
export function indexOfInNote(needle: string): number {
  const quill = editingEngine();
  if (!quill) throw new Error("L’éditeur n’est pas monté.");
  const index = quill.getText().indexOf(needle);
  if (index < 0) throw new Error(`« ${needle} » n’est pas dans la note.`);
  return index;
}

/** Le nombre de caractères du document, hors saut de ligne final. */
export function noteLength(): number {
  const quill = editingEngine();
  if (!quill) throw new Error("L’éditeur n’est pas monté.");
  return quill.getLength() - 1;
}
