import type {
  Project,
  Block,
  Lesson,
  MindMap,
  Note,
  Question,
  QuestionLink,
  ReviewCard,
  ZettelCard,
  ZettelVault,
} from "@/types";

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
export const seedProjects: Project[] = [
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
];

export const seedNotes: Note[] = [
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
const seedQuestionDefs: SeedQuestionDef[] = [
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

export const seedQuestions: Question[] = seedQuestionDefs.map((def, index) => ({
  id: `q-${index + 1}`,
  noteId: def.noteId,
  text: def.text,
  createdAt: iso((index + 1) * 3 * H),
}));

export const seedLinks: QuestionLink[] = seedQuestionDefs.flatMap((def, index) =>
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
  seedQuestionDefs.map((def, index) => [`q-${index + 1}`, def.noteId]),
);

export const seedCards: ReviewCard[] = seedLinks.map((link, index) => {
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

export const seedVaults: ZettelVault[] = [
  {
    id: "v-eco",
    projectId: "p-these",
    name: "Économie",
    note: "Monnaie, prix, travail",
  },
];

export const seedZettel: ZettelCard[] = [
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

export const seedMindMaps: MindMap[] = [
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

/* ------------------------------------------------------------------ */
/* Leçons                                                             */
/* ------------------------------------------------------------------ */

export const seedLessons: Lesson[] = [
  /* ---------- Couche 0 : le socle, « où vivent les notes » ----------
     Placée en tête parce que c’est la question qui précède toutes les autres :
     avant de choisir entre outline et Cornell, il faut savoir dans quoi la note
     va tomber. Un projet contient des vaults, un vault contient des notes. */
  {
    id: "x-1",
    track: 3,
    index: 1,
    title: "Un projet, des vaults, des notes",
    subtitle: "La seule hiérarchie de l’app, en trois minutes",
    minutes: 3,
    steps: [
      {
        title: "Un projet est un chantier, pas un dossier",
        body:
          "« Thèse », « Droit des affaires », « Maison » : un projet délimite un travail qui a un début, une fin et des sources. Il ne range pas des fichiers, il décide de ce qui va ensemble. Au départ vous en avez deux, « Mes notes » et « Thèse » — et un projet peut en contenir beaucoup d’autres.",
        illustration: "map",
        practice: {
          title: "À vous",
          text: "Ouvrez Espaces : vos deux projets y sont, avec le nombre de vaults de chacun.",
          href: "/spaces",
          hrefLabel: "Ouvrir Espaces",
        },
      },
      {
        title: "Un vault est un sujet à l’intérieur du projet",
        body:
          "Dans « Thèse », le vault « Économie » rassemble les fiches sur la monnaie, les prix et le travail. Un projet porte plusieurs vaults : un par question, jamais un par source. Deux lectures du même sujet partagent un vault ; deux sujets voisins n’en partagent pas.",
        illustration: "cards",
      },
      {
        title: "Une note raconte, une fiche relie",
        body:
          "Une note — outline, Cornell, carte mentale — garde la trace d’un moment de lecture, avec son contexte. Une fiche de vault isole une seule idée et la cite par son code : #1A appelle #1A1. Les deux vivent dans le même projet ; seules les fiches se rangent en vaults, et c’est ce qui rend le graphe lisible.",
        illustration: "book",
      },
    ],
  },
  {
    id: "x-2",
    track: 3,
    index: 2,
    title: "Créer un projet",
    subtitle: "Nommer, c’est déjà décider",
    minutes: 2,
    steps: [
      {
        title: "Un nom précis vaut un rangement",
        body:
          "« Mémoire M2 » range ; « Divers » n’existe pas, parce que tout y entre. Si deux noms conviennent au même contenu, c’est que le contenu relève de deux projets — et il vaut mieux le séparer maintenant qu’après cinquante notes.",
        illustration: "book",
      },
      {
        title: "Un projet en deux gestes",
        body:
          "Espaces, étape 1 : « Nouveau projet », un nom, c’est tout. Le projet apparaît aussitôt dans la liste des projets et dans les filtres de la bibliothèque. Aucun dossier à créer à côté, aucun fichier à déplacer.",
        illustration: "map",
        practice: {
          title: "À vous",
          text: "Créez un projet pour le travail en cours, puis revenez sur Espaces.",
          href: "/spaces?new=1",
          hrefLabel: "Créer un projet",
        },
      },
    ],
  },
  {
    id: "x-3",
    track: 3,
    index: 3,
    title: "Ouvrir un vault dans ce projet",
    subtitle: "Un vault relie, un dossier range",
    minutes: 2,
    steps: [
      {
        title: "Le vault est le seul endroit qui relie",
        body:
          "Les fiches d’un vault se citent entre elles et le graphe montre ce qui revient d’une source à l’autre. C’est pour cela qu’il ne se crée pas « à part » : il appartient à un projet, et il emprunte son nom à une question, pas à un auteur.",
        illustration: "map",
      },
      {
        title: "Deux fiches qui ne se parlent pas",
        body:
          "Si deux fiches ne se citeront jamais, elles n’ont rien à faire dans le même vault. Si trois sources disent la même chose autrement, elles en ont besoin : ce sont ces recoupements que vous relirez dans six mois.",
        illustration: "cards",
      },
      {
        title: "Le vault se crée depuis le projet",
        body:
          "Espaces, étape 2 : choisissez le projet, nommez le vault. La page des vaults garde le projet d’origine, si bien que vous n’avez jamais à le re-sélectionner. Un projet sans vault reste possible : toutes ses notes y vivent à plat.",
        illustration: "book",
        practice: {
          title: "À vous",
          text: "Ajoutez un vault au projet créé à l’étape précédente.",
          href: "/spaces",
          hrefLabel: "Ouvrir un vault",
        },
      },
    ],
  },
  {
    id: "x-4",
    track: 3,
    index: 4,
    title: "Écrire la première note",
    subtitle: "La bonne méthode dépend du moment, pas du goût",
    minutes: 3,
    steps: [
      {
        title: "Trois moments, trois méthodes",
        body:
          "Devant un plan à construire, l’outline. Devant un texte à retenir, Cornell : note, puis questions en marge. Devant un sujet qui part dans tous les sens, la carte mentale. Choisir la méthode est un choix sur l’état de vos idées, pas sur votre style.",
        illustration: "book",
      },
      {
        title: "La note appartient au projet",
        body:
          "Une note se crée avec le bouton « + » de la barre, et se range dans un projet au moment de l’écrire. Ce n’est qu’après qu’on décide si elle donne une fiche : toutes les notes ne méritent pas un vault, et c’est très bien ainsi.",
        illustration: "cards",
        practice: {
          title: "À vous",
          text: "Écrivez une note Cornell de trois lignes dans votre nouveau projet.",
          href: "/new",
          hrefLabel: "Écrire une note",
        },
      },
    ],
  },
  {
    id: "x-5",
    track: 3,
    index: 5,
    title: "Retrouver ce qu’on a écrit",
    subtitle: "Quatre portes, un seul contenu",
    minutes: 3,
    steps: [
      {
        title: "Quatre portes, et aucune n’est un doublon",
        body:
          "Notes : la bibliothèque, toutes les notes de tous les projets. Espaces : la carte — quel projet, quels vaults, quelles fiches. Réviser : ce qui est dû aujourd’hui, par projet, par vault ou par note. Studio des cartes : l’apparence des fiches, jamais leur contenu.",
        illustration: "review",
        practice: {
          title: "À vous",
          text: "Ouvrez Réviser : la séance du jour, filtrée sur votre projet.",
          href: "/review",
          hrefLabel: "Ouvrir Réviser",
        },
      },
      {
        title: "La révision ne se déclenche pas toute seule",
        body:
          "Une fiche ne devient pas une carte de révision par magie : c’est la question posée sur un passage qui la crée. Sans question, une note reste une note — utile, mais pas encore mémorisée.",
        illustration: "question",
      },
      {
        title: "Le test des dix secondes",
        body:
          "Prenez une idée que vous avez notée la semaine dernière. Si vous ne la retrouvez pas en dix secondes, ce n’est pas votre mémoire qui est en cause mais le rangement : le projet est trop large, ou le vault n’existe pas encore.",
        illustration: "timer",
      },
    ],
  },

  /* ---------- Couche A : tutoriels par outil ---------- */
  {
    id: "t-outline",
    track: 1,
    index: 1,
    title: "Outline : structurer avant d’écrire",
    subtitle: "La méthode la plus légère",
    minutes: 3,
    method: "outline",
    steps: [
      {
        title: "Un paragraphe, une idée",
        body:
          "L’Outline range les idées par indentation, comme un plan. Chaque paragraphe reste un bloc indépendant : vous pourrez le déplacer, le lier à une question, le retrouver plus tard.",
        illustration: "book",
      },
      {
        title: "Descendre plutôt qu’élargir",
        body:
          "Quand une idée appelle un détail, pressez « + » : vous créez un niveau inférieur. Quand elle appelle une idée voisine, revenez d’un cran. Une note lisible tient en trois niveaux.",
        illustration: "map",
        practice: {
          title: "À vous",
          text: "Ouvrez « Plan du chapitre 3 » et découpez la section 3 en trois sous-points.",
          noteId: "n-plan",
        },
      },
      {
        title: "L’Outline ne fait pas apprendre",
        body:
          "Structurer aide à comprendre, pas à retenir. C’est l’étape suivante — poser des questions sur vos propres passages — qui transforme la note en mémoire. C’est exactement ce qu’ajoute Cornell.",
        illustration: "question",
      },
    ],
  },
  {
    id: "t-cornell",
    track: 1,
    index: 2,
    title: "Cornell : poser des questions sur ses notes",
    subtitle: "Le geste qui fait retenir",
    minutes: 4,
    method: "cornell",
    steps: [
      {
        title: "Écrivez d’abord, normalement",
        body:
          "Prenez vos notes comme d’habitude : des phrases courtes, vos mots. Cornell ne change rien à l’écoute ; il ajoute un geste après coup, celui qui compte.",
        illustration: "book",
      },
      {
        title: "Posez une question sur un passage",
        body:
          "Sélectionnez la phrase qui contient la réponse, puis ajoutez la question qui la ferait revenir en mémoire. Chaque question devient une carte.",
        illustration: "question",
        practice: {
          title: "À vous",
          text:
            "Dans la note exemple, sélectionnez « Conditions de validité » et ajoutez une question.",
          noteId: "n-contrats",
        },
      },
      {
        title: "Une question, un passage",
        body:
          "Trois passages liés à la même question donnent trois cartes. Deux questions identiques ne se confondent pas : chaque carte pointe vers son propre passage.",
        illustration: "cards",
      },
      {
        title: "Répondez de mémoire, puis vérifiez",
        body:
          "En révision, lisez la question, répondez à voix haute ou par écrit, puis retournez la carte. L’écart entre votre réponse et le passage est l’information la plus utile de la séance.",
        illustration: "review",
      },
      {
        title: "Relisez vos questions, pas vos notes",
        body:
          "Une relecture de questions coûte deux minutes et travaille la mémoire. Une relecture de notes donne l’illusion de savoir. Gardez la première.",
        illustration: "timer",
      },
    ],
  },
  {
    id: "t-mindmap",
    track: 1,
    index: 3,
    title: "Carte mentale : penser en liens",
    subtitle: "Pour les systèmes et les idées qui partent dans tous les sens",
    minutes: 3,
    method: "mindmap",
    steps: [
      {
        title: "Un nœud, un mot",
        body:
          "Le centre porte le sujet ; les branches portent des concepts, pas des phrases. Si un nœud a besoin de trois lignes, il a besoin d’un enfant.",
        illustration: "map",
      },
      {
        title: "Tirer une liane",
        body:
          "Le « + » posé sur le bord d’un nœud crée un enfant. Choisissez sa forme : cercle pour le cœur, rectangle pour un concept, losange pour une question ouverte.",
        illustration: "map",
        practice: {
          title: "À vous",
          text: "Ajoutez un nœud « végétatif » sous « Autonome » dans la carte Système nerveux.",
          noteId: "n-systeme",
        },
      },
      {
        title: "Le graphe illisible est un échec",
        body:
          "Une carte doit rester lisible sur un téléphone. Au-delà de trois niveaux, revenez au texte : la carte sert à voir les liens, pas à tout contenir.",
        illustration: "book",
      },
    ],
  },
  {
    id: "t-zettel",
    track: 1,
    index: 4,
    title: "Zettelkasten : une carte, une idée",
    subtitle: "Pour la recherche au long cours",
    minutes: 4,
    method: "zettelkasten",
    steps: [
      {
        title: "Avec vos propres mots",
        body:
          "Une carte contient une idée reformulée, jamais un copier-coller. Si vous ne pouvez pas la reformuler, c’est que vous ne l’avez pas comprise : retournez à la source.",
        illustration: "cards",
      },
      {
        title: "Toujours la source",
        body:
          "Sans référence, une carte est une rumeur. Notez l’auteur, l’ouvrage, la page. Vous pourrez vérifier, citer, contredire.",
        illustration: "book",
        practice: {
          title: "À vous",
          text:
            "Ouvrez le vault Économie et créez une carte sur une notion vue cette semaine.",
          noteId: "n-inflation",
        },
      },
      {
        title: "Relier à la main",
        body:
          "Pas de liens automatiques. Vous décidez qu’une idée en éclaire une autre, et vous écrivez « Voir… ». C’est ce geste qui construit le réseau, pas l’algorithme.",
        illustration: "map",
      },
      {
        title: "Le graphe reste petit",
        body:
          "Affichez la carte ouverte et ses voisines directes. Un graphe global devient une pelote illisible : il flatte l’outil, pas la pensée.",
        illustration: "timer",
      },
    ],
  },
  {
    id: "t-reviser",
    track: 1,
    index: 5,
    title: "Réviser : l’espacement, pas la volonté",
    subtitle: "Quatre boutons suffisent",
    minutes: 3,
    method: "cornell",
    steps: [
      {
        title: "Répondre avant de retourner",
        body:
          "Une carte ne sert à rien si vous lisez la réponse tout de suite. Formulez d’abord, à voix haute ou dans le champ de réponse, puis vérifiez.",
        illustration: "review",
      },
      {
        title: "Évaluer honnêtement",
        body:
          "« Encore » fait revenir la carte dans dix minutes, « Facile » l’éloigne de plusieurs jours. Un « Bien » donné par politesse coûte une révision inutile dans trois jours.",
        illustration: "timer",
      },
      {
        title: "Dix minutes par jour",
        body:
          "La régularité vaut mieux que les sessions longues. L’application propose un nombre de cartes ; vous décidez de vous arrêter, jamais de sauter un jour.",
        illustration: "review",
      },
    ],
  },
  {
    id: "t-effort",
    track: 1,
    index: 6,
    title: "Pourquoi l’effort fait retenir",
    subtitle: "Rappel actif, espacement, technique de Feynman",
    minutes: 4,
    steps: [
      {
        title: "L’illusion de compétence",
        body:
          "Relire donne une impression de maîtrise immédiate. Cette sensation ne prédit pas la mémoire au bout d’une semaine : c’est l’effort de rappel qui la prédit.",
        illustration: "book",
      },
      {
        title: "L’effet de test",
        body:
          "Se tester modifie la trace mnésique plus profondément que relire. Une question, même ratée, vaut mieux qu’un surlignage réussi.",
        illustration: "question",
      },
      {
        title: "L’espacement",
        body:
          "Revoir juste avant d’oublier renforce durablement. C’est le rôle des intervalles : ni trop tôt, ni trop tard.",
        illustration: "timer",
      },
      {
        title: "Expliquer simplement",
        body:
          "La technique de Feynman : expliquer à voix haute, comme à un débutant. Là où la phrase se casse, la compréhension manque encore.",
        illustration: "cards",
      },
    ],
  },

  /* ---------- Couche B : cours « Lire pour retenir » ---------- */
  {
    id: "c-1",
    track: 2,
    index: 1,
    title: "Lire n’est pas apprendre",
    subtitle: "Repérer l’illusion de compétence",
    minutes: 3,
    steps: [
      {
        title: "Le confort n’est pas la mémoire",
        body:
          "Surligner, relire, recopier : ces gestes sont agréables et laissent une trace sur la page, pas dans la tête. Ce qui reste, c’est ce qui a demandé un effort de reconstruction.",
        illustration: "book",
      },
      {
        title: "Le test avant la relecture",
        body:
          "Après un chapitre, fermez le livre et écrivez trois questions. Vous découvrirez en deux minutes ce que la relecture vous aurait caché pendant une heure.",
        illustration: "question",
      },
    ],
  },
  {
    id: "c-2",
    track: 2,
    index: 2,
    title: "Les quatre niveaux de lecture d’Adler",
    subtitle: "Élémentaire, informative, analytique, syntopique",
    minutes: 4,
    steps: [
      {
        title: "Quatre niveaux, quatre efforts",
        body:
          "Lire pour le sens immédiat (élémentaire), pour s’informer (inspection), pour comprendre (analytique), pour comparer plusieurs auteurs (syntopique). Choisir le niveau évite de lire un article comme un roman.",
        illustration: "book",
      },
      {
        title: "L’inspection en quinze minutes",
        body:
          "Titre, sommaire, introduction, conclusion, index. Vous saurez si le texte mérite une lecture analytique — et vous lirez la suite avec une carte en tête.",
        illustration: "timer",
        practice: {
          title: "À vous",
          text:
            "Prenez un livre de votre table et faites-en l’inspection en quinze minutes, chrono visible.",
        },
      },
    ],
  },
  {
    id: "c-3",
    track: 2,
    index: 3,
    title: "Avant de lire : la page blanche",
    subtitle: "Ce que je sais déjà, ce que je cherche",
    minutes: 3,
    steps: [
      {
        title: "Deux colonnes",
        body:
          "Sur une page, écrivez à gauche ce que vous savez déjà du sujet, à droite ce que vous cherchez. La lecture devient une vérification, pas un défilement.",
        illustration: "book",
      },
      {
        title: "Les questions d’attente",
        body:
          "Formulez trois questions avant d’ouvrir le texte. Vous lirez plus lentement là où se trouvent les réponses, et plus vite ailleurs.",
        illustration: "question",
      },
    ],
  },
  {
    id: "c-4",
    track: 2,
    index: 4,
    title: "Lire un livre",
    subtitle: "Inspection de quinze minutes, puis lecture analytique",
    minutes: 4,
    steps: [
      {
        title: "La carte avant le voyage",
        body:
          "Inspection : couverture, sommaire, introduction, dernier chapitre. Écrivez le plan du livre en cinq lignes. Vous savez maintenant où vous allez.",
        illustration: "map",
      },
      {
        title: "Lire avec un crayon",
        body:
          "Une note Cornell par chapitre. À la fin de chaque section, une question. Si vous ne trouvez pas de question, vous n’avez pas encore trouvé l’idée.",
        illustration: "book",
        practice: {
          title: "À vous",
          text: "Créez une note Cornell pour le chapitre en cours et posez deux questions.",
        },
      },
    ],
  },
  {
    id: "c-5",
    track: 2,
    index: 5,
    title: "Lire un article scientifique",
    subtitle: "Résumé, introduction, discussion, méthode en dernier",
    minutes: 4,
    steps: [
      {
        title: "L’ordre qui économise du temps",
        body:
          "Résumé pour la question et le résultat, introduction pour l’enjeu, discussion pour les limites, méthode en dernier si vous devez vérifier. Lire dans l’ordre du texte est une habitude, pas une méthode.",
        illustration: "book",
        practice: {
          title: "À vous",
          text:
            "Ouvrez votre prochain article par la discussion et notez trois limites annoncées.",
        },
      },
      {
        title: "La question de recherche d’abord",
        body:
          "Cherchez une phrase du type « nous testons si… ». Tout le reste — échantillon, statistiques, figures — ne prend son sens qu’en fonction d’elle.",
        illustration: "question",
      },
    ],
  },
  {
    id: "c-6",
    track: 2,
    index: 6,
    title: "Lire une documentation technique",
    subtitle: "Le principe 20/80",
    minutes: 3,
    steps: [
      {
        title: "Chercher le chemin minimal",
        body:
          "Une documentation contient beaucoup plus que ce dont vous avez besoin. Cherchez l’exemple minimal qui fonctionne, comprenez-le, puis élargissez.",
        illustration: "book",
      },
      {
        title: "Casser volontairement",
        body:
          "Modifiez l’exemple, provoquez une erreur, lisez le message. La documentation devient une carte de dépannage au lieu d’un roman technique.",
        illustration: "timer",
      },
    ],
  },
  {
    id: "c-7",
    track: 2,
    index: 7,
    title: "Suivre un cours",
    subtitle: "Cornell en direct, questions à J+1, carte mentale en fin de chapitre",
    minutes: 4,
    steps: [
      {
        title: "Prendre des notes incomplètes",
        body:
          "En cours, notez les idées et les exemples, pas chaque phrase. Laissez une marge à droite : c’est là que les questions viendront, à froid.",
        illustration: "book",
      },
      {
        title: "J+1 : les questions",
        body:
          "Le lendemain, sans relire, écrivez trois questions par heure de cours. Puis vérifiez dans vos notes. Ce qui manque est exactement ce qu’il faut travailler.",
        illustration: "question",
        practice: {
          title: "À vous",
          text: "Ouvrez « Le marché du travail » et ajoutez une question sur le salaire réel.",
          noteId: "n-marche",
        },
      },
    ],
  },
  {
    id: "c-8",
    track: 2,
    index: 8,
    title: "Lire plusieurs sources",
    subtitle: "Lecture syntopique et vault Zettelkasten",
    minutes: 4,
    steps: [
      {
        title: "Comparer sur des questions",
        body:
          "La lecture syntopique part de vos questions, pas des livres. Pour chaque source, notez la réponse de l’auteur, ses désaccords, ses preuves.",
        illustration: "cards",
      },
      {
        title: "Un vault par projet",
        body:
          "Chaque projet a son vault. Les cartes se ressemblent, les références se croisent. Le graphe vous montre les idées que plusieurs sources partagent.",
        illustration: "map",
        practice: {
          title: "À vous",
          text:
            "Créez une carte dans le vault Économie et reliez-la à #1A par « Voir… ».",
          noteId: "n-inflation",
        },
      },
    ],
  },
  {
    id: "c-9",
    track: 2,
    index: 9,
    title: "Retenir dans la durée",
    subtitle: "Révision espacée et bilan honnête",
    minutes: 3,
    steps: [
      {
        title: "Peu, souvent",
        body:
          "Dix minutes quotidiennes battent deux heures le dimanche. Les intervalles font le travail pendant que vous faites autre chose.",
        illustration: "timer",
      },
      {
        title: "Mesurer sans se mentir",
        body:
          "Le taux de réussite d’une séance n’est pas une note. Il indique seulement si vos intervalles sont trop courts ou trop longs.",
        illustration: "review",
      },
    ],
  },
];
