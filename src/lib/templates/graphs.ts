/**
 * Modèles de **vault** — plusieurs fiches liées, posées d’un seul geste.
 *
 * Les modèles de fiche (`notes.ts`) remplissent une fiche ; ceux-ci remplissent
 * un *réseau*. Chacun vient d’un motif vu sur VisualFlow (`/free-examples`) et
 * traduit dans le seul matériau que cette application possède : des fiches
 * Zettelkasten, des codes, et des références déclarées entre codes.
 *
 * Ce qui a été retenu du corpus, et pourquoi :
 * - *Concept map* → carte conceptuelle : un concept pivot, des branches, et
 *   surtout des liens **nommés** (la relation est le contenu, pas le trait).
 * - *Flow diagram / Pipeline* → chaîne d’arguments : un ordre imposé, chaque
 *   fiche ne tient que si la précédente tient.
 * - *Validation flow / FSM* → arbre de décision et machine à états : des
 *   questions à deux issues, et des états qu’on peut quitter.
 * - *Orga chart* → décomposition : la hiérarchie d’un chapitre, sans mélange
 *   avec les renvois transversaux.
 * - *Workflow automatisé / animation* → boucle de révision : un cycle qui
 *   revient sur lui-même, donc des renvois réciproques.
 *
 * Ce qui a été écarté : Kanban (le tableau existe déjà ailleurs), graphes de
 * microservices, réseau de neurones, Git branching — beaux à regarder, sans
 * usage pour apprendre quelque chose.
 */

export interface VaultCardSpec {
  code: string;
  title: string;
  body: string;
  source: string;
  /** codes des fiches citées, dans ce même modèle */
  refs: string[];
}

export interface VaultTemplate {
  id: string;
  name: string;
  /** à quoi ça sert, en une phrase */
  intent: string;
  audience: string;
  discipline: string;
  /** style de graphe appliqué en arrivant */
  style: string;
  cards: VaultCardSpec[];
}

