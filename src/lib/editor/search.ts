/**
 * Rechercher dans la note — et remplacer.
 *
 * La recherche ne connaît plus l’éditeur : elle travaille sur **le texte** et
 * rend des intervalles. L’adaptateur décide ensuite comment les montrer et les
 * remplacer. C’est ce qui rend cette partie testable sans navigateur, et ce qui
 * la rendra vraie même si l’éditeur change encore.
 *
 * Les occurrences ne traversent pas deux blocs : une note est une suite de
 * blocs, et chercher « fin du » à cheval sur deux paragraphes n’aurait pas de
 * sens à l’écran.
 */

export interface Match {
  from: number;
  to: number;
}

/** Toutes les occurrences d’une chaîne, dans l’ordre du document. */
export function findMatches(text: string, query: string): Match[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const haystack = text.toLowerCase();
  const matches: Match[] = [];

  let at = haystack.indexOf(needle);
  while (at !== -1) {
    matches.push({ from: at, to: at + needle.length });
    at = haystack.indexOf(needle, at + needle.length);
  }
  return matches;
}

/** L’occurrence suivante (ou précédente), en boucle. */
export function stepMatch(matches: Match[], active: number, direction: 1 | -1): number {
  if (matches.length === 0) return -1;
  const next = active + direction;
  if (next < 0) return matches.length - 1;
  if (next >= matches.length) return 0;
  return next;
}

/**
 * Remplacements d’un coup.
 *
 * On rend le texte final **et** le nombre de remplacements : l’appelant n’a
 * pas à recalculer, et l’écran peut dire « 7 remplacements » au lieu de laisser
 * croire que rien ne s’est passé quand la casse ne correspondait pas.
 */
export function replaceAll(text: string, query: string, replacement: string): { text: string; count: number } {
  const matches = findMatches(text, query);
  if (matches.length === 0) return { text, count: 0 };

  let result = "";
  let cursor = 0;
  for (const match of matches) {
    result += text.slice(cursor, match.from) + replacement;
    cursor = match.to;
  }
  result += text.slice(cursor);
  return { text: result, count: matches.length };
}
