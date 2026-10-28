import type {
  Project,
  Block,
  MindMap,
  Note,
  Question,
  QuestionLink,
  ReviewCard,
  ZettelCard,
  ZettelVault,
} from "@/types";

/**
 * Données de démonstration — **réservées aux tests**.
 *
 * L’application ne livre plus aucun exemple : un nouveau compte s’ouvre sur des
 * espaces vides, et rien de ce qui est écrit ici n’apparaît à l’écran. Ces
 * fixtures servent à vérifier les écrans sur du contenu réel plutôt que sur un
 * seul bloc vide.
 */
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const H = 3600_000;
const D = 24 * H;

const b = (
  id: string,
  html: string,
  extra: Partial<Block> = {},
): Block => ({
  id,
  html,
  kind: "p",
  bullet: false,
  indent: 0,
  ...extra,
});

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

/**
 * Un projet = un espace de travail. La note et le vault y sont rattachés ;
 * la bibliothèque et les créations suivent le projet ouvert.
 */
export const demoProjects: Project[] = [
  {
    id: "p-general",
    name: "Mes notes",
    description: "Espace principal",
    createdAt: iso(60 * D),
  },
  {
    id: "p-these",
    name: "Thèse",
    description: "Recherche, lectures, fiches",
    createdAt: iso(45 * D),
  },
  {
    id: "p-quantum",
    name: "Ordinateur quantique",
    description: "Cours et notes de recherche",
    createdAt: iso(30 * D),
  },
];

