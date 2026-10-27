import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Block,
  EdgeStyle,
  LessonProgress,
  Method,
  MindMap,
  MindNode,
  Note,
  Project,
  Question,
  QuestionLink,
  Rating,
  ReviewCard,
  ReviewLog,
  ZettelCard,
  ZettelVault,
} from "@/types";
import {
  seedCards,
  seedLessons,
  seedProjects,
  seedLinks,
  seedMindMaps,
  seedNotes,
  seedQuestions,
  seedVaults,
  seedZettel,
} from "@/data/seed";
import { nextCardState } from "@/lib/scheduler";
import { DEFAULT_MINDMAP_TEMPLATE } from "@/lib/templates/mindmaps";
import {
  mindmapFromTemplate,
  type MindmapSeed,
} from "@/lib/templates/apply";

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const DEFAULT_PROJECT_ID = "p-general";

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
  rateCard: (cardId: string, rating: Rating) => void;
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
  addMindNode: (mapId: string, parentId: string, shape: MindNode["shape"]) => void;
  updateMindNode: (mapId: string, nodeId: string, patch: Partial<MindNode>) => void;
  removeMindNode: (mapId: string, nodeId: string) => void;
  setEdgeStyle: (mapId: string, edgeStyle: EdgeStyle) => void;

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
 * Migration v1 → v2 : les données n’avaient pas de projets.
 *
 * Tout est rattaché au premier projet connu (sinon au projet par défaut) ;
 * aucun note ni coffre n’est laissé orphelin, ce qui garantit qu’un
 * utilisateur existant retrouve ses notes après la mise à jour.
 */
export function migrateContentData(persisted: unknown, version: number) {
  const state = persisted as Partial<ContentState> | undefined;
  if (!state) return state as never;
  if (version >= 2) return state as never;

  const projects =
    state.projects && state.projects.length > 0 ? state.projects : seedProjects;
  const projectId = projects[0]?.id ?? DEFAULT_PROJECT_ID;

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
  } as never;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      projects: seedProjects,
      notes: seedNotes,
      questions: seedQuestions,
      links: seedLinks,
      cards: seedCards,
      logs: [],
      vaults: seedVaults,
      zettel: seedZettel,
      mindmaps: seedMindMaps,
      progress: [],

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
        const projectId =
          options?.projectId ??
          get().projects[0]?.id ??
          DEFAULT_PROJECT_ID;
        const note: Note = {
          id: uid("n"),
          projectId,
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

        if (method === "zettelkasten") {
          /* Un coffre appartient à un projet. S’il n’en existe pas encore,
             on le crée : sinon la note tombe dans le coffre d’un autre
             projet, ce qui est le bug le plus déroutant de l’écran. */
          const existing = get().vaults.find((v) => v.projectId === projectId);
          if (existing) {
            note.vaultId = existing.id;
          } else {
            const project = get().projects.find((p) => p.id === projectId);
            const vault: ZettelVault = {
              id: uid("v"),
              projectId,
              name: `Coffre ${project?.name ?? "principal"}`,
              note: "Fiches créées depuis cet espace",
            };
            set((s) => ({ vaults: [...s.vaults, vault] }));
            note.vaultId = vault.id;
          }
        }

        set((s) => ({ notes: [note, ...s.notes] }));
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

      replaceBlocks: (noteId, blocks) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? { ...n, blocks, updatedAt: new Date().toISOString() }
              : n,
          ),
        })),

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

      rateCard: (cardId, rating) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        const next = nextCardState(card, rating);
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

      resetReviewSession: () => set({}),

      createVault: ({ name, projectId, note }) => {
        const vault: ZettelVault = {
          id: uid("v"),
          projectId,
          name: name.trim() || "Nouveau coffre",
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

      /* Un coffre qui contient des fiches ne se supprime pas en silence :
         on renvoie la raison, l’écran propose alors de déplacer les fiches. */
      deleteVault: (id) => {
        const cards = get().zettel.filter((card) => card.vaultId === id).length;
        if (cards > 0) {
          return {
            ok: false,
            reason: `Ce coffre contient ${cards} fiche${cards > 1 ? "s" : ""}. Déplacez-les ou supprimez-les d’abord.`,
          };
        }
        const remaining = get().vaults.filter((vault) => vault.id !== id);
        set((s) => ({
          vaults: remaining,
          notes: s.notes.map((note) =>
            note.vaultId === id
              ? { ...note, vaultId: remaining[0]?.id }
              : note,
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

      addMindNode: (mapId, parentId, shape) => {
        const map = get().mindmaps.find((m) => m.id === mapId);
        const parent = map?.nodes.find((n) => n.id === parentId);
        if (!map) return;
        const siblings = map.edges.filter((e) => e.source === parentId).length;
        const node: MindNode = {
          id: uid("mn"),
          text: "Nouvelle idée",
          shape,
          x: (parent?.x ?? 0) + 210,
          y: (parent?.y ?? 0) + (siblings - 0.5) * 110,
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
      },

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
          projects:
            data.projects && data.projects.length > 0
              ? data.projects
              : seedProjects,
          notes: data.notes ?? [],
          questions: data.questions ?? [],
          links: data.links ?? [],
          cards: data.cards ?? [],
          logs: data.logs ?? [],
          vaults: data.vaults ?? seedVaults,
          zettel: data.zettel ?? [],
          mindmaps: data.mindmaps ?? [],
          progress: data.progress ?? [],
        });
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
        } = get();
        return {
          app: "Engram",
          version: 2,
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
        };
      },
    }),
    {
      name: "engram.content.v1",
      version: 2,
      /* v1 n’avait pas de projets : tout est rattaché au projet par défaut,
         et les coffres héritent du même projet. */
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
