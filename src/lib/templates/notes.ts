import type { Audience } from "@/lib/templates/mindmaps";

/**
 * Modèles de notes (Outline, Cornell) et de fiches (Zettelkasten).
 *
 * Chaque modèle encode une **méthode qui existe** — SQ3R, Feynman, IMRaD,
 * Cornell, note permanente de Luhmann, OIA pour l’enseignement biblique — et
 * la traduit en blocs concrets. Les invites sont rédigées pour être réécrites :
 * un modèle qu’on garde tel quel est un modèle qu’on n’a pas compris.
 *
 * Interdits de conception (vérifiés par test) : aucun bloc vide, aucun titre
 * sans contenu, aucune section décorative.
 */

export interface TemplateBlockSpec {
  kind: "p" | "h1" | "h2" | "quote";
  text: string;
  bullet?: boolean;
  indent?: number;
  marked?: boolean;
}

export interface NoteTemplate {
  id: string;
  method: "outline" | "cornell";
  name: string;
  /** le cas d’usage précis, en une phrase */
  intent: string;
  audience: Audience;
  discipline: string;
  title: string;
  collection?: string;
  blocks: TemplateBlockSpec[];
}

export interface ZettelTemplate {
  id: string;
  name: string;
  intent: string;
  audience: Audience;
  discipline: string;
  title: string;
  body: string;
  source: string;
  refs: string[];
}

const p = (text: string, extra: Partial<TemplateBlockSpec> = {}): TemplateBlockSpec => ({
  kind: "p",
  text,
  ...extra,
});
const bullet = (text: string, indent = 0): TemplateBlockSpec =>
  p(text, { bullet: true, indent });
const h1 = (text: string): TemplateBlockSpec => ({ kind: "h1", text });
const h2 = (text: string): TemplateBlockSpec => ({ kind: "h2", text });
const quote = (text: string): TemplateBlockSpec => ({ kind: "quote", text });
const marked = (text: string): TemplateBlockSpec => p(text, { marked: true });

/* ------------------------------------------------------------------ */
/* Outline — 6 modèles                                                 */
/* ------------------------------------------------------------------ */

