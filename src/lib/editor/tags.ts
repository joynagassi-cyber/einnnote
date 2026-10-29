import type { Block, Tag } from "@/types";
import { blocksToPlainText } from "@/lib/editor/blocks";

/**
 * Les étiquettes — `#méthodologie`, `#à-relire`, `#chapitre/3`.
 *
 * **Une étiquette est du texte.** Comme les renvois `[[Titre]]`, elle vit dans
 * le contenu de la note et pas dans une structure séparée : une note exportée
 * en Markdown garde ses étiquettes, et une sauvegarde restaurée les retrouve
 * sans migration. Ce fichier ne connaît donc aucun éditeur : il lit du texte.
 *
 * Il existe par-dessus une **base** — `tags` dans `useContentStore` — qui garde
 * les noms déjà employés, même quand plus aucune note ne les porte. C’est ce
 * qui permet de proposer `#méthodologie` quand on tape `#`, alors même que la
 * note ouverte est vide.
 *
 * Deux règles de forme, volontairement simples :
 *
 * | Règle | Pourquoi |
 * | ----- | -------- |
 * | une étiquette commence par `#` **en début de ligne ou après une espace** | `C#` et `prix#2` ne sont pas des étiquettes |
 * | lettres, chiffres, `_`, `-`, `/` — pas d’espace | `#chapitre/3` reste une seule étiquette, hiérarchique |
 */

/* ------------------------------------------------------------------ */
/* Découpage                                                           */
/* ------------------------------------------------------------------ */

/**
 * Ce qui peut précéder un `#` pour qu’il ouvre une étiquette. Les guillemets
 * anglais sont exclus : `href="#ancre"` dans un attribut n’est pas une
 * étiquette, et un renommage ne doit jamais réécrire une adresse.
 */
const BOUNDARY = "\\s\\(\\[\\{«“„‘—–";

/** Une étiquette complète dans un texte. */
const TAG_IN_TEXT = new RegExp(
  `(^|[${BOUNDARY}])#([\\p{L}\\p{N}_][\\p{L}\\p{N}_/-]{0,47})`,
  "gu",
);

/** L’étiquette en cours de frappe, collée au curseur. */
const ACTIVE_TAG = new RegExp(
  `(^|[${BOUNDARY}])#([\\p{L}\\p{N}_/-]{0,47})$`,
  "u",
);

export const TAG_NAME = /^[\p{L}\p{N}_][\p{L}\p{N}_/-]{0,47}$/u;

export interface FoundTag {
  /** le nom, sans le `#` */
  name: string;
  /** position du `#` */
  start: number;
  /** position juste après le dernier caractère du nom */
  end: number;
}

/** Toutes les étiquettes d’un texte, dans l’ordre d’apparition. */
export function findTags(text: string): FoundTag[] {
  const found: FoundTag[] = [];
  TAG_IN_TEXT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_IN_TEXT.exec(text)) !== null) {
    const start = match.index + match[1].length;
    found.push({ name: match[2], start, end: start + 1 + match[2].length });
  }
  return found;
}

/**
 * L’étiquette qu’on est en train de taper, s’il y en a une.
 *
 * On ne regarde que le texte **avant le curseur** : c’est la seule façon de
 * savoir si le menu doit s’ouvrir, se filtrer, ou se refermer.
 */
export function activeTagQuery(
  textBeforeCaret: string,
): { start: number; query: string } | null {
  const match = ACTIVE_TAG.exec(textBeforeCaret);
  if (!match) return null;
  return { start: match.index + match[1].length, query: match[2] };
}