const MODELS: VaultTemplate[] = [
  {
    id: "vault-carte-conceptuelle",
    name: "Carte conceptuelle",
    intent: "Tenir un concept pivot et nommer ce que chaque branche fait avec lui.",
    audience: "Étudiant",
    discipline: "Apprentissage — Novak",
    style: "carte-conceptuelle",
    cards: [
      {
        code: "#1A",
        title: "Concept pivot",
        body:
          "Le concept que tout le reste éclaire, en une phrase affirmative.\n\n" +
          "Formulation provisoire :\n\n" +
          "Ce qu’il n’est pas (pour éviter le mot-valise) :\n",
        source: "Cours, chapitre, page",
        refs: ["#1A1", "#1A2", "#1A3"],
      },
      {
        code: "#1A1",
        title: "Ce qu’il inclut",
        body:
          "Les cas qui appartiennent au concept sans discussion.\n\n· \n· \n\n" +
          "Le critère commun à tous ces cas :\n",
        source: "",
        refs: ["#1A"],
      },
      {
        code: "#1A2",
        title: "Ce qu’il exclut",
        body:
          "Les cas limites qui y ressemblent mais n’en font pas partie.\n\n· \n\n" +
          "Pourquoi ils sont dehors :\n",
        source: "",
        refs: ["#1A"],
      },
      {
        code: "#1A3",
        title: "Ce qu’il permet d’expliquer",
        body:
          "Les phénomènes que le concept rend lisibles, et qu’on n’expliquait pas avant.\n\n· \n",
        source: "",
        refs: ["#1A"],
      },
      {
        code: "#1B",
        title: "Concept voisin",
        body:
          "Un second concept qui partage le terrain sans se confondre avec le pivot.\n\n" +
          "La différence en une phrase :\n",
        source: "",
        refs: ["#1A"],
      },
    ],
  },
  {
    id: "vault-chaine-argument",
    name: "Chaîne d’arguments",
    intent: "Poser une thèse et les appuis dont elle dépend, dans l’ordre où ils doivent tenir.",
    audience: "Scientifique",
    discipline: "Argumentation — Toulmin",
    style: "flux",
    cards: [
      {
        code: "#1A",
        title: "Thèse",
        body: "Ce que j’affirme, en une phrase qui pourrait être fausse.\n",
        source: "",
        refs: ["#1B", "#1C"],
      },
      {
        code: "#1B",
        title: "Prémisse 1",
        body: "Ce que je tiens pour acquis pour que la thèse tienne.\n\nSa preuve :\n",
        source: "",
        refs: ["#1A"],
      },
      {
        code: "#1C",
        title: "Prémisse 2",
        body: "Le second appui, indépendant du premier.\n\nSa preuve :\n",
        source: "",
        refs: ["#1A"],
      },
      {
        code: "#1D",
        title: "Objection sérieuse",
        body:
          "La meilleure attaque contre la thèse, dans sa version la plus forte.\n\n" +
          "Qui la porte :\n",
        source: "",
        refs: ["#1A"],
      },
      {
        code: "#1E",
        title: "Réponse à l’objection",
        body:
          "Ce qui reste vrai de la thèse après l’objection, et à quel prix.\n\n" +
          "Concession explicite :\n",
        source: "",
        refs: ["#1D", "#1A"],
      },
    ],
  },
  {
    id: "vault-arbre-decision",
    name: "Arbre de décision",
    intent: "Décider vite et de la même façon deux fois, en suivant des critères explicites.",
    audience: "Professionnel",
    discipline: "Décision — arbre de choix",
    style: "arbre-binaire",
    cards: [
      {
        code: "#1A",
        title: "Question de départ",
        body: "La question à laquelle l’arbre répond, avec son contexte et son échéance.\n",
        source: "",
        refs: ["#1B"],
      },
      {
        code: "#1B",
        title: "Critère 1",
        body: "Le premier test, formulé pour avoir une réponse oui/non.\n\nComment on le mesure :\n",
        source: "",
        refs: ["#1B1", "#1B2"],
      },
      {
        code: "#1B1",
        title: "Si oui",
        body: "Ce qu’on fait quand le critère passe, et pourquoi on ne va pas plus loin.\n",
        source: "",
        refs: ["#1B"],
      },
      {
        code: "#1B2",
        title: "Si non",
        body: "Le second test à appliquer quand le premier échoue.\n",
        source: "",
        refs: ["#1B", "#1C"],
      },
      {
        code: "#1C",
        title: "Cas résiduel",
        body:
          "Ce qui reste quand aucun critère ne tranche — et la décision par défaut, écrite d’avance.\n",
        source: "",
        refs: ["#1B2"],
      },
    ],
  },
  {
    id: "vault-machine-etats",
    name: "Machine à états",
    intent: "Décrire un système par ses états stables et les passages autorisés entre eux.",
    audience: "Ingénieur",
    discipline: "Systèmes — états finis",
    style: "circuit",
    cards: [
      {
        code: "#1A",
        title: "État initial",
        body: "Ce qui est vrai au démarrage, avant toute action.\n\nCe qui déclenche la sortie :\n",
        source: "",
        refs: ["#1B"],
      },
      {
        code: "#1B",
        title: "État nominal",
        body: "L’état où le système passe le plus de temps et ce qui le caractérise.\n",
        source: "",
        refs: ["#1C", "#1D"],
      },
      {
        code: "#1C",
        title: "État d’erreur",
        body: "L’état atteint quand une condition casse, et ce qu’on peut encore faire.\n",
        source: "",
        refs: ["#1B"],
      },
      {
        code: "#1D",
        title: "État final",
        body: "L’état dont on ne sort plus, et la condition exacte qui y mène.\n",
        source: "",
        refs: ["#1B"],
      },
      {
        code: "#1E",
        title: "Transitions interdites",
        body:
          "Les passages qui semblent naturels mais qui n’ont pas de sens — la liste qui évite les bugs.\n\n· \n",
        source: "",
        refs: ["#1B", "#1C"],
      },
    ],
  },
  {
    id: "vault-decomposition",
    name: "Décomposition d’un chapitre",
    intent: "Descendre d’un titre de cours jusqu’aux notions qu’on peut réellement réviser.",
    audience: "Étudiant",
    discipline: "Plan — organigramme",
    style: "colonnes",
    cards: [
      {
        code: "#1A",
        title: "Chapitre",
        body: "Le titre du chapitre et ce qu’il promet de faire comprendre.\n",
        source: "Manuel, page",
        refs: ["#1A1", "#1A2", "#1A3"],
      },
      {
        code: "#1A1",
        title: "Section 1",
        body: "La première articulation du chapitre, en une phrase.\n",
        source: "",
        refs: ["#1A1a"],
      },
      {
        code: "#1A1a",
        title: "Notion révisable",
        body:
          "La notion telle qu’elle serait demandée à l’examen.\n\n" +
          "Définition :\n\nExemple minimal :\n\nPiège classique :\n",
        source: "",
        refs: [],
      },
      {
        code: "#1A2",
        title: "Section 2",
        body: "La deuxième articulation, et le lien logique avec la première.\n",
        source: "",
        refs: [],
      },
      {
        code: "#1A3",
        title: "Section 3",
        body: "La troisième articulation — souvent celle qui ouvre sur le chapitre suivant.\n",
        source: "",
        refs: [],
      },
    ],
  },
  {
    id: "vault-boucle-revision",
    name: "Boucle de révision",
    intent: "Installer un cycle qui revient sur ses propres fiches au lieu de les empiler.",
    audience: "Autodidacte",
    discipline: "Apprentissage — répétition espacée",
    style: "reseau",
    cards: [
      {
        code: "#1A",
        title: "Cours suivi",
        body: "La source brute : ce qui a été lu ou entendu, sans transformation.\n",
        source: "",
        refs: ["#1B"],
      },
      {
        code: "#1B",
        title: "Questions écrites",
        body:
          "Les questions que le cours devrait permettre de répondre, écrites à chaud.\n\n· \n· \n",
        source: "",
        refs: ["#1C"],
      },
      {
        code: "#1C",
        title: "Fiche de révision",
        body: "La réponse condensée, avec le raisonnement et non seulement le résultat.\n",
        source: "",
        refs: ["#1D"],
      },
      {
        code: "#1D",
        title: "Test à blanc",
        body: "La tentative sans notes, et l’écart mesuré avec la fiche.\n\nÉcart constaté :\n",
        source: "",
        refs: ["#1E"],
      },
      {
        code: "#1E",
        title: "Ajustement",
        body:
          "Ce que la boucle change : une fiche réécrite, une question abandonnée, un point à revoir.\n",
        source: "",
        refs: ["#1A", "#1B"],
      },
    ],
  },
];

export const VAULT_TEMPLATES: VaultTemplate[] = MODELS;

export const DEFAULT_VAULT_TEMPLATE = MODELS[0];

export function getVaultTemplate(id: string): VaultTemplate | undefined {
  return VAULT_TEMPLATES.find((template) => template.id === id);
}

/** Sert aux aperçus : ce que le modèle pose réellement. */
export function vaultSignature(template: VaultTemplate): string {
  const links = template.cards.reduce((sum, card) => sum + card.refs.length, 0);
  return `${template.cards.length} fiches · ${links} liens`;
}
