/**
 * Export Markdown lisible par Obsidian, Logseq, GitHub…
 *
 * Trois portées : un projet, un vault, ou toute la bibliothèque. Le fichier
 * produit est autonome : il ne dépend d’aucune ressource Engram.
 */

import { blocksToMarkdown } from "@/lib/editor/blocks";
import type {
  MindMap,
  Note,
  Project,
  Question,
  QuestionLink,
  ZettelCard,
  ZettelVault,
} from "@/types";

export interface MarkdownSource {
  projects: Project[];
  notes: Note[];
  questions: Question[];
  links: QuestionLink[];
  vaults: ZettelVault[];
  zettel: ZettelCard[];
  mindmaps: MindMap[];
}

export type MarkdownScope =
  | { kind: "library" }
  | { kind: "project"; projectId: string }
  | { kind: "vault"; vaultId: string };

const STATUS_LABELS: Record<Note["status"], string> = {
  draft: "brouillon",
  captured: "capturée",
  questioned: "questionnée",
  done: "terminée",
};

const METHOD_LABELS: Record<Note["method"], string> = {
  outline: "Outline",
  cornell: "Cornell",
  mindmap: "Carte mentale",
  zettelkasten: "Zettelkasten",
};

function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "export"
  );
}

function frontMatter(entries: Record<string, string | number | undefined>): string {
  const lines = Object.entries(entries)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

function questionsFor(source: MarkdownSource, noteId: string) {
  return source.questions
    .filter((question) => question.noteId === noteId)
    .map((question) => {
      const link = source.links.find((item) => item.questionId === question.id);
      return { ...question, passage: link?.passage ?? "" };
    });
}

function noteToMarkdown(source: MarkdownSource, note: Note): string {
  const project = source.projects.find((item) => item.id === note.projectId);
  const parts: string[] = [
    frontMatter({
      title: note.title,
      method: METHOD_LABELS[note.method],
      collection: note.collection,
      projet: project?.name,
      statut: STATUS_LABELS[note.status],
      cree: note.createdAt.slice(0, 10),
      modifie: note.updatedAt.slice(0, 10),
      questions: questionsFor(source, note.id).length,
    }),
    `# ${note.title}\n`,
  ];

  if (note.method === "mindmap") {
    const map = source.mindmaps.find(
      (item) => item.id === note.mindmapId || item.noteId === note.id,
    );
    if (map) {
      parts.push("## Carte mentale\n");
      const render = (parentId: string | undefined, depth: number) =>
        map.nodes
          .filter((node) => node.parentId === parentId)
          .flatMap((node) => [
            `${"  ".repeat(depth)}- ${node.text}`,
            ...render(node.id, depth + 1),
          ]);
      const roots = map.nodes.filter((node) => !node.parentId);
      parts.push(roots.flatMap((root) => [`- ${root.text}`, ...render(root.id, 1)]).join("\n"));
      parts.push("");
    }
  } else if (note.method === "zettelkasten") {
    const cards = source.zettel.filter((card) => card.vaultId === note.vaultId);
    parts.push(`## Cartes du vault (${cards.length})\n`);
    for (const card of cards) {
      parts.push(
        `### ${card.code} · ${card.title}\n\n${card.body}\n\n> ${card.source}\n`,
      );
    }
  } else {
    const body = blocksToMarkdown(note.blocks);
    if (body.trim()) parts.push(`${body}\n`);
  }

  const questions = questionsFor(source, note.id);
  if (questions.length > 0) {
    parts.push(`## Questions (${questions.length})\n`);
    questions.forEach((question, index) => {
      parts.push(
        `**Q${index + 1}.** ${question.text}\n\n> ${question.passage.replace(/\n/g, " ")}\n`,
      );
    });
  }

  return parts.join("\n");
}

function vaultToMarkdown(vault: ZettelVault, cards: ZettelCard[]): string {
  const parts = [
    frontMatter({
      titre: vault.name,
      type: "vault",
      cartes: cards.length,
    }),
    `# ${vault.name}\n`,
    vault.note ? `${vault.note}\n` : "",
  ];
  for (const card of cards) {
    parts.push(
      `## ${card.code} · ${card.title}\n\n${card.body}\n\n- Source : ${card.source}`,
      card.refs.length ? `- Voir : ${card.refs.join(", ")}` : "",
      "",
    );
  }
  return parts.filter(Boolean).join("\n");
}

export interface MarkdownFile {
  filename: string;
  content: string;
  notes: number;
  cards: number;
}

export function buildMarkdown(
  source: MarkdownSource,
  scope: MarkdownScope = { kind: "library" },
): MarkdownFile {
  const live = source.notes.filter((note) => !note.deletedAt);
  const today = new Date().toISOString().slice(0, 10);

  if (scope.kind === "vault") {
    const vault = source.vaults.find((item) => item.id === scope.vaultId);
    const cards = source.zettel.filter((card) => card.vaultId === scope.vaultId);
    if (!vault) {
      return {
        filename: `engram-vault-${today}.md`,
        content: "",
        notes: 0,
        cards: 0,
      };
    }
    return {
      filename: `engram-${slug(vault.name)}-${today}.md`,
      content: vaultToMarkdown(vault, cards),
      notes: 0,
      cards: cards.length,
    };
  }

  const inScope =
    scope.kind === "project"
      ? live.filter((note) => note.projectId === scope.projectId)
      : live;
  const project =
    scope.kind === "project"
      ? source.projects.find((item) => item.id === scope.projectId)
      : undefined;

  const vaultIds = new Set(inScope.map((note) => note.vaultId).filter(Boolean));
  const cards = source.zettel.filter((card) => vaultIds.has(card.vaultId));

  const header = [
    frontMatter({
      application: "Engram",
      export: project ? `projet ${project.name}` : "bibliothèque",
      date: today,
      notes: inScope.length,
      cartes: cards.length,
    }),
    `# ${project ? project.name : "Bibliothèque Engram"}\n`,
    project?.description ? `${project.description}\n` : "",
    `> Export du ${today} · ${inScope.length} note${inScope.length > 1 ? "s" : ""} · ${cards.length} carte${cards.length > 1 ? "s" : ""}\n`,
  ].join("\n");

  const body = inScope
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .map((note) => noteToMarkdown(source, note))
    .join("\n---\n\n");

  return {
    filename: `engram-${project ? slug(project.name) : "bibliotheque"}-${today}.md`,
    content: `${header}\n${body}`.trimEnd() + "\n",
    notes: inScope.length,
    cards: cards.length,
  };
}

/* ------------------------------------------------------------------ */
/* Arborescence : un fichier par note, rangé par projet puis par vault */
/* ------------------------------------------------------------------ */

/*
 * Un seul gros fichier Markdown est illisible dans Obsidian : on ne peut ni
 * lier une note, ni la déplacer, ni la renommer. L’export produit donc une
 * **arborescence de fichiers** :
 *
 *   Engram-2025-10-28/
 *     Projets/Thèse.md                  ← fiche du projet + sommaire
 *     Notes/Thèse/Plan du chapitre 3.md ← une note, un fichier
 *     Vaults/Thèse/Économie/_vault.md ← index du vault
 *     Vaults/Thèse/Économie/#1A L'inflation….md
 *     _index.md                          ← table des matières générale
 *
 * Le nom du fichier est le **titre de la note** : c’est ce qu’on cherche dans
 * un explorateur. Les caractères interdits par les systèmes de fichiers sont
 * remplacés, les doublons reçoivent un suffixe numérique, et les liens entre
 * fiches deviennent des liens wiki (`[[…]]`) que les outils savent suivre.
 */

export interface MarkdownTreeNode {
  /** chemin relatif dans l’archive, séparateur « / » */
  path: string;
  content: string;
}

export interface MarkdownTree {
  /** nom du dossier racine (sans slash) */
  root: string;
  files: MarkdownTreeNode[];
  notes: number;
  cards: number;
}

/** Nom de fichier sûr, accents conservés (les systèmes les acceptent). */
export function fileSafe(value: string, max = 80): string {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, " ")
    /* caractères de contrôle : interdits dans un nom de fichier */
    .replace(/[\x00-\x1f]/g, " ") // eslint-disable-line no-control-regex
    .replace(/\s+/g, " ")
    .trim();
  const trimmed = cleaned.length > max ? cleaned.slice(0, max).trim() : cleaned;
  /* Un nom finissant par un point est invalide sous Windows. */
  return (trimmed.replace(/\.+$/, "") || "sans-titre").replace(/^\./, "_");
}

