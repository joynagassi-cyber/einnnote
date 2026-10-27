import type { EdgeStyle } from "@/types";
import type { MindmapLayoutKind, TemplateNode } from "@/lib/mindmap/layout";

/**
 * Modèles de carte mentale.
 *
 * Règle de conception : un modèle n’est pas un dessin, c’est **une manière de
 * penser** issue d’une discipline réelle (Ishikawa en qualité, Toulmin en
 * argumentation, 6M en industrie, Bloom en pédagogie). Les textes placés dans
 * les nœuds sont des **invites de travail** — assez précises pour être
 * utilisables telles quelles, assez courtes pour être réécrites d’un geste.
 *
 * Tous les modèles ont une profondeur de 2 : c’est la limite qui garde une
 * carte lisible sur un téléphone, et c’est vérifié par test.
 */

export type Audience =
  | "Étudiant"
  | "Scientifique"
  | "Autodidacte"
  | "Professionnel"
  | "Enseignant";

export interface MindmapTemplate {
  id: string;
  name: string;
  /** à quoi ça sert, en une phrase concrète */
  intent: string;
  audience: Audience;
  discipline: string;
  layout: MindmapLayoutKind;
  edgeStyle: EdgeStyle;
  spec: TemplateNode;
  /** le modèle proposé par défaut à la création d’une carte */
  isDefault?: boolean;
}

const n = (
  key: string,
  text: string,
  shape: TemplateNode["shape"] = "rect",
  children?: TemplateNode[],
): TemplateNode => ({ key, text, shape, children });

