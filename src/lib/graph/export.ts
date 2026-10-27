import type { ZettelCard, ZettelVault } from "@/types";
import { floatingCurve, floatingParams, ribbonPath, stepPath, type Box } from "@/lib/graph/floating";
import { linkLabel } from "@/lib/graph/labels";
import {
  CARD_H,
  CARD_W,
  type ZettelGraph,
  type ZettelPosition,
} from "@/lib/graph/zettel";
import type { GraphStyle } from "@/lib/graph/styles";

/**
 * Export d’un graphe — SVG et JSON, sans dépendance.
 *
 * Le modèle lu sur VisualFlow (`Flow_renderer_test`, `helpers/index.js`) exporte
 * en PNG via `html-to-image` et en JSON via un `Blob`. On garde les deux idées,
 * mais :
 *
 * - **SVG au lieu de PNG** : pas de dépendance, pas de pixel, un fichier qui
 *   reste net à l’impression et qu’on peut rééditer. Une capture PNG ne vaut
 *   que pour un écran ; un SVG vaut pour un mémoire.
 * - **JSON validé** : leur `convert()` fait `JSON.parse` puis `concat` sans
 *   vérification (un fichier mal formé casse le canevas). Ici l’import vérifie
 *   la forme et refuse explicitement, avec la raison.
 *
 * Le rendu SVG réutilise les mêmes fonctions que l’écran (`floatingCurve`,
 * `stepPath`, `ribbonPath`) : l’image exportée est exactement ce qu’on voit.
 */

export interface ExportInput {
  vault: Pick<ZettelVault, "name">;
  cards: ZettelCard[];
  graph: ZettelGraph;
  positions: ZettelPosition[];
  style: GraphStyle;
  /** largeur/hauteur minimales pour ne pas rogner */
  padding?: number;
}

const FONT_SERIF = "Literata, Georgia, 'Times New Roman', serif";
const FONT_SANS = "Inter, system-ui, -apple-system, sans-serif";

/** Échappe le texte destiné au SVG (une esperluette suffit à casser un fichier). */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Coupe un titre en lignes de `max` caractères (2 lignes au plus). */
export function wrapTitle(title: string, max = 26): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length === 2) break;
  }
  if (current && lines.length < 2) lines.push(current);
  return lines.length ? lines : [""];
}

function edgePathOf(style: GraphStyle, from: Box, to: Box): string {
  const params = floatingParams(from, to);
  switch (style.edge) {
    case "floating":
      return floatingCurve(params, 0.42);
    case "tapered":
      return ribbonPath(params, { startWidth: 7, endWidth: 1.2, curve: 0.16 });
    case "smoothstep":
      return stepPath(params, 12);
    case "straight":
      return `M ${params.sx} ${params.sy} L ${params.tx} ${params.ty}`;
    default: {
      const midX = (params.sx + params.tx) / 2;
      return `M ${params.sx} ${params.sy} Q ${midX} ${params.sy} ${midX} ${
        (params.sy + params.ty) / 2
      } T ${params.tx} ${params.ty}`;
    }
  }
}

export interface ExportOptions {
  /** étiquettes de relation sur les liens */
  labels?: boolean;
  /** renvois (liens hors arbre) */
  echoes?: boolean;
  /** thème clair ou sombre, pour que l’image collée dans un document reste lisible */
  mode?: "light" | "dark";
}

const THEME = {
  light: {
    bg: "#F6F1E7",
    surface: "#FFFDF8",
    root: "#E6F2EF",
    ink: "#2B2A27",
    muted: "#6E6A61",
    line: "#CFC7B8",
    accent: "#0F766E",
  },
  dark: {
    bg: "#12110F",
    surface: "#1C1B18",
    root: "#16302C",
    ink: "#F2EEE6",
    muted: "#A29D93",
    line: "#3A3730",
    accent: "#5EEAD4",
  },
} as const;