/** Réserve un nom unique dans une liste déjà prise (`-2`, `-3`…). */
function uniqueName(taken: Set<string>, name: string, ext = ".md"): string {
  let candidate = `${name}${ext}`;
  let index = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${name} - ${index}${ext}`;
    index += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

function projectName(source: MarkdownSource, projectId: string | undefined): string {
  const project = source.projects.find((item) => item.id === projectId);
  return project ? fileSafe(project.name) : "Sans projet";
}

function cardFileName(card: ZettelCard): string {
  return fileSafe(`${card.code} ${card.title}`);
}

function cardFileContent(
  source: MarkdownSource,
  card: ZettelCard,
  vault: ZettelVault | undefined,
): string {
  const refs = card.refs.map((code) => {
    const target = source.zettel.find(
      (item) => item.vaultId === card.vaultId && item.code === code,
    );
    return target ? `[[${cardFileName(target)}]]` : code;
  });
  const backlinks = source.zettel
    .filter((item) => item.vaultId === card.vaultId && item.refs.includes(card.code))
    .map((item) => `[[${cardFileName(item)}]]`);

  return `---
titre: "${card.title.replace(/"/g, '\\"')}"
code: "${card.code}"
vault: "${vault?.name ?? ""}"
cree: ${card.createdAt.slice(0, 10)}
modifie: ${card.updatedAt.slice(0, 10)}
---

# ${card.title}

