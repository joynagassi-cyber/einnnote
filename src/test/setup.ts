import { webcrypto } from "node:crypto";
import { vi } from "vitest";

/* Polyfills minimalistes pour un environnement jsdom. */

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(window as unknown as Record<string, unknown>).ResizeObserver = Observer;
(window as unknown as Record<string, unknown>).IntersectionObserver = Observer;

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
/* ProseMirror mesure le DOM pour placer le curseur : jsdom ne fournit ni
   `getClientRects` sur les éléments et les ranges, ni de géométrie réelle. */
const emptyRect = () => ({
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
});
const rectList = () => {
  const rect = emptyRect();
  const list = [rect] as unknown as DOMRectList & { item: () => DOMRect };
  list.item = () => rect as unknown as DOMRect;
  return list;
};
if (!Element.prototype.getClientRects) {
  Element.prototype.getClientRects = () => rectList();
}
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => rectList();
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => emptyRect() as DOMRect;
}

/* jsdom ne sait ni positionner le curseur par coordonnées ni insérer du texte.
   ProseMirror (TipTap) utilise les deux : on fournit le minimum crédible. */
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

/**
 * `insertText` réel : user-event s’appuie dessus pour taper dans un
 * contentEditable. On insère du texte au niveau de la sélection courante ;
 * le MutationObserver de ProseMirror s’occupe de mettre le document à jour.
 */
document.execCommand = ((command: string, _ui?: boolean, value?: string) => {
  if (command !== "insertText" || typeof value !== "string") return true;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const text = document.createTextNode(value);
  range.insertNode(text);
  range.setStartAfter(text);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}) as typeof document.execCommand;

if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(async () => undefined) },
    configurable: true,
  });
}

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
}

/* React Flow (d3-drag) lit `event.view.document` ; les événements synthétiques
   de jsdom n’ont pas de `view`, ce qui lève une exception non capturée. On
   bloque le `mousedown` sur le canevas : le glisser n’est pas testé ici. */
document.addEventListener(
  "mousedown",
  (event) => {
    const target = event.target as Element | null;
    if (target?.closest?.(".react-flow")) event.stopPropagation();
  },
  true,
);
