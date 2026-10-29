/**
 * **Les liens de notes** — `[[Titre de la note]]`.
 *
 * Le choix de fond : un lien n’est **pas** un objet stocké. C’est du texte, et
 * une note qui le contient. Trois conséquences, toutes voulues :
 *
 * 1. **Rien à synchroniser** : renommer une note casse ses liens comme dans
 *    n’importe quel wiki, mais aucune table de jointure ne peut se désynchroniser
 *    du texte. Un lien mort est un lien mort *visible*, pas une ligne orpheline
 *    dans une base.
 * 2. **Export fidèle** : le Markdown sort avec `[[Titre]]` intact, donc les
 *    liens survivent au départ de l’application. Un lien qui ne s’exporte pas
 *    n’est pas un lien, c’est un bouton.
 * 3. **Zéro migration** : les notes déjà écrites n’ont pas bougé, et celles
 *    qu’on écrit demain n’auront pas besoin qu’on y touche.
 *
 * Ce fichier ne connaît ni l’éditeur ni React : il lit du texte et rend des
 * titres. Tout le reste (décoration, clic, rétro-liens) s’appuie dessus.
 */

/** `[[…]]` sur une seule ligne, sans crochet imbriqué. */
const LINK_PATTERN = /\[\[([^[\]\n]{1,160})\]\]/g;

export interface NoteRef {
  id: string;
  title: string;
}

/** La forme comparable d’un titre : accents gardés, casse et espaces non. */
export function normalizeTitle(title: string): string {
  return title.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Tous les titres cités dans un texte, sans doublon, dans l’ordre d’apparition. */
export function linksInText(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(LINK_PATTERN)) {
    const title = match[1].trim();
    if (!title) continue;
    const key = normalizeTitle(title);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(title);
  }
  return found;
}

/** La note visée par un titre, ou `undefined` si le lien est mort. */
export function resolveLink(title: string, notes: NoteRef[]): NoteRef | undefined {
  const key = normalizeTitle(title);
  return notes.find((note) => normalizeTitle(note.title) === key);
}

/** Le lien dont l’intervalle contient ce décalage, s’il y en a un. */
export function linkAt(text: string, offset: number): string | undefined {
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    if (offset >= start && offset <= start + match[0].length) {
      return match[1].trim() || undefined;
    }
  }
  return undefined;
}

export interface Backlink {
  /** la note qui cite */
  from: NoteRef;
  /** le passage cité, tronqué : on veut voir *pourquoi* on est cité */
  excerpt: string;
}

const EXCERPT = 120;

function excerptAround(text: string, title: string): string {
  const needle = `[[${title}]]`.toLowerCase();
  const at = text.toLowerCase().indexOf(needle);
  if (at < 0) return text.slice(0, EXCERPT).trim();
  const start = Math.max(0, at - 48);
  const end = Math.min(text.length, at + needle.length + 72);
  const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "… " : ""}${slice}${end < text.length ? " …" : ""}`;
}

/**
 * Qui cite cette note ?
 *
 * On passe les textes bruts, pas les blocs : un lien peut traverser deux
 * paragraphes d’une même note, et seul le texte complet de la note dit
 * vraiment qui la cite.
 */
export function backlinksTo(
  target: NoteRef,
  sources: { note: NoteRef; text: string }[],
): Backlink[] {
  const key = normalizeTitle(target.title);
  const out: Backlink[] = [];
  for (const { note, text } of sources) {
    if (note.id === target.id) continue;
    const cited = linksInText(text).find((title) => normalizeTitle(title) === key);
    if (!cited) continue;
    out.push({ from: note, excerpt: excerptAround(text, cited) });
  }
  return out.sort((a, b) => a.from.title.localeCompare(b.from.title, "fr"));
}

/** Combien de notes distinctes cette note cite-t-elle, et lesquelles ? */
export function outgoingFrom(
  text: string,
  notes: NoteRef[],
): { title: string; note?: NoteRef }[] {
  return linksInText(text).map((title) => ({ title, note: resolveLink(title, notes) }));
}
