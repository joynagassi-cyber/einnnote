/**
 * Export Markdown lisible par Obsidian, Logseq, GitHub…
 *
 * Trois portées : un projet, un coffre, ou toute la bibliothèque. Le fichier
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
    parts.push(`## Cartes du coffre (${cards.length})\n`);
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
      type: "coffre",
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
        filename: `engram-coffre-${today}.md`,
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