export function graphToSvg(input: ExportInput, options: ExportOptions = {}): string {
  const { vault, cards, graph, positions, style } = input;
  const { labels = true, echoes = true, mode = "light" } = options;
  const theme = THEME[mode];
  const pad = input.padding ?? 48;

  const byCode = new Map(cards.map((card) => [card.code, card]));
  const boxOf = new Map(
    positions.map((position) => [
      position.code,
      { x: position.x, y: position.y, width: CARD_W, height: CARD_H },
    ]),
  );

  const minX = Math.min(...positions.map((position) => position.x));
  const minY = Math.min(...positions.map((position) => position.y));
  const maxX = Math.max(...positions.map((position) => position.x + CARD_W));
  const maxY = Math.max(...positions.map((position) => position.y + CARD_H));
  const width = Math.ceil(maxX - minX + pad * 2 + 220); // place pour le titre
  const height = Math.ceil(maxY - minY + pad * 2 + 60);
  const shiftX = pad - minX;
  const shiftY = pad + 46 - minY;

  const parts: string[] = [];

  const drawEdge = (
    source: string,
    target: string,
    echo: boolean,
    index: number,
  ) => {
    const from = boxOf.get(source);
    const to = boxOf.get(target);
    if (!from || !to) return;
    const d = edgePathOf(style, from, to);
    const color = theme.accent;
    const label = linkLabel(cards, source, target);
    const labelId = `p-${index}`;
    if (style.edge === "tapered") {
      parts.push(
        `<path d="${d}" fill="${color}" opacity="${echo ? 0.35 : 0.8}" ${echo ? 'stroke-dasharray="2 4"' : ""}/>`,
      );
    } else {
      parts.push(
        `<path id="${labelId}" d="${d}" fill="none" stroke="${color}" stroke-width="${
          echo ? 1.4 : style.weight ?? 2
        }" stroke-linecap="round" opacity="${echo ? 0.4 : 0.9}" ${
          echo ? 'stroke-dasharray="4 4"' : style.dashed ? 'stroke-dasharray="6 4"' : ""
        } ${style.arrow && !echo ? 'marker-end="url(#arrow)"' : ""}/>`,
      );
    }
    /* Le chemin du ruban effilé n’a pas d’`id` : un `textPath` qui le
       référencerait n’afficherait rien. On n’étiquette donc que les traits. */
    if (labels && !echo && style.edge !== "tapered" && label.relation !== "lie") {
      parts.push(
        `<text font-family="${FONT_SANS}" font-size="10.5" fill="${theme.muted}" letter-spacing="0.3">` +
          `<textPath href="#${labelId}" startOffset="50%" text-anchor="middle">` +
          `<tspan stroke="${theme.bg}" stroke-width="3" paint-order="stroke">${escapeXml(
            label.label,
          )}</tspan></textPath></text>`,
      );
    }
  };

  const echoLinks = echoes ? graph.echoes : [];
  [...graph.treeLinks.map((link) => ({ ...link, echo: false })),
    ...echoLinks.map((link) => ({ ...link, echo: true }))].forEach((link, index) => {
    drawEdge(link.source, link.target, link.echo, index);
  });

  for (const position of positions) {
    const card = byCode.get(position.code);
    if (!card) continue;
    const { x, y } = position;
    const stroke = position.root ? theme.accent : theme.line;
    parts.push(
      `<g><rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="10" fill="${
        position.root ? theme.root : theme.surface
      }" stroke="${stroke}" stroke-width="${position.root ? 2 : 1.2}" ${
        position.detached ? 'stroke-dasharray="5 4"' : ""
      }/>`,
    );
    parts.push(
      `<text x="${x + 14}" y="${y + 22}" font-family="${FONT_SANS}" font-size="11.5" font-weight="700" fill="${theme.accent}">${escapeXml(
        position.code,
      )}</text>`,
    );
    wrapTitle(card.title).forEach((line, index) => {
      parts.push(
        `<text x="${x + 14}" y="${y + 42 + index * 16}" font-family="${FONT_SERIF}" font-size="12.5" font-weight="600" fill="${
          theme.ink
        }">${escapeXml(line)}</text>`,
      );
    });
    const refs = card.refs.length ? `${card.refs.length} lien${card.refs.length > 1 ? "s" : ""}` : "";
    if (refs) {
      parts.push(
        `<text x="${x + 14}" y="${y + CARD_H - 10}" font-family="${FONT_SANS}" font-size="9.5" fill="${theme.muted}">${refs}</text>`,
      );
    }
    parts.push("</g>");
  }

  const title = `Graphe · ${vault.name}`;
  const subtitle = `${cards.length} fiche${cards.length > 1 ? "s" : ""} · ${graph.treeLinks.length} liens d’arbre · ${
    graph.echoes.length
  } renvois · style ${style.label}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
      title,
    )}">`,
    `<title>${escapeXml(title)}</title>`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.accent}"/></marker></defs>`,
    `<rect width="100%" height="100%" fill="${theme.bg}"/>`,
    `<text x="${pad}" y="${pad + 14}" font-family="${FONT_SERIF}" font-size="21" font-weight="700" fill="${theme.ink}">${escapeXml(
      title,
    )}</text>`,
    `<text x="${pad}" y="${pad + 34}" font-family="${FONT_SANS}" font-size="11.5" fill="${theme.muted}">${escapeXml(
      subtitle,
    )}</text>`,
    `<g transform="translate(${shiftX} ${shiftY})">`,
    ...parts,
    `</g>`,
    `</svg>`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Téléchargements                                                     */
