import type { Note, ZettelCard, MindMapNode, MindMapEdge, Question, ReviewCard, Lesson } from "../types";

export const mockNotes: Note[] = [
  {
    id: "n1",
    method: "outline",
    title: "Introduction à la psychologie cognitive",
    contentJson: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Les bases de la cognition" }] },
        { type: "paragraph", content: [{ type: "text", text: "La psychologie cognitive étudie les processus mentaux impliqués dans la perception, la mémoire, la pensée et le langage." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Mémoire de travail" }] },
        { type: "paragraph", content: [{ type: "text", text: "La mémoire de travail est un système limité qui maintient et manipule des informations sur de courtes périodes." }] },
      ],
    },
    status: "questioned",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-16T14:30:00Z",
  },
  {
    id: "n2",
    method: "cornell",
    title: "Révolution française — Causes et conséquences",
    contentJson: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Causes de la Révolution" }] },
        { type: "paragraph", content: [{ type: "text", text: "Les causes profondes incluent les inégalités sociales, la crise financière, et les idées des Lumières." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Événements clés" }] },
        { type: "paragraph", content: [{ type: "text", text: "Prise de la Bastille, Déclaration des droits de l'homme, montée de Robespierre." }] },
      ],
    },
    status: "done",
    createdAt: "2024-01-14T09:00:00Z",
    updatedAt: "2024-01-15T16:00:00Z",
  },
  {
    id: "n3",
    method: "mindmap",
    title: "Architecture logicielle moderne",
    contentJson: { nodes: [], edges: [] },
    status: "draft",
    createdAt: "2024-01-13T11:00:00Z",
    updatedAt: "2024-01-13T11:00:00Z",
  },
  {
    id: "n4",
    method: "zettelkasten",
    title: "Coffret Zettelkasten",
    contentJson: null,
    status: "captured",
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-16T10:00:00Z",
  },
];

export const mockQuestions: Question[] = [
  { id: "q1", noteId: "n1", text: "Qu'est-ce que la mémoire de travail ?", createdAt: "2024-01-16T14:30:00Z" },
  { id: "q2", noteId: "n1", text: "Quels sont les principaux processus cognitifs étudiés ?", createdAt: "2024-01-16T14:32:00Z" },
  { id: "q3", noteId: "n2", text: "Quelles sont les causes profondes de la Révolution française ?", createdAt: "2024-01-15T16:00:00Z" },
];

export const mockZettelCards: ZettelCard[] = [
  {
    id: "z1",
    title: "La notion de schème chez Piaget",
    bodyJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Un schème est une structure cognitive organisant l'action et la compréhension." }] }] },
    sourceRef: "Piaget, J. (1952). Les origines de l'intelligence chez l'enfant.",
    refs: ["z2", "z3"],
    createdAt: "2024-01-12T10:00:00Z",
  },
  {
    id: "z2",
    title: "Assimilation et accommodation",
    bodyJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "L'assimilation intègre de nouvelles expériences dans les schèmes existants. L'accommodation modifie les schèmes." }] }] },
    sourceRef: "Piaget, ibid.",
    refs: ["z1"],
    createdAt: "2024-01-12T10:15:00Z",
  },
  {
    id: "z3",
    title: "Équilibration : moteur du développement",
    bodyJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "L'équilibration est le processus par lequel l'enfant cherche un équilibre entre assimilation et accommodation." }] }] },
    sourceRef: "Piaget, ibid.",
    refs: ["z1", "z2"],
    createdAt: "2024-01-12T10:30:00Z",
  },
];

export const mockMindMapNodes: MindMapNode[] = [
  { id: "mn1", x: 400, y: 200, shape: "circle", edgeStyle: "straight", text: "Architecture", color: "#0F766E" },
  { id: "mn2", x: 200, y: 100, shape: "rect", edgeStyle: "curve", text: "Microservices" },
  { id: "mn3", x: 600, y: 100, shape: "rect", edgeStyle: "curve", text: "Monolithe" },
  { id: "mn4", x: 200, y: 350, shape: "diamond", edgeStyle: "straight", text: "API Gateway" },
  { id: "mn5", x: 600, y: 350, shape: "square", edgeStyle: "step", text: "Database" },
];

export const mockMindMapEdges: MindMapEdge[] = [
  { id: "me1", source: "mn1", target: "mn2" },
  { id: "me2", source: "mn1", target: "mn3" },
  { id: "me3", source: "mn1", target: "mn4" },
  { id: "me4", source: "mn1", target: "mn5" },
];

export const mockReviewCards: ReviewCard[] = [
  {
    id: "rc1",
    sourceType: "question",
    sourceId: "q1",
    due: new Date().toISOString(),
    stability: 2.5,
    difficulty: 3.0,
    reps: 2,
    lapses: 0,
  },
  {
    id: "rc2",
    sourceType: "question",
    sourceId: "q2",
    due: new Date().toISOString(),
    stability: 1.8,
    difficulty: 4.0,
    reps: 1,
    lapses: 0,
  },
  {
    id: "rc3",
    sourceType: "question",
    sourceId: "q3",
    due: new Date().toISOString(),
    stability: 5.0,
    difficulty: 2.0,
    reps: 4,
    lapses: 0,
  },
  {
    id: "rc4",
    sourceType: "zettel",
    sourceId: "z1",
    due: new Date(Date.now() + 86400000).toISOString(),
    stability: 10.0,
    difficulty: 2.5,
    reps: 6,
    lapses: 0,
  },
];

export const mockLessons: Lesson[] = [
  { id: "l1", title: "Prise de notes en méthode Cornell", description: "Apprenez à structurer vos notes avec la méthode Cornell pour une mémorisation optimale.", duration: 3, completed: true, doneAt: "2024-01-10T10:00:00Z", category: "tutorial" },
  { id: "l2", title: "Créer des questions efficaces", description: "Transformez vos notes en questions pour une révision active et puissante.", duration: 4, completed: true, doneAt: "2024-01-11T14:00:00Z", category: "tutorial" },
  { id: "l3", title: "Fondateurs de la psychologie cognitive", description: "Parcourez les grands penseurs qui ont façonné la psychologie cognitive moderne.", duration: 8, completed: false, category: "course" },
  { id: "l4", title: "Théories de l'apprentissage", description: "Comprendre comment nous apprenons : behaviorisme, cognitivisme, constructivisme.", duration: 6, completed: false, category: "course" },
  { id: "l5", title: "Méthode Zettelkasten pratique", description: "Mettez en place votre système de fiches pour connecter vos idées.", duration: 5, completed: false, category: "tutorial" },
];
