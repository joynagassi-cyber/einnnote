/**
 * Ce qui reste des transformations de texte : la date du jour.
 *
 * La casse et le texte du bloc sont passés au contrat de l’éditeur
 * (`EditorHost.changeCase`, `EditorHost.blockText`) — une transformation qui
 * touche au document n’a pas à vivre dans un fichier qui ne connaît pas le
 * document.
 */

/** Date du jour, au format long français — jamais au format machine. */
export function todayLabel(now: Date = new Date()): string {
  return now.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
