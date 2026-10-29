import type Quill from "quill";

/**
 * Le pont de test — **et la seule porte de sortie** vers l’instance Quill.
 *
 * Personne dans le produit n’a besoin de l’instance brute : tout passe par le
 * contrat `EditorHost`. Mais un test qui doit *taper du texte* ne peut pas le
 * faire au clavier : jsdom n’édite pas un `contenteditable`, donc Quill ne
 * verrait jamais la frappe. Le pont permet au code de test d’écrire **par
 * l’API**, exactement comme le fait la barre d’outils en production.
 *
 * Il ne sert à rien d’autre, et il est remis à `null` au démontage.
 */

let engine: Quill | null = null;

export function registerEditingEngine(instance: Quill | null): void {
  engine = instance;
}

export function editingEngine(): Quill | null {
  return engine;
}