export const MINDMAP_TEMPLATES: MindmapTemplate[] = [
  {
    id: "carte-lecture",
    name: "Carte de lecture active",
    intent: "Sortir quatre axes d’un texte : contexte, thèses, preuves, objections.",
    audience: "Étudiant",
    discipline: "Lecture savante (SQ3R)",
    layout: "radial",
    edgeStyle: "curved",
    isDefault: true,
    spec: n("root", "Idée directrice du texte", "circle", [
      n("contexte", "Contexte", "rect", [
        n("contexte-auteur", "Auteur, époque"),
        n("contexte-question", "Question posée"),
      ]),
      n("theses", "Thèses", "rect", [
        n("these-1", "Thèse 1"),
        n("these-2", "Thèse 2"),
      ]),
      n("preuves", "Preuves", "rect", [
        n("preuve-exemple", "Exemple décisif"),
        n("preuve-chiffre", "Chiffre ou source"),
      ]),
      n("objections", "Objections", "rect", [
        n("objection-limite", "Limite de l’auteur"),
        n("objection-desaccord", "Là où je ne suis pas d’accord"),
      ]),
      n("reemploi", "À réutiliser", "rect", [
        n("reemploi-citation", "Citation à retenir"),
        n("reemploi-lien", "Lien avec un autre cours"),
      ]),
    ]),
  },
  {
    id: "cours-magistral",
    name: "Cours en direct",
    intent: "Prendre un cours sans perdre le fil : plan, définitions, exemples, pièges.",
    audience: "Étudiant",
    discipline: "Prise de notes en amphi",
    layout: "tree-lr",
    edgeStyle: "step",
    spec: n("root", "Cours — titre", "circle", [
      n("plan", "Plan annoncé", "rect", [
        n("plan-1", "Temps 1"),
        n("plan-2", "Temps 2"),
        n("plan-3", "Temps 3"),
      ]),
      n("definitions", "Définitions", "rect", [
        n("definition-terme", "Terme clé — définition exacte"),
        n("definition-formule", "Formule ou règle"),
      ]),
      n("exemples", "Exemples du prof", "rect", [
        n("exemple-cas", "Cas concret"),
        n("exemple-contre", "Contre-exemple"),
      ]),
      n("retenir", "À retenir", "rect", [
        n("retenir-idees", "Les 3 idées"),
        n("retenir-piege", "Piège d’examen"),
      ]),
      n("travail", "Travail à faire", "rect", [
        n("travail-lire", "À lire"),
        n("travail-exercice", "Exercice"),
      ]),
    ]),
  },
  {
    id: "systeme-composants",
    name: "Système et composants",
    intent: "Décomposer un système réel : entrées, composants, régulation, pannes.",
    audience: "Scientifique",
    discipline: "Analyse fonctionnelle / physiologie",
    layout: "tree-lr",
    edgeStyle: "curved",
    spec: n("root", "Système — nom", "circle", [
      n("entrees", "Entrées", "rect", [
        n("entree-energie", "Énergie"),
        n("entree-information", "Signal / information"),
      ]),
      n("composants", "Composants", "rect", [
        n("composant-a", "Sous-système A — rôle"),
        n("composant-b", "Sous-système B — rôle"),
      ]),
      n("regulation", "Régulation", "rect", [
        n("regulation-boucle", "Boucle de retour"),
        n("regulation-seuil", "Seuil ou set-point"),
      ]),
      n("sorties", "Sorties observables", "rect", [
        n("sortie-effet", "Effet mesurable"),
        n("sortie-mesure", "Comment on le mesure"),
      ]),
      n("pannes", "Défaillances", "rect", [
        n("panne-cause", "Cause fréquente"),
        n("panne-signal", "Signe clinique / symptôme"),
      ]),
    ]),
  },
  {
    id: "plan-memoire",
    name: "Plan de mémoire",
    intent: "Tenir l’ossature d’un mémoire : problème, hypothèses, méthode, résultats.",
    audience: "Scientifique",
    discipline: "Recherche (IMRaD)",
    layout: "tree-tb",
    edgeStyle: "step",
    spec: n("root", "Titre de la thèse", "circle", [
      n("probleme", "Problème", "rect", [
        n("probleme-question", "Question de départ"),
        n("probleme-gap", "Ce qui manque dans la littérature"),
      ]),
      n("hypotheses", "Hypothèses", "rect", [
        n("hypothese-1", "H1 — prédiction testable"),
        n("hypothese-2", "H2 — prédiction testable"),
      ]),
      n("methode", "Méthode", "rect", [
        n("methode-terrain", "Terrain / échantillon"),
        n("methode-donnees", "Données et outils"),
      ]),
      n("resultats", "Résultats", "rect", [
        n("resultat-1", "Résultat principal"),
        n("resultat-2", "Résultat secondaire"),
      ]),
      n("discussion", "Discussion", "rect", [
        n("discussion-limites", "Limites"),
        n("discussion-apport", "Contribution"),
      ]),
    ]),
  },
  {
    id: "arbre-decision",
    name: "Arbre de décision",
    intent: "Choisir entre deux options en rendant les critères explicites.",
    audience: "Professionnel",
    discipline: "Décision (analyse multicritère)",
    layout: "tree-lr",
    edgeStyle: "step",
    spec: n("root", "Décision à prendre", "diamond", [
      n("option-a", "Option A", "rect", [
        n("a-cout", "Coût / effort"),
        n("a-risque", "Risque principal"),
        n("a-retour", "Réversible ?"),
      ]),
      n("option-b", "Option B", "rect", [
        n("b-cout", "Coût / effort"),
        n("b-risque", "Risque principal"),
        n("b-retour", "Réversible ?"),
      ]),
      n("option-c", "Report / autre voie", "rect", [
        n("c-prix", "Ce que le report coûte"),
        n("c-condition", "Condition pour décider plus tard"),
      ]),
      n("critere", "Critère décisif", "diamond", [
        n("critere-1", "Critère n°1 — pourquoi lui"),
        n("critere-2", "Seuil de bascule"),
      ]),
    ]),
  },
  {
    id: "swot",
    name: "SWOT / FFOM",
    intent: "Cadrer une situation en quatre quadrants, sans mélanger interne et externe.",
    audience: "Professionnel",
    discipline: "Stratégie",
    layout: "matrix",
    edgeStyle: "step",
    spec: n("root", "Situation analysée", "circle", [
      n("forces", "Forces (interne)", "square", [
        n("force-1", "Ce qui marche déjà"),
        n("force-2", "Ressource rare"),
      ]),
      n("faiblesses", "Faiblesses (interne)", "square", [
        n("faiblesse-1", "Ce qui bloque"),
        n("faiblesse-2", "Ce qui manque"),
      ]),
      n("opportunites", "Opportunités (externe)", "square", [
        n("opportunite-1", "Fenêtre qui s’ouvre"),
        n("opportunite-2", "Allié possible"),
      ]),
      n("menaces", "Menaces (externe)", "square", [
        n("menace-1", "Risque à surveiller"),
        n("menace-2", "Échéance imposée"),
      ]),
    ]),
  },
  {
    id: "ishikawa",
    name: "Ishikawa (6M)",
    intent: "Chercher les causes d’un problème au lieu de traiter le symptôme.",
    audience: "Scientifique",
    discipline: "Qualité industrielle",
    layout: "fishbone",
    edgeStyle: "straight",
    spec: n("root", "Effet observé / problème", "rect", [
      n("main-oeuvre", "Main-d’œuvre", "rect", [
        n("mo-formation", "Formation"),
        n("mo-charge", "Charge de travail"),
      ]),
      n("methode", "Méthode", "rect", [
        n("methode-protocole", "Protocole"),
        n("methode-controle", "Contrôle qualité"),
      ]),
      n("materiel", "Matériel", "rect", [
        n("materiel-machine", "Machine / outil"),
        n("materiel-usure", "Usure"),
      ]),
      n("milieu", "Milieu", "rect", [
        n("milieu-ambiance", "Température, bruit"),
        n("milieu-espace", "Organisation de l’espace"),
      ]),
      n("mesure", "Mesure", "rect", [
        n("mesure-instrument", "Instrument"),
        n("mesure-frequence", "Fréquence de relevé"),
      ]),
      n("matiere", "Matière", "rect", [
        n("matiere-qualite", "Qualité d’entrée"),
        n("matiere-stockage", "Stockage"),
      ]),
    ]),
  },
  {
    id: "chronologie",
    name: "Frise chronologique",
    intent: "Voir une succession d’événements et leurs conséquences, pas une liste de dates.",
    audience: "Étudiant",
    discipline: "Histoire",
    layout: "timeline",
    edgeStyle: "straight",
    spec: n("root", "Période étudiée", "circle", [
      n("t1", "Première phase", "rect", [
        n("t1-fait", "Fait déclencheur"),
        n("t1-acteur", "Acteur clé"),
      ]),
      n("t2", "Rupture", "rect", [
        n("t2-fait", "Ce qui change"),
        n("t2-date", "Date exacte"),
      ]),
      n("t3", "Consolidation", "rect", [
        n("t3-fait", "Institution ou traité"),
        n("t3-limite", "Ce qui reste en suspens"),
      ]),
      n("t4", "Héritage", "rect", [
        n("t4-effet", "Effet aujourd’hui"),
        n("t4-debat", "Débat d’historiens"),
      ]),
    ]),
  },
  {
    id: "argument-toulmin",
    name: "Argumentation (Toulmin)",
    intent: "Construire un argument solide : données, garantie, réfutation, portée.",
    audience: "Étudiant",
    discipline: "Logique juridique et philosophique",
    layout: "tree-lr",
    edgeStyle: "curved",
    spec: n("root", "Thèse défendue", "diamond", [
      n("donnees", "Données", "rect", [
        n("donnee-fait", "Fait établi"),
        n("donnee-source", "Source vérifiable"),
      ]),
      n("garantie", "Garantie", "rect", [
        n("garantie-principe", "Principe qui autorise le passage"),
        n("garantie-fondement", "Fondement : loi, texte, auteur"),
      ]),
      n("refutation", "Réfutation", "rect", [
        n("refutation-objection", "Objection la plus forte"),
        n("refutation-reponse", "Réponse à cette objection"),
      ]),
      n("conclusion", "Conclusion et portée", "rect", [
        n("conclusion-qualification", "Ce que ça prouve exactement"),
        n("conclusion-limite", "Ce que ça ne prouve pas"),
      ]),
    ]),
  },
  {
    id: "bloom-progression",
    name: "Progression de Bloom",
    intent: "Passer de « je reconnais » à « je crée » : six marches, six verbes d’action.",
    audience: "Autodidacte",
    discipline: "Ingénierie pédagogique",
    layout: "ladder",
    edgeStyle: "step",
    spec: n("root", "Objectif d’apprentissage", "circle", [
      n("m1", "1. Mémoriser", "rect", [n("m1-v", "Réciter"), n("m1-t", "Test : sans notes")]),
      n("m2", "2. Comprendre", "rect", [n("m2-v", "Reformuler"), n("m2-t", "Test : expliquer à quelqu’un")]),
      n("m3", "3. Appliquer", "rect", [n("m3-v", "Exécuter"), n("m3-t", "Test : exercice nouveau")]),
      n("m4", "4. Analyser", "rect", [n("m4-v", "Décomposer"), n("m4-t", "Test : comparer deux cas")]),
      n("m5", "5. Évaluer", "rect", [n("m5-v", "Juger"), n("m5-t", "Test : critiquer une solution")]),
      n("m6", "6. Créer", "rect", [n("m6-v", "Produire"), n("m6-t", "Test : projet personnel")]),
    ]),
  },
  {
    id: "revision-questions",
    name: "Révision par questions",
    intent: "Réviser par rappel actif : questions, pièges, erreurs déjà commises.",
    audience: "Étudiant",
    discipline: "Sciences cognitives (testing effect)",
    layout: "tree-tb",
    edgeStyle: "step",
    spec: n("root", "Chapitre à réviser", "circle", [
      n("rappel", "Questions de rappel", "rect", [
        n("rappel-1", "Q1 — sans regarder le cours"),
        n("rappel-2", "Q2 — sans regarder le cours"),
      ]),
      n("pieges", "Pièges", "rect", [
        n("piege-confusion", "Confusion classique"),
        n("piege-formule", "Formule à ne pas inverser"),
      ]),
      n("erreurs", "Mes erreurs passées", "rect", [
        n("erreur-1", "Erreur d’examen"),
        n("erreur-correction", "La correction à retenir"),
      ]),
      n("exemples", "Exemples types", "rect", [
        n("exemple-simple", "Cas simple"),
        n("exemple-tordu", "Cas tordu"),
      ]),
      n("capsule", "Résumé en 30 s", "rect", [
        n("capsule-phrase", "Une phrase"),
        n("capsule-schema", "Un schéma"),
      ]),
    ]),
  },
  {
    id: "concept-relations",
    name: "Carte conceptuelle",
    intent: "Définir un concept par ses frontières : genre proche, voisins, cas limites.",
    audience: "Scientifique",
    discipline: "Concept mapping (Novak)",
    layout: "radial",
    edgeStyle: "curved",
    spec: n("root", "Concept", "circle", [
      n("definition", "Définition", "rect", [
        n("definition-genre", "Genre proche"),
        n("definition-difference", "Différence spécifique"),
      ]),
      n("exemples", "Exemples", "rect", [
        n("exemple-typique", "Cas typique"),
        n("exemple-atypique", "Cas atypique"),
      ]),
      n("contre", "Contre-exemples", "rect", [
        n("contre-presque", "Ce qui y ressemble sans en être"),
        n("contre-erreur", "Erreur de définition courante"),
      ]),
      n("voisins", "Concepts voisins", "rect", [
        n("voisin-proche", "Le plus proche"),
        n("voisin-oppose", "Le contraire"),
      ]),
      n("auteurs", "Auteurs", "rect", [
        n("auteur-fondateur", "Qui l’a formulé"),
        n("auteur-critique", "Qui l’a critiqué"),
      ]),
    ]),
  },
  {
    id: "lancement-projet",
    name: "Lancement de projet",
    intent: "Cadrer un projet en une carte : périmètre, équipe, livrables, risques.",
    audience: "Professionnel",
    discipline: "Gestion de projet (WBS)",
    layout: "columns",
    edgeStyle: "step",
    spec: n("root", "Projet — nom", "circle", [
      n("cadrage", "Cadrage", "rect", [
        n("cadrage-objectif", "Objectif mesurable"),
        n("cadrage-perimetre", "Hors périmètre"),
      ]),
      n("equipe", "Équipe", "rect", [
        n("equipe-qui", "Qui décide"),
        n("equipe-qui-fait", "Qui exécute"),
      ]),
      n("livrables", "Livrables", "rect", [
        n("livrable-1", "Livrable 1 — date"),
        n("livrable-2", "Livrable 2 — date"),
      ]),
      n("risques", "Risques", "rect", [
        n("risque-1", "Risque majeur"),
        n("risque-plan", "Plan B"),
      ]),
      n("rituels", "Rituels", "rect", [
        n("rituel-point", "Point hebdo"),
        n("rituel-fin", "Critère de fin"),
      ]),
    ]),
  },
  {
    id: "apprentissage-langue",
    name: "Apprendre une langue",
    intent: "Ancrer un thème de langue : mots, expressions, pièges, prononciation.",
    audience: "Autodidacte",
    discipline: "Didactique des langues (lexique en contexte)",
    layout: "tree-lr",
    edgeStyle: "curved",
    spec: n("root", "Thème / situation", "circle", [
      n("mots", "Mots utiles", "rect", [
        n("mot-1", "mot — traduction"),
        n("mot-2", "mot — traduction"),
      ]),
      n("expressions", "Expressions", "rect", [
        n("expression-1", "Expression figée"),
        n("expression-contexte", "Quand l’utiliser"),
      ]),
      n("pieges", "Faux-amis et pièges", "rect", [
        n("piege-faux-ami", "Faux-ami"),
        n("piege-grammaire", "Point de grammaire"),
      ]),
      n("prononciation", "Prononciation", "rect", [
        n("prononciation-son", "Son difficile"),
        n("prononciation-accent", "Accent tonique"),
      ]),
      n("reemploi", "À réemployer", "rect", [
        n("reemploi-phrase", "Phrase à dire demain"),
        n("reemploi-ecoute", "Audio à réécouter"),
      ]),
    ]),
  },
];

/** Le modèle par défaut : celui qui montre à quoi ressemble une carte lisible. */
export const DEFAULT_MINDMAP_TEMPLATE =
  MINDMAP_TEMPLATES.find((template) => template.isDefault) ??
  MINDMAP_TEMPLATES[0];

export function getMindmapTemplate(id: string): MindmapTemplate | undefined {
  return MINDMAP_TEMPLATES.find((template) => template.id === id);
}
