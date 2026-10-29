import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Block,
  EdgeStyle,
  LessonProgress,
  Method,
  MindEdge,
  MindMap,
  MindNode,
  Note,
  Project,
  Question,
  QuestionLink,
  Rating,
  ReviewCard,
  ReviewLog,
  Tag,
  ZettelCard,
  ZettelVault,
} from "@/types";
import { seedLessons } from "@/data/lessons";
import { nextCardState } from "@/lib/scheduler";
import {
  normalizeTagName,
  renameTagInBlocks,
  tagKey,
  tagsInBlocks,
} from "@/lib/editor/tags";
import { DEFAULT_MINDMAP_TEMPLATE } from "@/lib/templates/mindmaps";
import {
  mindmapFromTemplate,
  type MindmapSeed,
} from "@/lib/templates/apply";

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const DEFAULT_PROJECT_ID = "p-general";

/** Les quatre poignées d’une forme, dans l’ordre où on les lit. */
export type MindDirection = "top" | "right" | "bottom" | "left";

const DELTA: Record<MindDirection, { x: number; y: number }> = {
  top: { x: 0, y: -168 },
  right: { x: 232, y: 0 },
  bottom: { x: 0, y: 176 },
  left: { x: -232, y: 0 },
};

interface ContentState {
  projects: Project[];
  notes: Note[];
  questions: Question[];
  links: QuestionLink[];
  cards: ReviewCard[];
  logs: ReviewLog[];
  vaults: ZettelVault[];
  zettel: ZettelCard[];
  mindmaps: MindMap[];
  progress: LessonProgress[];
  /** la base des étiquettes : le vocabulaire déjà employé */
  tags: Tag[];

  /* Projets */
  createProject: (name: string, description?: string) => Project;
  renameProject: (id: string, name: string) => void;
  /** Refuse de supprimer un projet qui contient encore des notes. */
  deleteProject: (id: string) => { ok: boolean; reason?: string };
  assignNoteToProject: (noteId: string, projectId: string) => void;

  /* Notes */
  createNote: (
    method: Method,
    options?: {
      title?: string;
      collection?: string;
      projectId?: string;
      /** contenu de départ (modèle choisi) ; sinon blocs vierges */
      blocks?: Block[];
      /** carte mentale de départ (modèle choisi) ; sinon modèle par défaut */
      mindmap?: MindmapSeed;
      /**
       * Vault (catégorie) où ranger la note. Le projet s'en déduit : une note
       * ne peut pas vivre dans la catégorie d'un autre projet.
       */
      vaultId?: string;
    },
  ) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  updateBlock: (noteId: string, blockId: string, html: string) => void;
  replaceBlocks: (noteId: string, blocks: Block[]) => void;
  addBlock: (noteId: string, afterBlockId?: string) => string;
  updateBlockMeta: (noteId: string, blockId: string, patch: Partial<Block>) => void;
  removeBlock: (noteId: string, blockId: string) => void;
  setBlockMarked: (noteId: string, blockId: string, marked: boolean) => void;
  trashNote: (id: string) => void;
  restoreNote: (id: string) => void;
  purgeNote: (id: string) => void;

  /* Questions et cartes */
  addQuestion: (args: {
    noteId: string;
    text: string;
    blockId: string;
    passage: string;
  }) => Question;
  deleteQuestion: (questionId: string) => void;
  rateCard: (cardId: string, rating: Rating, options?: { retention?: number }) => void;
  /** Une fiche de vault se planifie comme une carte (verso = corps). */
  rateZettel: (cardId: string, rating: Rating, options?: { retention?: number }) => void;
  resetReviewSession: () => void;

  /* Zettelkasten */
  createVault: (args: {
    name: string;
    projectId: string;
    note?: string;
  }) => ZettelVault;
  renameVault: (id: string, patch: { name?: string; note?: string }) => void;
  deleteVault: (id: string) => { ok: boolean; reason?: string };

  addZettelCard: (args: {
    vaultId: string;
    title: string;
    body: string;
    source: string;
    refs?: string[];
  }) => ZettelCard;
  updateZettelCard: (id: string, patch: Partial<ZettelCard>) => void;

