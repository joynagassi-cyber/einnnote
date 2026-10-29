import type { Block } from "@/types";

/**
 * Le stockage d’une note — échappement, nettoyage, export.
 *
 * Une note est une **liste de blocs** : c’est ce qui permet à une question
 * d’être ancrée sur un bloc précis (`blockId`) et de survivre à la réédition.
 * La conversion entre ces blocs et le document de l’éditeur a quitté ce fichier
 * avec ProseMirror : elle vit désormais dans `lib/editor/quill/delta.ts`, à côté
 * du seul moteur qui la comprend. Ici ne restent que des fonctions qui ne
 * connaissent aucun éditeur — donc testables seules.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ESCAPES[char]);
}

/**
 * Nettoyage du HTML stocké avant qu’il n’entre dans l’éditeur.
 *
 * L’éditeur n’accepte que les formats qu’on lui a déclarés, mais un contenu
 * importé (sauvegarde restaurée, collage, vieille donnée) ne doit jamais
 * pouvoir exécuter quoi que ce soit si on l’injecte un jour hors de l’éditeur.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/<\s*\/?(script|style|iframe|object|embed|link|meta)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi,
      '$1="#"',
    );
}

/** Texte brut de chaque bloc, utile pour l’export et les passages de question. */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((block) =>
      block.html
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim(),
    )
    .join("\n");
}

/** Markdown minimal, suffisant pour Obsidian et les éditeurs de texte. */
export function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map((block) => {
      const text = block.html
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<(strong|b)>/gi, "**")
        .replace(/<\/(strong|b)>/gi, "**")
        .replace(/<(em|i)>/gi, "*")
        .replace(/<\/(em|i)>/gi, "*")
        .replace(/<sup>/gi, "^")
        .replace(/<\/sup>/gi, "^")
        .replace(/<sub>/gi, "~")
        .replace(/<\/sub>/gi, "~")
        .replace(/<mark[^>]*>/gi, "==")
        .replace(/<\/mark>/gi, "==")
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "[$2]($1)")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
      const pad = "  ".repeat(block.indent);
      if (block.kind === "rule") return "---";
      if (block.kind === "h1") return `# ${text}`;
      if (block.kind === "h2") return `## ${text}`;
      if (block.kind === "h3") return `### ${text}`;
      if (block.kind === "quote") return `> ${text}`;
      if (block.task) return `${pad}- [${block.checked ? "x" : " "}] ${text}`;
      if (block.bullet) return `${pad}- ${text}`;
      if (block.ordered) return `${pad}1. ${text}`;
      return `${pad}${text}`;
    })
    .join("\n\n");
}