export const demoNotes: Note[] = [
  {
    id: "n-contrats",
    projectId: "p-general",
    method: "cornell",
    title: "Contrats commerciaux",
    collection: "Droit des affaires",
    status: "questioned",
    createdAt: iso(3 * D),
    updatedAt: iso(2 * H),
    blocks: [
      b("c1", "Conditions de validité (art. 1128) :", { bullet: true }),
      b(
        "c2",
        "– Consentement, exempt de vices<br/>– Capacité de contracter<br/>– Contenu licite et certain",
        { indent: 1, marked: true },
      ),
      b("c3", "Vice du consentement : erreur, dol, violence", {
        bullet: true,
      }),
      b("c4", "Sanction du vice : nullité relative, cinq ans (art. 2224).", {
        indent: 1,
      }),
      b("c5", "Effets : force obligatoire entre les parties", { bullet: true }),
      b(
        "c6",
        "Le juge ne peut pas réviser le contrat : il l’annule ou l’adapte si la loi le prévoit.",
      ),
    ],
  },
  {
    id: "n-systeme",
    projectId: "p-these",
    method: "mindmap",
    title: "Système nerveux",
    collection: "Thèse",
    status: "captured",
    createdAt: iso(4 * D),
    updatedAt: iso(1 * D),
    mindmapId: "m-systeme",
    blocks: [],
  },
  {
    id: "n-inflation",
    projectId: "p-these",
    method: "zettelkasten",
    title: "Inflation et épargne",
    collection: "Thèse",
    status: "done",
    createdAt: iso(9 * D),
    updatedAt: iso(3 * D),
    vaultId: "v-eco",
    blocks: [],
  },
  {
    id: "n-plan",
    projectId: "p-these",
    method: "outline",
    title: "Plan du chapitre 3",
    collection: "Thèse",
    status: "questioned",
    createdAt: iso(8 * D),
    updatedAt: iso(3 * D),
    blocks: [
      b("p1", "3. Lire un article scientifique", { kind: "h2" }),
      b("p2", "Résumé d’abord : question, méthode, résultat, limite.", {
        bullet: true,
      }),
      b("p3", "Introduction : ce que les auteurs veulent démontrer.", {
        bullet: true,
      }),
      b("p4", "Discussion : ce que les résultats permettent de conclure.", {
        bullet: true,
      }),
      b("p5", "Méthode en dernier : pour vérifier, pas pour découvrir.", {
        bullet: true,
      }),
      b("p6", "4. Lire une documentation technique", { kind: "h2" }),
      b("p7", "Principe 20/80 : chercher les vingt pour cent qui font le travail.", {
        bullet: true,
      }),
      b("p8", "Écrire l’exemple minimal qui marche, puis le casser volontairement.", {
        bullet: true,
      }),
    ],
  },
  {
    id: "n-marche",
    projectId: "p-general",
    method: "cornell",
    title: "Le marché du travail",
    collection: "Thèse",
    status: "questioned",
    createdAt: iso(12 * D),
    updatedAt: iso(5 * D),
    blocks: [
      b("m1", "Offre et demande de travail", { kind: "h2" }),
      b("m2", "Le salaire réel ajuste l’offre et la demande.", { bullet: true }),
      b("m3", "Le salaire nominal est rigide à la baisse : chômage involontaire.", {
        bullet: true,
        indent: 1,
      }),
      b("m4", "Taux de chômage = chômeurs / population active.", { bullet: true }),
      b("m5", "Halo autour du chômage : temps partiel subi, découragement.", {
        bullet: true,
      }),
    ],
  },
  /* Un projet découpé en catégories : c’est l’exemple qui explique le modèle
     mieux qu’un texte d’aide — deux vaults, trois notes, aucun graphe. */
  {
    id: "n-superposition",
    projectId: "p-quantum",
    vaultId: "v-superposition",
    method: "cornell",
    title: "Superposition : définition",
    collection: "Physique quantique",
    status: "done",
    createdAt: iso(21 * D),
    updatedAt: iso(2 * D),
    blocks: [
      b("s1", "Un état superposé n’est pas « les deux à la fois »", { kind: "h2" }),
      b("s2", "|ψ⟩ = α|0⟩ + β|1⟩ : deux amplitudes, pas deux réalités.", {
        bullet: true,
      }),
      b("s3", "Mesurer projette l’état ; c’est l’appareil qui choisit la base.", {
        bullet: true,
      }),
      b("s4", "α et β sont complexes : la phase relative est observable.", {
        bullet: true,
        indent: 1,
      }),
      b("s5", "Question : pourquoi la décohérence ne se voit-elle pas à notre échelle ?", {
        kind: "quote",
      }),
    ],
  },
  {
    id: "n-fentes",
    projectId: "p-quantum",
    vaultId: "v-superposition",
    method: "outline",
    title: "L’expérience des deux fentes",
    collection: "Physique quantique",
    status: "captured",
    createdAt: iso(18 * D),
    updatedAt: iso(4 * D),
    blocks: [
      b("f1", "Le dispositif", { kind: "h2" }),
      b("f2", "Une source, un écran percé de deux fentes, une plaque sensible.", {
        bullet: true,
      }),
      b("f3", "Fentes ouvertes : franges d’interférence. Une fente fermée : une bande.", {
        bullet: true,
      }),
      b("f4", "Ce que cela montre", { kind: "h2" }),
      b("f5", "L’amplitude passe par les deux chemins ; la probabilité est son carré.", {
        bullet: true,
      }),
      b("f6", "Mesurer le chemin détruit les franges : l’information compte.", {
        bullet: true,
      }),
    ],
  },
  {
    id: "n-epr",
    projectId: "p-quantum",
    vaultId: "v-intrication",
    method: "cornell",
    title: "Le paradoxe EPR",
    collection: "Physique quantique",
    status: "questioned",
    createdAt: iso(12 * D),
    updatedAt: iso(1 * D),
    blocks: [
      b("e1", "Einstein, Podolsky, Rosen (1935)", { kind: "h2" }),
      b("e2", "Si l’on mesure l’un, l’autre est déterminé instantanément.", {
        bullet: true,
      }),
      b("e3", "EPR en conclut que la mécanique quantique est incomplète.", {
        bullet: true,
      }),
      b("e4", "Réponse : aucune information ne voyage ; les corrélations sont locales au sens de Bell.", {
        bullet: true,
        indent: 1,
      }),
      b("e5", "À vérifier : l’inégalité de Bell, et ce que son violation interdit.", {
        kind: "quote",
      }),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Questions et cartes                                                 */
/* ------------------------------------------------------------------ */

interface SeedQuestionDef {
  noteId: string;
  text: string;
  links: { blockId: string; passage: string }[];
}

/**
 * Une question peut pointer vers plusieurs passages : chaque liaison
 * produit sa propre carte (règle 3.3 du cahier des charges).
 */
const demoQuestionDefs: SeedQuestionDef[] = [
  {
    noteId: "n-contrats",
    text: "Quelles sont les trois conditions de validité du contrat ?",
    links: [
      {
        blockId: "c1",
        passage: "Conditions de validité (art. 1128)",
      },
      {
        blockId: "c2",
        passage:
          "Consentement, exempt de vices — Capacité de contracter — Contenu licite et certain",
      },
    ],
  },
  {
    noteId: "n-contrats",
    text: "Qu’est-ce qui vicie le consentement ?",
    links: [
      {
        blockId: "c3",
        passage: "Vice du consentement : erreur, dol, violence",
      },
    ],
  },
  {
    noteId: "n-contrats",
    text: "Quel est l’effet principal du contrat ?",
    links: [
      {
        blockId: "c5",
        passage: "Effets : force obligatoire entre les parties",
      },
      {
        blockId: "c6",
        passage:
          "Le juge ne peut pas réviser le contrat : il l’annule ou l’adapte si la loi le prévoit.",
      },
    ],
  },
  {
    noteId: "n-plan",
    text: "Que lit-on en premier dans un article scientifique ?",
    links: [
      {
        blockId: "p2",
        passage: "Résumé d’abord : question, méthode, résultat, limite.",
      },
    ],
  },
  {
    noteId: "n-plan",
    text: "À quoi sert la discussion d’un article ?",
    links: [
      {
        blockId: "p4",
        passage: "Discussion : ce que les résultats permettent de conclure.",
      },
    ],
  },
  {
    noteId: "n-plan",
    text: "Pourquoi lire la méthode en dernier ?",
    links: [
      {
        blockId: "p5",
        passage: "Méthode en dernier : pour vérifier, pas pour découvrir.",
      },
    ],
  },
  {
    noteId: "n-plan",
    text: "Quel est le principe 20/80 d’une documentation technique ?",
    links: [
      {
        blockId: "p7",
        passage:
          "Principe 20/80 : chercher les vingt pour cent qui font le travail.",
      },
    ],
  },
  {
    noteId: "n-plan",
    text: "Comment vérifier qu’on a compris une documentation ?",
    links: [
      {
        blockId: "p8",
        passage:
          "Écrire l’exemple minimal qui marche, puis le casser volontairement.",
      },
    ],
  },
  {
    noteId: "n-marche",
    text: "Qu’est-ce qui ajuste l’offre et la demande de travail ?",
    links: [
      {
        blockId: "m2",
        passage: "Le salaire réel ajuste l’offre et la demande.",
      },
    ],
  },
  {
    noteId: "n-marche",
    text: "Pourquoi le chômage involontaire existe-t-il ?",
    links: [
      {
        blockId: "m3",
        passage:
          "Le salaire nominal est rigide à la baisse : chômage involontaire.",
      },
    ],
  },
];

export const demoQuestions: Question[] = demoQuestionDefs.map((def, index) => ({
  id: `q-${index + 1}`,
  noteId: def.noteId,
  text: def.text,
  createdAt: iso((index + 1) * 3 * H),
}));

export const demoLinks: QuestionLink[] = demoQuestionDefs.flatMap((def, index) =>
  def.links.map((link, linkIndex) => ({
    id: `l-${index + 1}-${linkIndex + 1}`,
    questionId: `q-${index + 1}`,
    blockId: link.blockId,
    passage: link.passage,
    cardId: `card-${index + 1}-${linkIndex + 1}`,
  })),
);

const CARD_SHAPE = [
  { stability: 3, difficulty: 3.2, reps: 2 },
  { stability: 1.5, difficulty: 4.1, reps: 1 },
  { stability: 1.5, difficulty: 2.6, reps: 4 },
  { stability: 7, difficulty: 2.1, reps: 3 },
  { stability: 3, difficulty: 3.8, reps: 1 },
  { stability: 1.5, difficulty: 4.4, reps: 0 },
  { stability: 3, difficulty: 2.9, reps: 1 },
  { stability: 7, difficulty: 2.7, reps: 2 },
  { stability: 1.5, difficulty: 3.0, reps: 0 },
  { stability: 1.5, difficulty: 4.6, reps: 2 },
  { stability: 3, difficulty: 3.3, reps: 1 },
  { stability: 1.5, difficulty: 2.4, reps: 0 },
];

const noteIdByQuestion = new Map(
  demoQuestionDefs.map((def, index) => [`q-${index + 1}`, def.noteId]),
);

export const demoCards: ReviewCard[] = demoLinks.map((link, index) => {
  const shape = CARD_SHAPE[index] ?? { stability: 1.5, difficulty: 3, reps: 0 };
  return {
    id: link.cardId,
    linkId: link.id,
    questionId: link.questionId,
    noteId: noteIdByQuestion.get(link.questionId) ?? "",
    due: iso((index % 4) * 40 * 60_000),
    stability: shape.stability,
    difficulty: shape.difficulty,
    reps: shape.reps,
    lapses: index % 5 === 1 ? 1 : 0,
  };
});

/* ------------------------------------------------------------------ */
/* Zettelkasten                                                        */
/* ------------------------------------------------------------------ */

export const demoVaults: ZettelVault[] = [
  {
    id: "v-eco",
    projectId: "p-these",
    name: "Économie",
    note: "Monnaie, prix, travail",
    createdAt: iso(34 * D),
  },
  {
    id: "v-superposition",
    projectId: "p-quantum",
    name: "Superposition quantique",
    note: "Définition, expériences, paradoxes",
    createdAt: iso(24 * D),
  },
  {
    id: "v-intrication",
    projectId: "p-quantum",
    name: "Intrication quantique",
    note: "Corrélations à distance, EPR, Bell",
    createdAt: iso(20 * D),
  },
];

export const demoZettel: ZettelCard[] = [
  {
    id: "z1a",
    code: "#1A",
    vaultId: "v-eco",
    title: "L’inflation et l’épargne",
    body:
      "Quand les prix montent plus vite que les intérêts, l’épargne perd de sa valeur réelle.",
    source: "Livre X, p. 42",
    refs: ["#1A1", "#1B"],
    createdAt: iso(20 * D),
    updatedAt: iso(3 * D),
  },
  {
    id: "z1a1",
    code: "#1A1",
    vaultId: "v-eco",
    title: "L’impact sur les ménages",
    body:
      "Les ménages modestes consomment une part plus grande de leur revenu : l’inflation les touche d’abord par l’alimentation et l’énergie.",
    source: "Livre X, p. 45",
    refs: ["#1A", "#1A1a"],
    createdAt: iso(19 * D),
    updatedAt: iso(6 * D),
  },
  {
    id: "z1a1a",
    code: "#1A1a",
    vaultId: "v-eco",
    title: "Le pouvoir d’achat",
    body:
      "Le pouvoir d’achat mesure ce qu’un revenu permet d’acheter. Il baisse quand les prix montent plus vite que le revenu.",
    source: "Note de cours, semaine 3",
    refs: ["#1A1"],
    createdAt: iso(18 * D),
    updatedAt: iso(8 * D),
  },
  {
    id: "z1a2",
    code: "#1A2",
    vaultId: "v-eco",
    title: "Le taux d’intérêt réel",
    body:
      "Le taux réel, c’est le taux affiché moins l’inflation. S’il est négatif, épargner fait perdre du pouvoir d’achat.",
    source: "Livre X, p. 44",
    refs: ["#1A", "#1B"],
    createdAt: iso(17 * D),
    updatedAt: iso(5 * D),
  },
  {
    id: "z1b",
    code: "#1B",
    vaultId: "v-eco",
    title: "Le taux d’intérêt nominal",
    body:
      "Taux inscrit au contrat, avant correction de l’inflation. Il ne dit rien du rendement réel d’un placement.",
    source: "Livre X, p. 44",
    refs: ["#1A2", "#1B1"],
    createdAt: iso(16 * D),
    updatedAt: iso(9 * D),
  },
  {
    id: "z1b1",
    code: "#1B1",
    vaultId: "v-eco",
    title: "L’anticipation de l’inflation",
    body:
      "Les agents forment des anticipations avec les prix passés et les annonces de la banque centrale. Une anticipation élevée entretient l’inflation.",
    source: "Article Y, section 2",
    refs: ["#1B", "#1E"],
    createdAt: iso(15 * D),
    updatedAt: iso(10 * D),
  },
  {
    id: "z1c",
    code: "#1C",
    vaultId: "v-eco",
    title: "L’épargne de précaution",
    body:
      "On épargne d’abord pour faire face à l’imprévu. Plus l’incertitude est forte, plus cette épargne augmente.",
    source: "Livre Y, ch. 2",
    refs: ["#1C1"],
    createdAt: iso(14 * D),
    updatedAt: iso(11 * D),
  },
  {
    id: "z1c1",
    code: "#1C1",
    vaultId: "v-eco",
    title: "Le chômage partiel",
    body:
      "Le chômage partiel soutient le revenu disponible pendant une crise : il limite la baisse de la consommation.",
    source: "Note de cours, semaine 5",
    refs: ["#1C"],
    createdAt: iso(13 * D),
    updatedAt: iso(11 * D),
  },
  {
    id: "z1d",
    code: "#1D",
    vaultId: "v-eco",
    title: "L’indexation des salaires",
    body:
      "Quand les salaires suivent les prix, l’inflation se transmet plus vite : c’est un mécanisme d’amplification.",
    source: "Article Z, p. 8",
    refs: ["#1E"],
    createdAt: iso(12 * D),
    updatedAt: iso(12 * D),
  },
  {
    id: "z1e",
    code: "#1E",
    vaultId: "v-eco",
    title: "La spirale prix-salaires",
    body:
      "Les prix augmentent, les salaires suivent, les entreprises répercutent : la boucle ne s’arrête que si la demande ralentit.",
    source: "Article Z, p. 9",
    refs: ["#1D", "#1F"],
    createdAt: iso(11 * D),
    updatedAt: iso(12 * D),
  },
  {
    id: "z1f",
    code: "#1F",
    vaultId: "v-eco",
    title: "La banque centrale",
    body:
      "Elle fixe le taux directeur. En le relevant, elle renchérit le crédit et refroidit la demande.",
    source: "Livre Y, ch. 7",
    refs: ["#1F1", "#1B1"],
    createdAt: iso(10 * D),
    updatedAt: iso(13 * D),
  },
  {
    id: "z1f1",
    code: "#1F1",
    vaultId: "v-eco",
    title: "Le taux directeur",
    body:
      "Taux auquel les banques se refinançent auprès de la banque centrale. Il donne le ton à tous les autres taux.",
    source: "Livre Y, ch. 7",
    refs: ["#1F"],
    createdAt: iso(9 * D),
    updatedAt: iso(13 * D),
  },
];

/* ------------------------------------------------------------------ */
/* Cartes mentales                                                     */
/* ------------------------------------------------------------------ */

export const demoMindMaps: MindMap[] = [
  {
    id: "m-systeme",
    noteId: "n-systeme",
    title: "Système nerveux",
    edgeStyle: "curved",
    updatedAt: iso(1 * D),
    nodes: [
      { id: "mn0", text: "Système nerveux", shape: "circle", x: 60, y: 200 },
      { id: "mn1", text: "Central", shape: "rect", x: -90, y: 90, parentId: "mn0" },
      {
        id: "mn2",
        text: "Périphérique",
        shape: "rect",
        x: 250,
        y: 90,
        parentId: "mn0",
      },
      {
        id: "mn3",
        text: "Encéphale",
        shape: "rect",
        x: -200,
        y: -20,
        parentId: "mn1",
      },
      {
        id: "mn4",
        text: "Moelle épinière",
        shape: "rect",
        x: -190,
        y: 200,
        parentId: "mn1",
      },
      {
        id: "mn5",
        text: "Somatique",
        shape: "rect",
        x: 300,
        y: -20,
        parentId: "mn2",
      },
      {
        id: "mn6",
        text: "Autonome",
        shape: "diamond",
        x: 260,
        y: 200,
        parentId: "mn2",
      },
    ],
    edges: [
      { id: "me1", source: "mn0", target: "mn1" },
      { id: "me2", source: "mn0", target: "mn2" },
      { id: "me3", source: "mn1", target: "mn3" },
      { id: "me4", source: "mn1", target: "mn4" },
      { id: "me5", source: "mn2", target: "mn5" },
      { id: "me6", source: "mn2", target: "mn6" },
    ],
  },
];

/**
 * Installe la démonstration dans le magasin.
 *
 * Les tests d’écran ont besoin de contenu pour vérifier un tri, un graphe ou une
 * révision ; l’application, elle, démarre vide. Ce sont donc les tests qui
 * demandent explicitement la démonstration.
 */
export const demoContent = {
  projects: demoProjects,
  notes: demoNotes,
  questions: demoQuestions,
  links: demoLinks,
  cards: demoCards,
  vaults: demoVaults,
  zettel: demoZettel,
  mindmaps: demoMindMaps,
  logs: [],
  progress: [],
};