  /* Carte mentale */
  updateMindMap: (id: string, patch: Partial<MindMap>) => void;
  /** Ajoute une forme **connectée** à `parentId` ; renvoie son identifiant. */
  addMindNode: (
    mapId: string,
    parentId: string,
    shape: MindNode["shape"],
    direction?: MindDirection,
  ) => string;
  /**
   * Ajoute une forme **libre**, sans lien.
   *
   * C’est la différence qui compte : la barre flottante pose une idée sur le
   * canevas, la poignée d’un nœud en ajoute une branche. Les deux gestes
   * existent et ne se confondent pas.
   */
  addMindNodeAt: (mapId: string, options: {
    x: number;
    y: number;
    shape: MindNode["shape"];
    text?: string;
  }) => string;
  /** Relie deux formes déjà posées (le glissement d’une poignée à l’autre). */
  connectMindNodes: (mapId: string, source: string, target: string) => void;
  updateMindEdge: (mapId: string, edgeId: string, patch: Partial<MindEdge>) => void;
  updateMindNode: (mapId: string, nodeId: string, patch: Partial<MindNode>) => void;
  removeMindNode: (mapId: string, nodeId: string) => void;
  setEdgeStyle: (mapId: string, edgeStyle: EdgeStyle) => void;

  /* Étiquettes */
  /** Ajoute à la base les noms qu’on ne connaissait pas encore. */
  registerTags: (names: string[]) => void;
  /** Renomme une étiquette dans la base **et** dans le texte des notes. */
  renameTag: (id: string, name: string) => { ok: boolean; reason?: string };
  /** Retire une étiquette de la base — seulement si plus aucune note ne la porte. */
  deleteTag: (id: string) => { ok: boolean; reason?: string };

  /* Leçons */
  setLessonStep: (lessonId: string, step: number) => void;
  completeLesson: (lessonId: string) => void;

  /* Données */
  replaceAll: (payload: unknown) => { notes: number; cards: number; zettel: number; lessons: number };
  exportPayload: () => unknown;
}

function blockHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

const starterBlocks = (method: Method): Block[] => {
  if (method === "mindmap" || method === "zettelkasten") return [];
  return [
    {
      id: uid("b"),
      html: "",
      kind: "p",
      bullet: false,
      indent: 0,
    },
  ];
};

/**
 * Migrations du contenu.
 *
 * Chaque version ne s’occupe que de son saut, dans l’ordre, et **rien n’est
 * perdu** : une sauvegarde de 2025 doit encore s’ouvrir après trois ajouts de
 * champs. Une version déjà à jour traverse la fonction sans être copiée.
 *
 * | Saut | Ce qui change |
 * | ---- | ------------- |
 * | v1 → v2 | les projets apparaissent : tout est rattaché au premier projet |
 * | v2 → v3 | la base des étiquettes apparaît, reconstituée depuis les notes |
 */
export function migrateContentData(persisted: unknown, version: number) {
  const state = persisted as Partial<ContentState> | undefined;
  if (!state) return state as never;

  let next = state;
  if (version < 2) next = migrateToProjects(next);
  if (version < 3) next = migrateToTags(next);
  return next as never;
}

/** v1 → v2 : les données n’avaient pas de projets. */
function migrateToProjects(state: Partial<ContentState>): Partial<ContentState> {
  const existing = state.projects ?? [];
  const projectId = existing[0]?.id ?? DEFAULT_PROJECT_ID;
  /* Une sauvegarde ancienne sans projet mais avec du contenu ne doit pas
     perdre ce contenu : on lui crée son espace de rattachement. */
  const hasContent = (state.notes?.length ?? 0) + (state.vaults?.length ?? 0) > 0;
  const projects: Project[] =
    existing.length === 0 && hasContent
      ? [
          {
            id: DEFAULT_PROJECT_ID,
            name: "Mon espace",
            createdAt: new Date().toISOString(),
          },
        ]
      : existing;

  return {
    ...state,
    projects,
    notes: (state.notes ?? []).map((note) => ({
      ...note,
      projectId: note.projectId ?? projectId,
    })),
    vaults: (state.vaults ?? []).map((vault) => ({
      ...vault,
      projectId: vault.projectId ?? projectId,
    })),
  };
}