/** La forme canonique d’un nom : c’est elle qui sert à comparer. */
export function tagKey(name: string): string {
  return name.normalize("NFC").replace(/^#/, "").trim().toLocaleLowerCase("fr");
}

/** Un nom nettoyé, ou `null` s’il n’est pas une étiquette valable. */
export function normalizeTagName(raw: string): string | null {
  const name = raw.normalize("NFC").trim().replace(/^#+/, "").trim();
  return TAG_NAME.test(name) ? name : null;
}

/** Les noms d’étiquettes d’un texte, sans doublon, dans l’ordre d’apparition. */
export function tagsInText(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const found of findTags(text)) {
    const key = tagKey(found.name);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(found.name);
  }
  return names;
}

/** Les étiquettes d’une note, lues dans ses blocs. */
export function tagsInBlocks(blocks: Block[]): string[] {
  return tagsInText(blocksToPlainText(blocks));
}

/* ------------------------------------------------------------------ */
/* La base : ce qui est proposé quand on tape `#`                      */
/* ------------------------------------------------------------------ */

export interface TagCount {
  /** nom affiché, tel qu’écrit la première fois */
  name: string;
  /** forme de comparaison */
  key: string;
  /** nombre de notes qui la portent */
  count: number;
}

/**
 * Croise la base (les noms connus) avec les notes (l’usage réel).
 *
 * Une étiquette gardée en base mais plus utilisée reste proposée, avec un
 * compte de zéro : c’est une **entrée de vocabulaire**, pas un fantôme. Les
 * étiquettes trouvées dans les notes mais absentes de la base apparaissent
 * aussi — une sauvegarde ancienne n’est jamais muette.
 */
export function buildTagIndex(
  notes: { blocks: Block[]; deletedAt?: string }[],
  registry: Tag[],
): TagCount[] {
  const counts = new Map<string, { name: string; count: number }>();

  for (const tag of registry) {
    const key = tagKey(tag.name);
    if (!key || counts.has(key)) continue;
    counts.set(key, { name: tag.name, count: 0 });
  }

  for (const note of notes) {
    if (note.deletedAt) continue;
    for (const name of tagsInBlocks(note.blocks)) {
      const key = tagKey(name);
      if (!key) continue;
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { name, count: 1 });
    }
  }

  return [...counts.entries()]
    .map(([key, entry]) => ({ key, name: entry.name, count: entry.count }))
    .sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"),
    );
}

/**
 * Les propositions pour ce qu’on vient de taper.
 *
 * Préfixe d’abord, contenu ensuite : quelqu’un qui tape `#rév` veut
 * `#révision` avant `#à-réviser`. Le compte départage, puis l’alphabet.
 */
export function rankTags(index: TagCount[], query: string, limit = 8): TagCount[] {
  const q = tagKey(query);
  if (!q) return index.slice(0, limit);

  const starts = index.filter((tag) => tag.key.startsWith(q));
  const contains = index.filter((tag) => !tag.key.startsWith(q) && tag.key.includes(q));
  return [...starts, ...contains].slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Renommage                                                           */
/* ------------------------------------------------------------------ */

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Renomme une étiquette **dans le texte** des notes.
 *
 * La base seule ne suffirait pas : le texte est la vérité, et un renommage qui
 * ne toucherait que la liste laisserait les notes avec l’ancien nom. On
 * remplace donc le texte, en s’arrêtant net sur les caractères qui
 * prolongeraient le nom (`#art` ne doit pas devenir `#article` à partir de
 * `#artisan`).
 */
export function renameTagInBlocks(
  blocks: Block[],
  from: string,
  to: string,
): { blocks: Block[]; changed: number } {
  const old = normalizeTagName(from);
  const fresh = normalizeTagName(to);
  if (!old || !fresh || tagKey(old) === tagKey(fresh)) {
    return { blocks, changed: 0 };
  }

  const pattern = new RegExp(
    `(^|[${BOUNDARY}])#${escapeRegExp(old)}(?![\\p{L}\\p{N}_/-])`,
    "gu",
  );
  let changed = 0;
  const next = blocks.map((block) => {
    const html = block.html.replace(pattern, (_all, before: string) => {
      changed += 1;
      return `${before}#${fresh}`;
    });
    return html === block.html ? block : { ...block, html };
  });
  return { blocks: next, changed };
}