/* ------------------------------------------------------------------ */

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // laisser au navigateur le temps d’ouvrir le flux
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "graphe";
}

export function downloadSvg(name: string, svg: string) {
  download(`${slug(name)}.svg`, "image/svg+xml;charset=utf-8", svg);
}

export interface GraphDocument {
  format: "engram-graphe";
  version: 1;
  exportedAt: string;
  vault: { name: string };
  style: string;
  cards: { code: string; title: string; body: string; source: string; refs: string[] }[];
  treeLinks: { source: string; target: string }[];
  echoes: { source: string; target: string; mutual: boolean }[];
}

export function graphToDocument(input: ExportInput): GraphDocument {
  return {
    format: "engram-graphe",
    version: 1,
    exportedAt: new Date().toISOString(),
    vault: { name: input.vault.name },
    style: input.style.id,
    cards: input.cards.map((card) => ({
      code: card.code,
      title: card.title,
      body: card.body,
      source: card.source,
      refs: [...card.refs],
    })),
    treeLinks: [...input.graph.treeLinks],
    echoes: input.graph.echoes.map((link) => ({
      source: link.source,
      target: link.target,
      mutual: link.mutual,
    })),
  };
}

export function downloadJson(name: string, document: GraphDocument) {
  download(`${slug(name)}.json`, "application/json;charset=utf-8", JSON.stringify(document, null, 2));
}

/**
 * Le projet compile avec `strict: false` : sans `strictNullChecks`, TypeScript
 * ne réduit pas une union discriminée par un booléen littéral. Les deux
 * branches déclarent donc les deux champs (l’un facultatif) pour que
 * `parsed.reason` reste lisible après le test, sans transtypage.
 */
export type ParsedDocument =
  | { ok: true; document: GraphDocument; reason?: undefined }
  | { ok: false; reason: string; document?: undefined };

/**
 * Valide un fichier avant de l’accepter. On refuse tôt et avec une phrase : un
 * graphe à moitié importé est pire qu’un refus.
 */
export function parseGraphDocument(raw: string): ParsedDocument {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "Ce fichier n’est pas du JSON valide." };
  }
  if (!value || typeof value !== "object") {
    return { ok: false, reason: "Ce fichier ne contient pas un graphe." };
  }
  const document = value as Partial<GraphDocument>;
  if (document.format !== "engram-graphe") {
    return { ok: false, reason: "Ce fichier n’a pas été exporté depuis Engram." };
  }
  if (!Array.isArray(document.cards)) {
    return { ok: false, reason: "Le fichier ne contient aucune fiche." };
  }
  const codes = new Set<string>();
  for (const card of document.cards) {
    if (!card || typeof card.code !== "string" || typeof card.title !== "string") {
      return { ok: false, reason: "Une fiche du fichier n’a pas de code ou de titre." };
    }
    if (codes.has(card.code)) {
      return { ok: false, reason: `Le code ${card.code} apparaît deux fois.` };
    }
    codes.add(card.code);
  }
  for (const link of document.treeLinks ?? []) {
    if (!codes.has(link.source) || !codes.has(link.target)) {
      return { ok: false, reason: `Un lien pointe vers une fiche absente (${link.source} → ${link.target}).` };
    }
  }
  return { ok: true, document: document as GraphDocument };
}