/**
 * v2 → v3 : la base des étiquettes.
 *
 * Les étiquettes des notes n’ont pas besoin d’être recopiées — elles sont dans
 * le texte. On remplit seulement le vocabulaire, pour que `#` propose tout de
 * suite les noms déjà employés au lieu d’une liste vide.
 */
function migrateToTags(state: Partial<ContentState>): Partial<ContentState> {
  if (Array.isArray(state.tags)) return state;

  const seen = new Set<string>();
  const tags: Tag[] = [];
  for (const note of state.notes ?? []) {
    for (const raw of tagsInBlocks(note.blocks ?? [])) {
      const name = normalizeTagName(raw);
      if (!name) continue;
      const key = tagKey(name);
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push({ id: `t-${tags.length + 1}`, name, createdAt: new Date().toISOString() });
    }
  }
  return { ...state, tags };
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      /* Aucun exemple : un nouveau compte s’ouvre sur des espaces vides. */
      projects: [],
      notes: [],
      questions: [],
      links: [],
      cards: [],
      logs: [],
      vaults: [],
      zettel: [],
      mindmaps: [],
      progress: [],
      tags: [],

      createProject: (name, description) => {
        const project: Project = {
          id: uid("p"),
          name: name.trim() || "Nouveau projet",
          description: description?.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ projects: [...s.projects, project] }));
        return project;
      },

      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p,
          ),
        })),

      deleteProject: (id) => {
        const state = get();
        const project = state.projects.find((p) => p.id === id);
        if (!project) return { ok: false, reason: "Projet introuvable." };
        if (state.projects.length <= 1) {
          return { ok: false, reason: "Gardez au moins un projet." };
        }
        const used = state.notes.filter(
          (n) => n.projectId === id && !n.deletedAt,
        ).length;
        if (used > 0) {
          return {
            ok: false,
            reason: `Ce projet contient ${used} note${used > 1 ? "s" : ""}. Déplacez-les d’abord.`,
          };
        }
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
        return { ok: true };
      },

      assignNoteToProject: (noteId, projectId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? { ...n, projectId, updatedAt: new Date().toISOString() }
              : n,
          ),
        })),

      createNote: (method, options) => {
        const now = new Date().toISOString();
        /* Le vault, s'il est donné, commande le projet : une note ne peut pas
           être rangée dans la catégorie d'un autre projet. */
        const target = options?.vaultId
          ? get().vaults.find((vault) => vault.id === options.vaultId)
          : undefined;
        const projectId =
          target?.projectId ??
          options?.projectId ??
          get().projects[0]?.id ??
          DEFAULT_PROJECT_ID;
        const note: Note = {
          id: uid("n"),
          projectId,
          ...(target ? { vaultId: target.id } : {}),
          method,
          title: options?.title ?? "Note sans titre",
          collection: options?.collection ?? "Bac à sable",
          blocks: options?.blocks?.length ? options.blocks : starterBlocks(method),
          status: "draft",
          createdAt: now,
          updatedAt: now,
        };

        if (method === "mindmap") {
          const mapId = uid("m");
          note.mindmapId = mapId;
          /* Une carte vide n’apprend rien : on part du modèle par défaut,
             qui montre du premier coup d’œil comment lire un graphe. */
          const seed = options?.mindmap ?? mindmapFromTemplate(DEFAULT_MINDMAP_TEMPLATE);
          set((s) => ({
            notes: [note, ...s.notes],
            mindmaps: [
              {
                id: mapId,
                noteId: note.id,
                title: note.title,
                nodes: seed.nodes,
                edges: seed.edges,
                edgeStyle: seed.edgeStyle,
                updatedAt: now,
              },
              ...s.mindmaps,
            ],
          }));
          return note;
        }

        if (method === "zettelkasten" && !note.vaultId) {
          /* Hors d’un vault, on rattache la note à la première catégorie du
             projet — ou on en crée une, sinon la note tombe dans le vault
             d’un autre projet, ce qui est le bug le plus déroutant de l’écran. */
          const existing = get().vaults.find((v) => v.projectId === projectId);
          if (existing) {
            note.vaultId = existing.id;
          } else {
            const project = get().projects.find((p) => p.id === projectId);
            const vault: ZettelVault = {
              id: uid("v"),
              projectId,
              name: `Vault ${project?.name ?? "principal"}`,
              note: "Fiches créées depuis cet espace",
            };
            set((s) => ({ vaults: [...s.vaults, vault] }));
            note.vaultId = vault.id;
          }
        }

        set((s) => ({ notes: [note, ...s.notes] }));
        /* Un modèle peut déjà porter des étiquettes : elles entrent dans la
           base au moment où la note naît, pas à la première frappe. */
        get().registerTags(tagsInBlocks(note.blocks));
        return note;
      },

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id
              ? { ...n, ...patch, updatedAt: new Date().toISOString() }
              : n,
          ),
        })),

      updateBlock: (noteId, blockId, html) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  updatedAt: new Date().toISOString(),
                  blocks: n.blocks.map((b) =>
                    b.id === blockId ? { ...b, html } : b,
                  ),
                }
              : n,
          ),
        })),

      replaceBlocks: (noteId, blocks) => {
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? { ...n, blocks, updatedAt: new Date().toISOString() }
              : n,
          ),
        }));
        /* La base des étiquettes apprend en écrivant : chaque enregistrement
           enregistre aussi les noms nouveaux. Le texte reste la vérité. */
        get().registerTags(tagsInBlocks(blocks));
      },

      addBlock: (noteId, afterBlockId) => {
        const newBlock: Block = {
          id: uid("b"),
          html: "",
          kind: "p",
          bullet: false,
          indent: 0,
        };
        set((s) => ({
          notes: s.notes.map((n) => {
            if (n.id !== noteId) return n;
            const index = afterBlockId
              ? n.blocks.findIndex((b) => b.id === afterBlockId)
              : n.blocks.length - 1;
            const blocks = [...n.blocks];
            blocks.splice(index + 1, 0, newBlock);
            return { ...n, blocks, updatedAt: new Date().toISOString() };
          }),
        }));
        return newBlock.id;
      },

      updateBlockMeta: (noteId, blockId, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  updatedAt: new Date().toISOString(),
                  blocks: n.blocks.map((b) =>
                    b.id === blockId ? { ...b, ...patch } : b,
                  ),
                }
              : n,
          ),
        })),

      removeBlock: (noteId, blockId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  updatedAt: new Date().toISOString(),
                  blocks: n.blocks.filter((b) => b.id !== blockId),
                }
              : n,
          ),
        })),

      setBlockMarked: (noteId, blockId, marked) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  blocks: n.blocks.map((b) =>
                    b.id === blockId ? { ...b, marked } : b,
                  ),
                }
              : n,
          ),
        })),

      trashNote: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id
              ? { ...n, deletedAt: new Date().toISOString() }
              : n,
          ),
        })),

      restoreNote: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, deletedAt: undefined } : n,
          ),
        })),

      purgeNote: (id) =>
        set((s) => {
          const questionIds = new Set(
            s.questions.filter((q) => q.noteId === id).map((q) => q.id),
          );
          const removedCards = new Set(
            s.links
              .filter((l) => questionIds.has(l.questionId))
              .map((l) => l.cardId),
          );
          return {
            notes: s.notes.filter((n) => n.id !== id),
            questions: s.questions.filter((q) => q.noteId !== id),
            links: s.links.filter((l) => !questionIds.has(l.questionId)),
            cards: s.cards.filter((c) => !removedCards.has(c.id)),
          };
        }),

      addQuestion: ({ noteId, text, blockId, passage }) => {
        const question: Question = {
          id: uid("q"),
          noteId,
          text,
          createdAt: new Date().toISOString(),
        };
        const link: QuestionLink = {
          id: uid("l"),
          questionId: question.id,
          blockId,
          passage,
          cardId: uid("card"),
        };
        const card: ReviewCard = {
          id: link.cardId,
          linkId: link.id,
          questionId: question.id,
          noteId,
          due: new Date().toISOString(),
          stability: 1.5,
          difficulty: 3,
          reps: 0,
          lapses: 0,
        };
        set((s) => ({
          questions: [question, ...s.questions],
          links: [link, ...s.links],
          cards: [card, ...s.cards],
          notes: s.notes.map((n) =>
            n.id === noteId
              ? { ...n, status: "questioned", updatedAt: new Date().toISOString() }
              : n,
          ),
        }));
        return question;
      },

      deleteQuestion: (questionId) =>
        set((s) => {
          const links = s.links.filter((l) => l.questionId !== questionId);
          const cardIds = links.map((l) => l.cardId);
          return {
            questions: s.questions.filter((q) => q.id !== questionId),
            links: s.links.filter((l) => l.questionId !== questionId),
            cards: s.cards.filter((c) => !cardIds.includes(c.id)),
          };
        }),

      rateCard: (cardId, rating, options) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        const next = nextCardState(card, rating, {
          retention: options?.retention,
        });
        set((s) => ({
          cards: s.cards.map((c) => (c.id === cardId ? { ...c, ...next } : c)),
          logs: [
            {
              id: uid("log"),
              cardId,
              rating,
              reviewedAt: new Date().toISOString(),
              scheduledDays: Math.round(
                (new Date(next.due).getTime() - Date.now()) / 86_400_000,
              ),
              elapsedDays: card.lastReview
                ? Math.max(
                    0,
                    Math.round(
                      (Date.now() - new Date(card.lastReview).getTime()) /
                        86_400_000,
                    ),
                  )
                : 0,
            },
            ...s.logs,
          ],
          notes: s.notes.map((n) =>
            n.id === card.noteId ? { ...n, status: "done" } : n,
          ),
        }));
      },

      rateZettel: (cardId, rating, options) => {
        const card = get().zettel.find((c) => c.id === cardId);
        if (!card) return;
        const current =
          card.schedule ?? {
            due: card.createdAt,
            stability: 0,
            difficulty: 0,
            reps: 0,
            lapses: 0,
            state: 0,
          };
        const next = nextCardState(current, rating, {
          retention: options?.retention,
        });
        const now = Date.now();
        set((s) => ({
          zettel: s.zettel.map((c) =>
            c.id === cardId ? { ...c, schedule: next, updatedAt: new Date(now).toISOString() } : c,
          ),
          logs: [
            {
              id: uid("log"),
              cardId,
              rating,
              reviewedAt: new Date(now).toISOString(),
              scheduledDays: Math.round((new Date(next.due).getTime() - now) / 86_400_000),
              elapsedDays: current.lastReview
                ? Math.max(
                    0,
                    Math.round((now - new Date(current.lastReview).getTime()) / 86_400_000),
                  )
                : 0,
            },
            ...s.logs,
          ],
        }));
      },

      resetReviewSession: () => set({}),

      createVault: ({ name, projectId, note }) => {
        const vault: ZettelVault = {
          id: uid("v"),
          projectId,
          createdAt: new Date().toISOString(),
          name: name.trim() || "Nouveau vault",
          note: note?.trim() || undefined,
        };
        set((s) => ({ vaults: [...s.vaults, vault] }));
        return vault;
      },

      renameVault: (id, patch) =>
        set((s) => ({
          vaults: s.vaults.map((vault) =>
            vault.id === id
              ? {
                  ...vault,
                  name: patch.name?.trim() || vault.name,
                  note: patch.note === undefined ? vault.note : patch.note.trim() || undefined,
                }
              : vault,
          ),
        })),

      /* Un vault qui contient des fiches ne se supprime pas en silence :
         on renvoie la raison, l’écran propose alors de déplacer les fiches. */
      deleteVault: (id) => {
        const cards = get().zettel.filter((card) => card.vaultId === id).length;
        if (cards > 0) {
          return {
            ok: false,
            reason: `Ce vault contient ${cards} fiche${cards > 1 ? "s" : ""}. Déplacez-les ou supprimez-les d’abord.`,
          };
        }
        const remaining = get().vaults.filter((vault) => vault.id !== id);
        set((s) => ({
          vaults: remaining,
          /* Les notes survivent à leur catégorie : elles redeviennent des
             notes du projet, sans être poussées dans une autre catégorie que
             personne n’a choisie. */
          notes: s.notes.map((note) =>
            note.vaultId === id ? { ...note, vaultId: undefined } : note,
          ),
        }));
        return { ok: true };
      },

      addZettelCard: ({ vaultId, title, body, source, refs = [] }) => {
        const cards = get().zettel.filter((c) => c.vaultId === vaultId);
        const nextIndex = cards.length + 1;
        const code = `#1${String.fromCharCode(64 + Math.min(26, Math.ceil(nextIndex / 9)))}${nextIndex % 9 || ""}`;
        const card: ZettelCard = {
          id: uid("z"),
          code,
          vaultId,
          title,
          body,
          source,
          refs,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ zettel: [card, ...s.zettel] }));
        return card;
      },

      updateZettelCard: (id, patch) =>
        set((s) => ({
          zettel: s.zettel.map((c) =>
            c.id === id
              ? { ...c, ...patch, updatedAt: new Date().toISOString() }
              : c,
          ),
        })),

      /* --------------------------- ÉTIQUETTES --------------------------- */

      /* La base ne devine rien : elle apprend les noms qu’on lui donne, une
         fois chacun, et garde l’orthographe de la première rencontre. Deux
         étiquettes ne peuvent pas ne différer que par la casse — sinon le
         menu en proposerait deux lignes identiques à l’œil. */
      registerTags: (names) => {
        const known = new Set((get().tags ?? []).map((tag) => tagKey(tag.name)));
        const fresh: Tag[] = [];
        for (const raw of names) {
          const name = normalizeTagName(raw);
          if (!name) continue;
          const key = tagKey(name);
          if (known.has(key)) continue;
          known.add(key);
          fresh.push({ id: uid("t"), name, createdAt: new Date().toISOString() });
        }
        if (fresh.length === 0) return;
        set((s) => ({ tags: [...(s.tags ?? []), ...fresh] }));
      },

      /* Le texte est la vérité : renommer dans la base sans réécrire les notes
         laisserait l’ancien nom partout. On fait donc les deux, et on refuse
         plutôt que de fusionner deux étiquettes en silence. */
      renameTag: (id, raw) => {
        const state = get();
        const target = (state.tags ?? []).find((tag) => tag.id === id);
        if (!target) return { ok: false, reason: "Cette étiquette n’existe plus." };

        const name = normalizeTagName(raw);
        if (!name) {
          return {
            ok: false,
            reason: "Une étiquette n’accepte ni espace ni ponctuation : lettres, chiffres, - et /.",
          };
        }
        const key = tagKey(name);
        if (key !== tagKey(target.name)) {
          const taken = (state.tags ?? []).some(
            (tag) => tag.id !== id && tagKey(tag.name) === key,
          );
          if (taken) return { ok: false, reason: "Une autre étiquette porte déjà ce nom." };
        }

        const now = new Date().toISOString();
        set({
          tags: (state.tags ?? []).map((tag) => (tag.id === id ? { ...tag, name } : tag)),
          notes: state.notes.map((note) => {
            const result = renameTagInBlocks(note.blocks, target.name, name);
            if (result.changed === 0) return note;
            return { ...note, blocks: result.blocks, updatedAt: now };
          }),
        });
        return { ok: true };
      },

      deleteTag: (id) => {
        const state = get();
        const target = (state.tags ?? []).find((tag) => tag.id === id);
        if (!target) return { ok: false, reason: "Cette étiquette n’existe plus." };

        const key = tagKey(target.name);
        const used = state.notes.filter(
          (note) =>
            !note.deletedAt &&
            tagsInBlocks(note.blocks).some((name) => tagKey(name) === key),
        ).length;
        if (used > 0) {
          return {
            ok: false,
            reason:
              used === 1
                ? "Une note porte encore cette étiquette : retirez-la du texte d’abord."
                : `${used} notes portent encore cette étiquette : retirez-la de leur texte d’abord.`,
          };
        }
        set({ tags: (state.tags ?? []).filter((tag) => tag.id !== id) });
        return { ok: true };
      },

      updateMindMap: (id, patch) =>
        set((s) => ({
          mindmaps: s.mindmaps.map((m) =>
            m.id === id
              ? { ...m, ...patch, updatedAt: new Date().toISOString() }
              : m,
          ),
          notes: s.notes.map((n) =>
            s.mindmaps.find((m) => m.id === id)?.noteId === n.id && patch.title
              ? { ...n, title: patch.title }
              : n,
          ),
        })),

      addMindNode: (mapId, parentId, shape, direction) => {
        const map = get().mindmaps.find((m) => m.id === mapId);
        const parent = map?.nodes.find((n) => n.id === parentId);
        if (!map) return "";

        /* Sans direction, on empile à droite comme avant. Avec une direction,
           la nouvelle forme se pose du côté de la poignée qu’on a touchée :
           c’est ce qui rend le geste prévisible, et c’est ce qui manquait pour
           dessiner une carte depuis zéro. */
        const siblings = map.edges.filter((e) => e.source === parentId).length;
        const delta = direction ? DELTA[direction] : { x: 210, y: 0 };
        const node: MindNode = {
          id: uid("mn"),
          text: "Nouvelle idée",
          shape,
          x: Math.round((parent?.x ?? 0) + delta.x),
          y: Math.round(
            (parent?.y ?? 0) + delta.y + (direction ? 0 : (siblings - 0.5) * 110),
          ),
          parentId,
        };
        set((s) => ({
          mindmaps: s.mindmaps.map((m) =>
            m.id === mapId
              ? {
                  ...m,
                  nodes: [...m.nodes, node],
                  edges: [
                    ...m.edges,
                    { id: uid("me"), source: parentId, target: node.id },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : m,
          ),
        }));
        return node.id;
      },

      addMindNodeAt: (mapId, options) => {
        const node: MindNode = {
          id: uid("mn"),
          text: options.text ?? "Nouvelle idée",
          shape: options.shape,
          x: Math.round(options.x),
          y: Math.round(options.y),
        };
        set((s) => ({
          mindmaps: s.mindmaps.map((m) =>
            m.id === mapId
              ? { ...m, nodes: [...m.nodes, node], updatedAt: new Date().toISOString() }
              : m,
          ),
        }));
        return node.id;
      },

      connectMindNodes: (mapId, source, target) =>
        set((s) => ({
          mindmaps: s.mindmaps.map((m) => {
            if (m.id !== mapId) return m;
            const source0 = m.nodes.find((n) => n.id === source);
            const target0 = m.nodes.find((n) => n.id === target);
            if (!source0 || !target0 || source === target) return m;
            /* Un seul trait par paire, dans un sens ou dans l’autre : deux
               flèches opposées entre deux formes ne disent rien de plus. */
            const exists = m.edges.some(
              (e) =>
                (e.source === source && e.target === target) ||
                (e.source === target && e.target === source),
            );
            if (exists) return m;
            /* Le lien pose aussi la filiation, sinon la carte n’aurait plus de
               hiérarchie : profondeur, repli et modèles en dépendent. */
            const nodes = m.nodes.map((n) =>
              n.id === target && !n.parentId ? { ...n, parentId: source } : n,
            );
            return {
              ...m,
              nodes,
              edges: [...m.edges, { id: uid("me"), source, target }],
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      updateMindEdge: (mapId, edgeId, patch) =>
        set((s) => ({
          mindmaps: s.mindmaps.map((m) =>
            m.id === mapId
              ? {
                  ...m,
                  edges: m.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)),
                  updatedAt: new Date().toISOString(),
                }
              : m,
          ),
        })),

      updateMindNode: (mapId, nodeId, patch) =>
        set((s) => ({
          mindmaps: s.mindmaps.map((m) =>
            m.id === mapId
              ? {
                  ...m,
                  nodes: m.nodes.map((n) =>
                    n.id === nodeId ? { ...n, ...patch } : n,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : m,
          ),
        })),

      removeMindNode: (mapId, nodeId) =>
        set((s) => ({
          mindmaps: s.mindmaps.map((m) => {
            if (m.id !== mapId) return m;
            const toRemove = new Set<string>([nodeId]);
            let grew = true;
            while (grew) {
              grew = false;
              m.nodes.forEach((n) => {
                if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) {
                  toRemove.add(n.id);
                  grew = true;
                }
              });
            }
            return {
              ...m,
              nodes: m.nodes.filter((n) => !toRemove.has(n.id)),
              edges: m.edges.filter(
                (e) => !toRemove.has(e.source) && !toRemove.has(e.target),
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      setEdgeStyle: (mapId, edgeStyle) =>
        set((s) => ({
          mindmaps: s.mindmaps.map((m) =>
            m.id === mapId ? { ...m, edgeStyle } : m,
          ),
        })),

      setLessonStep: (lessonId, step) =>
        set((s) => {
          const existing = s.progress.find((p) => p.lessonId === lessonId);
          return {
            progress: existing
              ? s.progress.map((p) =>
                  p.lessonId === lessonId ? { ...p, step } : p,
                )
              : [...s.progress, { lessonId, step }],
          };
        }),

      completeLesson: (lessonId) =>
        set((s) => {
          const doneAt = new Date().toISOString();
          const existing = s.progress.find((p) => p.lessonId === lessonId);
          return {
            progress: existing
              ? s.progress.map((p) =>
                  p.lessonId === lessonId ? { ...p, doneAt, step: 99 } : p,
                )
              : [...s.progress, { lessonId, step: 99, doneAt }],
          };
        }),

      replaceAll: (payload) => {
        const data = payload as Partial<ContentState>;
        if (!data || !Array.isArray(data.notes)) {
          throw new Error("Sauvegarde illisible : aucune note trouvée.");
        }
        set({
          projects: data.projects ?? [],
          notes: data.notes ?? [],
          questions: data.questions ?? [],
          links: data.links ?? [],
          cards: data.cards ?? [],
          logs: data.logs ?? [],
          vaults: data.vaults ?? [],
          zettel: data.zettel ?? [],
          mindmaps: data.mindmaps ?? [],
          progress: data.progress ?? [],
          tags: data.tags ?? [],
        });
        /* Une sauvegarde ancienne n’a pas de base d’étiquettes : on la
           reconstitue depuis le texte des notes importées. */
        for (const note of data.notes ?? []) get().registerTags(tagsInBlocks(note.blocks));
        return {
          notes: data.notes?.length ?? 0,
          cards: data.cards?.length ?? 0,
          zettel: data.zettel?.length ?? 0,
          lessons: data.progress?.filter((p) => p.doneAt).length ?? 0,
        };
      },

      exportPayload: () => {
        const {
          projects,
          notes,
          questions,
          links,
          cards,
          logs,
          vaults,
          zettel,
          mindmaps,
          progress,
          tags,
        } = get();
        return {
          app: "Einnote",
          version: 3,
          exportedAt: new Date().toISOString(),
          projects,
          notes,
          questions,
          links,
          cards,
          logs,
          vaults,
          zettel,
          mindmaps,
          progress,
          tags,
        };
      },
    }),
    {
      name: "engram.content.v1",
      version: 3,
      /* v1 n’avait pas de projets : tout est rattaché au projet par défaut,
         et les vaults héritent du même projet. */
      migrate: migrateContentData,
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Sélecteurs utiles                                                   */
/* ------------------------------------------------------------------ */

export function questionsForNote(
  state: ContentState,
  noteId: string,
): (Question & { passage: string; blockId: string; cardId: string })[] {
  return state.questions
    .filter((q) => q.noteId === noteId)
    .map((q) => {
      const link = state.links.find((l) => l.questionId === q.id);
      return {
        ...q,
        passage: link?.passage ?? "",
        blockId: link?.blockId ?? "",
        cardId: link?.cardId ?? "",
      };
    });
}

export function cardsForQuestion(
  state: ContentState,
  questionId: string,
): ReviewCard[] {
  return state.cards.filter((c) => c.questionId === questionId);
}

export function noteText(note: Note): string {
  return note.blocks.map((b) => blockHtmlToText(b.html)).join(" ");
}

export function lessonProgressFor(state: ContentState, lessonId: string) {
  return state.progress.find((p) => p.lessonId === lessonId);
}

export { seedLessons };