${card.body}
${card.source ? `\n> Source : ${card.source}\n` : ""}
${refs.length ? `\n## Cite\n\n${refs.map((ref) => `- ${ref}`).join("\n")}\n` : ""}
${backlinks.length ? `\n## Cité par\n\n${backlinks.map((ref) => `- ${ref}`).join("\n")}\n` : ""}`;
}

export function buildMarkdownTree(
  source: MarkdownSource,
  scope: MarkdownScope = { kind: "library" },
): MarkdownTree {
  const today = new Date().toISOString().slice(0, 10);
  const root =
    scope.kind === "project"
      ? `Engram ${fileSafe(source.projects.find((item) => item.id === scope.projectId)?.name ?? "projet")} ${today}`
      : scope.kind === "vault"
        ? `Engram ${fileSafe(source.vaults.find((item) => item.id === scope.vaultId)?.name ?? "vault")} ${today}`
        : `Engram ${today}`;

  const files: MarkdownTreeNode[] = [];
  const liveNotes = source.notes.filter((note) => !note.deletedAt);
  const notes =
    scope.kind === "project"
      ? liveNotes.filter((note) => note.projectId === scope.projectId)
      : scope.kind === "vault"
        ? []
        : liveNotes;
  const vaults =
    scope.kind === "vault"
      ? source.vaults.filter((vault) => vault.id === scope.vaultId)
      : scope.kind === "project"
        ? source.vaults.filter((vault) => vault.projectId === scope.projectId)
        : source.vaults;

  /* --- Notes : un fichier par note, sous « Notes / <projet> ». --- */
  const takenByFolder = new Map<string, Set<string>>();
  for (const note of notes) {
    const folder = `Notes/${projectName(source, note.projectId)}`;
    const taken = takenByFolder.get(folder) ?? new Set<string>();
    takenByFolder.set(folder, taken);
    const fileName = uniqueName(taken, fileSafe(note.title));
    files.push({ path: `${folder}/${fileName}`, content: noteToMarkdown(source, note) });
  }

  /* --- Vaults : un fichier par fiche, sous « Vaults / <projet> / <vault> ». --- */
  let cards = 0;
  for (const vault of vaults) {
    const project = projectName(source, vault.projectId);
    const vaultFolder = `Vaults/${project}/${fileSafe(vault.name)}`;
    const vaultCards = source.zettel
      .filter((card) => card.vaultId === vault.id)
      .sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }));
    if (!vaultCards.length) continue;
    cards += vaultCards.length;

    const taken = new Set<string>();
    files.push({
      path: `${vaultFolder}/_vault.md`,
      content: vaultToMarkdown(vault, vaultCards),
    });
    taken.add("_vault.md");
    for (const card of vaultCards) {
      files.push({
        path: `${vaultFolder}/${uniqueName(taken, cardFileName(card))}`,
        content: cardFileContent(source, card, vault),
      });
    }
  }

  /* --- Projets : une fiche de projet avec son sommaire. --- */
  const projects =
    scope.kind === "project"
      ? source.projects.filter((project) => project.id === scope.projectId)
      : scope.kind === "library"
        ? source.projects
        : [];
  for (const project of projects) {
    const projectNotes = liveNotes
      .filter((note) => note.projectId === project.id)
      .sort((a, b) => a.title.localeCompare(b.title, "fr"));
    const projectVaults = source.vaults.filter((vault) => vault.projectId === project.id);
    const countCards = (vaultId: string) =>
      source.zettel.filter((card) => card.vaultId === vaultId).length;
    const lines = [
      "---",
      `titre: "${project.name.replace(/"/g, '\\"')}"`,
      "type: projet",
      `notes: ${projectNotes.length}`,
      `vaults: ${projectVaults.length}`,
      "---",
      "",
      `# ${project.name}`,
      "",
      project.description ?? "",
      "",
      "## Notes",
      "",
      ...projectNotes.map(
        (note) => `- [[${fileSafe(note.title)}]] — ${METHOD_LABELS[note.method]}`,
      ),
      "",
      "## Vaults",
      "",
      ...projectVaults.map((vault) => `- ${vault.name} (${countCards(vault.id)} fiches)`),
      "",
    ];
    files.push({
      path: `Projets/${fileSafe(project.name)}.md`,
      content: lines.join("\n"),
    });
  }

  /* --- Index général. --- */
  const index = [
    "---",
    "application: Engram",
    `date: ${today}`,
    `notes: ${notes.length}`,
    `cartes: ${cards}`,
    "---",
    "",
    `# ${scope.kind === "library" ? "Bibliothèque Engram" : root}`,
    "",
    `> Export du ${today} · ${notes.length} note${notes.length > 1 ? "s" : ""} · ${cards} fiche${cards > 1 ? "s" : ""}`,
    "",
    "## Projets",
    "",
    ...projects.map((project) => `- [[${fileSafe(project.name)}]]`),
    "",
    "## Vaults",
    "",
    ...vaults.map(
      (vault) =>
        `- ${vault.name} — ${source.zettel.filter((card) => card.vaultId === vault.id).length} fiches`,
    ),
    "",
  ];
  files.unshift({ path: "_index.md", content: index.join("\n") });

  return { root, files, notes: notes.length, cards };
}