export const OUTLINE_TEMPLATES: NoteTemplate[] = [
  {
    id: "outline-cours",
    method: "outline",
    name: "Cours magistral",
    intent: "Suivre un cours structuré : plan, définitions, exemples, pièges.",
    audience: "Étudiant",
    discipline: "Prise de notes en amphi",
    title: "Cours — ",
    collection: "Cours",
    blocks: [
      h1("Plan annoncé"),
      bullet("1. "),
      bullet("2. "),
      bullet("3. "),
      h1("Définitions"),
      p("Terme clé — définition exacte, sans reformulation personnelle."),
      p("Formule ou règle — conditions d’application."),
      h1("Idées principales"),
      bullet("Idée 1 — pourquoi elle compte"),
      bullet("Idée 2 — ce qu’elle permet de prédire"),
      h1("Exemples du cours"),
      bullet("Cas concret : "),
      bullet("Contre-exemple : "),
      h1("À retenir"),
      bullet("Les trois idées à savoir réciter demain"),
      marked("Piège d’examen : "),
      h1("Travail à faire"),
      bullet("À lire : "),
      bullet("Exercice : "),
    ],
  },
  {
    id: "outline-sq3r",
    method: "outline",
    name: "Lecture d’article (SQ3R)",
    intent: "Lire un article dense sans le subir : survoler, questionner, réciter.",
    audience: "Étudiant",
    discipline: "SQ3R (Robinson, 1946)",
    title: "Lecture — ",
    collection: "Lectures",
    blocks: [
      h1("1. Survol — 3 minutes"),
      bullet("Titre, résumé, figures, conclusion"),
      bullet("Ce que l’auteur veut démontrer : "),
      h1("2. Questions"),
      bullet("Question de recherche de l’article : "),
      bullet("Ce que je veux savoir en le lisant : "),
      h1("3. Lecture"),
      p("Thèse de l’auteur, en une phrase."),
      bullet("Argument 1 : "),
      bullet("Argument 2 : "),
      bullet("Preuve décisive (donnée, expérience, source) : "),
      h1("4. Récitation — sans le texte"),
      p("Expliquer l’article à voix haute en 90 secondes, puis vérifier."),
      h1("5. Révision"),
      bullet("À revoir à J+1 : "),
      bullet("À revoir à J+7 : "),
      h1("Ce que je garde"),
      marked("Citation utilisable : "),
    ],
  },
  {
    id: "outline-feynman",
    method: "outline",
    name: "Explication Feynman",
    intent: "Repérer le trou dans sa compréhension en expliquant sans jargon.",
    audience: "Autodidacte",
    discipline: "Technique Feynman",
    title: "Comprendre — ",
    collection: "Compréhension",
    blocks: [
      h1("Le concept"),
      p("Nomme-le précisément, avec son domaine et sa fonction."),
      h1("Explique-le à un enfant de 12 ans"),
      p("Sans jargon, sans formule, en trois phrases maximum."),
      h1("Les trous"),
      p("Ce que je n’ai pas su dire, et pourquoi."),
      bullet("Trou 1 : "),
      bullet("Trou 2 : "),
      h1("Analogie"),
      p("À quoi cela ressemble-t-il dans la vie quotidienne ? Où l’analogie casse-t-elle ?"),
      h1("Reformulation finale"),
      p("Une seule phrase, exacte, que je pourrais redire dans six mois."),
      marked("Ma phrase : "),
    ],
  },
  {
    id: "outline-reunion",
    method: "outline",
    name: "Compte-rendu de réunion (5W1H)",
    intent: "Sortir d’une réunion avec des décisions et des responsables, pas des impressions.",
    audience: "Professionnel",
    discipline: "Journalisme (5W1H)",
    title: "Réunion — ",
    collection: "Travail",
    blocks: [
      h2("Quoi · Qui · Quand · Où · Comment"),
      bullet("Sujet réel de la réunion : "),
      bullet("Décideur présent : "),
      bullet("Date et durée : "),
      h1("Décisions prises"),
      bullet("Décision 1 — formulée comme un fait, pas comme une intention"),
      h1("Actions"),
      bullet("Qui — quoi — pour quand"),
      h1("Points laissés ouverts"),
      bullet("Question non tranchée : "),
      bullet("Ce qu’il faut arbitrer au prochain point : "),
      h1("Ce que je dois transmettre"),
      marked("Message à envoyer / point à remonter : "),
    ],
  },
  {
    id: "outline-dissertation",
    method: "outline",
    name: "Plan de dissertation",
    intent: "Transformer un sujet en problématique, puis en plan qui répond vraiment.",
    audience: "Étudiant",
    discipline: "Dissertation (thèse–antithèse–synthèse)",
    title: "Dissertation — ",
    collection: "Droit des affaires",
    blocks: [
      h1("Sujet"),
      p("Recopié mot pour mot, sans le reformuler."),
      h1("Définitions des termes"),
      bullet("Terme 1 : "),
      bullet("Terme 2 : "),
      h1("Problématique"),
      p("La tension du sujet, en une question fermée."),
      h1("I. Thèse"),
      bullet("Argument 1 + preuve (texte, arrêt, donnée)"),
      bullet("Argument 2 + preuve"),
      h1("II. Antithèse"),
      bullet("Objection sérieuse, pas un homme de paille"),
      bullet("Preuve de l’objection"),
      h1("III. Synthèse"),
      bullet("Ce que la tension révèle"),
      bullet("Solution proposée, avec sa condition de validité"),
      h1("Ouverture"),
      marked("La phrase de fin : ce que le sujet permet de penser en plus."),
    ],
  },
  {
    id: "outline-imrad",
    method: "outline",
    name: "Protocole scientifique (IMRaD)",
    intent: "Écrire une recherche de façon reproductible : question, hypothèse, méthode, attendu.",
    audience: "Scientifique",
    discipline: "IMRaD / méthodologie",
    title: "Recherche — ",
    collection: "Recherche",
    blocks: [
      h1("Introduction — question"),
      p("Question de recherche, en une phrase testable."),
      bullet("Ce qui est déjà établi : "),
      bullet("Ce qui manque : "),
      h1("Hypothèse"),
      bullet("H1 — prédiction : si … alors …"),
      bullet("Hypothèse nulle : "),
      h1("Méthode"),
      bullet("Population / échantillon : "),
      bullet("Instrument de mesure : "),
      bullet("Procédure, étape par étape : "),
      h1("Résultats attendus"),
      p("Ce qu’on observerait si H1 est vraie, et ce qui la falsifierait."),
      h1("Limites et biais"),
      bullet("Biais de sélection : "),
      bullet("Ce que l’étude ne pourra pas dire : "),
      h1("Matériel et sécurité"),
      marked("Ce qui doit être préparé avant la première mesure : "),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Cornell — 6 modèles                                                 */
/* ------------------------------------------------------------------ */

export const CORNELL_TEMPLATES: NoteTemplate[] = [
  {
    id: "cornell-enseignement",
    method: "cornell",
    name: "Enseignement biblique",
    intent:
      "Noter un enseignement ou une prédication : date, orateur, thème, verset principal, puis les détails.",
    audience: "Étudiant",
    discipline: "Étude biblique inductive (observation → interprétation → application)",
    title: "Enseignement biblique — ",
    collection: "Enseignements",
    blocks: [
      h2("Date · Orateur · Thème"),
      p("Date : "),
      p("Orateur : "),
      p("Thème : "),
      h1("Verset principal"),
      quote("Référence — texte du verset, recopié exactement."),
      h1("Contexte du passage"),
      bullet("Qui écrit, à qui, quand : "),
      bullet("Ce qui précède et ce qui suit : "),
      h1("Détails de l’enseignement"),
      bullet("Point 1 — l’idée, puis le mot exact de l’orateur"),
      bullet("Point 2 — "),
      bullet("Point 3 — "),
      bullet("Illustration ou exemple donné : "),
      bullet("Références croisées citées : "),
      h1("Ce que le texte dit / ce qu’il ne dit pas"),
      p("Distinguer l’observation du commentaire de l’orateur."),
      h1("Application personnelle"),
      marked("Ce que je change cette semaine, concrètement : "),
      h2("Résumé"),
      p("Une phrase qui contient le thème, le verset et l’application."),
      h1("À approfondir"),
      bullet("Passage à relire : "),
      bullet("Question à poser : "),
      bullet("À partager avec : "),
    ],
  },
  {
    id: "cornell-classique",
    method: "cornell",
    name: "Cours magistral (Cornell)",
    intent: "Le format Cornell d’origine : indices à gauche, notes à droite, résumé en bas.",
    audience: "Étudiant",
    discipline: "Cornell (Pauk, 1949)",
    title: "Cours Cornell — ",
    collection: "Cours",
    blocks: [
      h2("Date · Enseignant · Matière"),
      p("Date : "),
      p("Enseignant : "),
      p("Matière : "),
      h1("Pistes et questions"),
      bullet("Question à laquelle ce cours répond : "),
      bullet("Mots-clés à retenir : "),
      bullet("Ce que je dois vérifier ensuite : "),
      h1("Notes"),
      bullet("Idée 1 — "),
      bullet("Idée 2 — "),
      bullet("Définition exacte : "),
      bullet("Exemple donné par l’enseignant : "),
      h2("Résumé"),
      p("Trois phrases maximum, écrites après le cours, sans le relire."),
      h1("Révision programmée"),
      bullet("J+1 : "),
      bullet("J+7 : "),
    ],
  },
  {
    id: "cornell-article",
    method: "cornell",
    name: "Lecture d’article scientifique",
    intent: "Lire un article en gardant la méthode et les limites visibles d’un coup d’œil.",
    audience: "Scientifique",
    discipline: "Lecture critique d’article (IMRaD)",
    title: "Article — ",
    collection: "Recherche",
    blocks: [
      h2("Revue · Année · Auteurs"),
      p("Revue : "),
      p("Année et auteurs : "),
      h1("Indices de lecture"),
      bullet("Question de recherche : "),
      bullet("Type d’étude (essai, cohorte, revue) : "),
      bullet("Ce que je dois surveiller : "),
      h1("Notes"),
      bullet("Population et taille d’échantillon : "),
      bullet("Intervention / exposition : "),
      bullet("Résultat principal, avec l’effet chiffré : "),
      bullet("Limites reconnues par les auteurs : "),
      h1("Validité"),
      p("Ce que l’article prouve, et ce qu’il ne prouve pas."),
      h2("Résumé"),
      marked("Référence à citer : "),
    ],
  },
  {
    id: "cornell-examen",
    method: "cornell",
    name: "Révision d’examen",
    intent: "Réviser par questions d’examen et erreurs déjà commises, pas par relecture.",
    audience: "Étudiant",
    discipline: "Rappel actif",
    title: "Révision — ",
    collection: "Révisions",
    blocks: [
      h2("Matière · Date d’examen · Format"),
      p("Matière : "),
      p("Date et format (dissertation, QCM, oral) : "),
      h1("Questions probables"),
      bullet("Q1 — "),
      bullet("Q2 — "),
      bullet("Q3 — "),
      h1("Réponses de référence"),
      bullet("Réponse à Q1, en cinq lignes : "),
      bullet("Formule ou règle indispensable : "),
      h1("Mes erreurs passées"),
      bullet("Erreur 1 — cause réelle : "),
      bullet("Ce que je fais autrement : "),
      h1("Plan de révision"),
      bullet("Aujourd’hui : "),
      bullet("Demain : "),
      h2("Résumé"),
      marked("Les trois choses que je dois savoir réciter sans hésiter : "),
    ],
  },
  {
    id: "cornell-video",
    method: "cornell",
    name: "Cours en ligne / vidéo",
    intent: "Suivre une vidéo ou un MOOC en gardant des repères de minutage réutilisables.",
    audience: "Autodidacte",
    discipline: "Apprentissage asynchrone",
    title: "Vidéo — ",
    collection: "Autodidaxie",
    blocks: [
      h2("Plateforme · Durée · Chapitre"),
      p("Plateforme et titre : "),
      p("Durée et chapitre : "),
      h1("Repères"),
      bullet("00:00 — idée annoncée : "),
      bullet("Minutage à revoir : "),
      bullet("Notion prérequise qui m’a manqué : "),
      h1("Notes"),
      bullet("Idée 1 — "),
      bullet("Idée 2 — "),
      bullet("Démonstration pas à pas : "),
      h1("À faire soi-même"),
      p("L’exercice que la vidéo propose, refait sans regarder."),
      h2("Résumé"),
      marked("Ce que je peux refaire seul après cette vidéo : "),
    ],
  },
  {
    id: "cornell-protocole",
    method: "cornell",
    name: "Protocole de laboratoire",
    intent: "Tenir une manip reproductible : sécurité, étapes, sources d’erreur, résultat.",
    audience: "Scientifique",
    discipline: "Travaux pratiques",
    title: "Manip — ",
    collection: "Recherche",
    blocks: [
      h2("Manip · Date · Binôme"),
      p("Manip : "),
      p("Date et binôme : "),
      h1("Sécurité et prérequis"),
      bullet("EPI et risques : "),
      bullet("Ce qui doit être vérifié avant de commencer : "),
      h1("Étapes"),
      bullet("1. "),
      bullet("2. "),
      bullet("3. "),
      h1("Observations brutes"),
      p("Ce qu’on a réellement vu, avant toute interprétation."),
      h1("Sources d’erreur"),
      bullet("Erreur systématique possible : "),
      bullet("Erreur de mesure : "),
      h2("Résumé"),
      marked("Ce qu’il faudra refaire ou vérifier : "),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Zettelkasten — 6 modèles de fiche                                   */
/* ------------------------------------------------------------------ */

export const ZETTEL_TEMPLATES: ZettelTemplate[] = [
  {
    id: "zettel-lecture",
    name: "Fiche de lecture",
    intent: "Garder d’une source ce qui est réutilisable ailleurs, avec la page exacte.",
    audience: "Étudiant",
    discipline: "Zettelkasten (Luhmann)",
    title: "Lecture — ",
    body:
      "Idée principale de la source, en mes mots.\n\n" +
      "Ce que l’auteur affirme :\n· \n\n" +
      "La preuve qu’il donne :\n· \n\n" +
      "Ce que je conteste ou nuance :\n· \n\n" +
      "Ce que cette lecture change dans ma réflexion :\n",
    source: "Auteur, Titre, année, page",
    refs: [],
  },
  {
    id: "zettel-permanente",
    name: "Note permanente",
    intent: "Écrire une idée complète et autonome, compréhensible dans dix ans.",
    audience: "Autodidacte",
    discipline: "Zettelkasten — note permanente",
    title: "Idée — ",
    body:
      "L’idée, en une phrase affirmative.\n\n" +
      "Pourquoi elle tient (argument, mécanisme) :\n\n" +
      "Ce qu’elle permet de penser :\n\n" +
      "Où elle casse (limite, contre-exemple) :\n\n" +
      "Liens : à relier à ",
    source: "",
    refs: [],
  },
  {
    id: "zettel-question",
    name: "Question ouverte",
    intent: "Conserver une question vivante, avec ce qu’il faudrait pour y répondre.",
    audience: "Scientifique",
    discipline: "Recherche — question de départ",
    title: "Question — ",
    body:
      "La question, formulée de façon à pouvoir être tranchée.\n\n" +
      "Pourquoi elle n’est pas encore résolue :\n\n" +
      "Ce qu’il faudrait observer ou mesurer :\n\n" +
      "Réponses possibles (et ce qui les distinguerait) :\n· \n\n" +
      "Prochaine action concrète :",
    source: "",
    refs: [],
  },
  {
    id: "zettel-concept",
    name: "Définition de concept",
    intent: "Fixer un concept par ses frontières, pour arrêter de l’employer flou.",
    audience: "Étudiant",
    discipline: "Concept mapping",
    title: "Concept — ",
    body:
      "Définition opérationnelle (genre proche + différence spécifique) :\n\n" +
      "Ce que ce n’est pas (contre-exemples) :\n· \n\n" +
      "Cas limite :\n\n" +
      "Concepts voisins et différence :\n· \n\n" +
      "Auteur de référence :",
    source: "",
    refs: [],
  },
  {
    id: "zettel-methode",
    name: "Note de méthode",
    intent: "Écrire une procédure réutilisable, pour ne pas la réinventer chaque fois.",
    audience: "Professionnel",
    discipline: "Documentation de procédure",
    title: "Méthode — ",
    body:
      "Quand l’utiliser (déclencheur) :\n\n" +
      "Étapes :\n1. \n2. \n3. \n\n" +
      "Ce qui fait échouer la méthode :\n\n" +
      "Vérification de réussite :\n",
    source: "",
    refs: [],
  },
  {
    id: "zettel-argument",
    name: "Note d’argumentation",
    intent: "Durcir un argument avant de l’exposer : prémisses, objections, réponse.",
    audience: "Étudiant",
    discipline: "Argumentation (Toulmin)",
    title: "Argument — ",
    body:
      "Thèse défendue :\n\n" +
      "Prémisses :\n1. \n2. \n\n" +
      "Objection la plus forte :\n\n" +
      "Réponse à l’objection :\n\n" +
      "Portée exacte de la thèse (ce qu’elle ne prétend pas) :",
    source: "",
    refs: [],
  },
];

/* ------------------------------------------------------------------ */

export const NOTE_TEMPLATES: NoteTemplate[] = [
  ...OUTLINE_TEMPLATES,
  ...CORNELL_TEMPLATES,
];

export function noteTemplatesFor(method: "outline" | "cornell"): NoteTemplate[] {
  return NOTE_TEMPLATES.filter((template) => template.method === method);
}

export function getNoteTemplate(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((template) => template.id === id);
}

export function getZettelTemplate(id: string): ZettelTemplate | undefined {
  return ZETTEL_TEMPLATES.find((template) => template.id === id);
}
