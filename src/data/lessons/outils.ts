import type { Lesson, LessonStep } from "@/types";

/**
 * Les tutoriels par outil — un geste par leçon, mais un geste expliqué
 * jusqu’au bout : ce qu’il fait, quand il échoue, et comment on vérifie qu’il
 * a marché. Chaque leçon se termine par un critère, jamais par un résumé.
 */

type Extra = Omit<LessonStep, "title" | "body" | "illustration">;

const st = (
  title: string,
  body: string,
  illustration: LessonStep["illustration"],
  extra: Extra = {},
): LessonStep => ({ title, body, illustration, ...extra });

export const outilsLessons: Lesson[] = [
  {
    id: "t-outline",
    track: 1,
    index: 1,
    title: "Outline : structurer avant d’écrire",
    subtitle: "La hiérarchie comme outil de pensée",
    minutes: 5,
    method: "outline",
    outcome:
      "Construire un plan lisible à trois niveaux, transformer un brouillon en plan sans le réécrire, et savoir quand l’outline n’est pas la bonne méthode.",
    phases: ["Comprendre le retrait", "Écrire le plan", "Vérifier qu’il tient"],
    steps: [
      st(
        "Le retrait est une affirmation",
        "Dans un outline, descendre d’un cran dit « ceci est un détail de ce qui précède ». Remonter dit « ceci est au même niveau ». Ce n’est pas une décoration : chaque retrait est une affirmation sur la structure de votre raisonnement, et une hiérarchie fausse se voit immédiatement quand on la lit à voix haute. Un plan n’est pas une liste plus jolie ; c’est un argument mis en forme.",
        "map",
        {
          points: [
            "Un niveau = une relation : détail, exemple, conséquence.",
            "Trois niveaux suffisent à exprimer une démonstration.",
            "Deux blocs au même niveau doivent pouvoir se comparer.",
          ],
          mistakes: [
            "Mettre au même niveau une idée et son exemple : l’exemple devient une idée.",
            "Descendre d’un cran pour un nouveau sujet : la hiérarchie ment.",
          ],
        },
      ),
      st(
        "Un bloc, une idée, une ligne",
        "Un bloc d’outline contient une idée et rien d’autre. Dès que vous écrivez deux idées dans le même bloc, vous ne pourrez plus déplacer l’une sans l’autre : c’est le début du paragraphe-boue. Le test : coupez le bloc en deux ; si les deux moitiés vivent seules, il fallait deux blocs. On peut toujours fusionner plus tard ; on ne peut pas démêler sans réécrire.",
        "book",
        {
          points: [
            "Une idée par bloc : elle pourra être déplacée, citée, questionnée.",
            "Une ligne visible ; le développement viendra dans la note, pas dans le plan.",
            "Un bloc de plus de trois lignes contient au moins deux idées.",
          ],
        },
      ),
      st(
        "Du brouillon au plan, sans réécrire",
        "Écrivez d’abord en vrac, à la suite. Puis, dans une seconde passe, transformez : le bloc qui annonce une partie devient un titre, celui qui cite une source devient une citation, celui qui énumère devient une liste. Vous ne retapez rien — vous changez la nature des blocs. C’est la différence entre structurer et recommencer, et c’est ce qui rend la seconde passe rapide.",
        "cards",
        {
          points: [
            "Passe 1 : tout écrire, sans structure.",
            "Passe 2 : transformer les blocs (titre, citation, liste, case).",
            "Passe 3 : déplacer ce qui n’est pas à sa place.",
          ],
          practice: {
            title: "À vous",
            text: "Prenez une note en vrac, transformez deux blocs en titres et déplacez un bloc d’un cran.",
            href: "/new",
            hrefLabel: "Ouvrir l’éditeur",
          },
        },
      ),
      st(
        "Quand l’outline échoue",
        "L’outline suppose que les idées existent déjà, même mal rangées. Si vous ne savez pas encore ce que vous cherchez, un plan vide se remplit de titres creux — « Introduction », « Développement », « Conclusion » — qui n’aident personne. Dans ce cas, passez à la carte mentale : elle supporte le désordre, l’outline non. On revient au plan quand les liens sont là.",
        "question",
        {
          points: [
            "Idées absentes → carte mentale d’abord.",
            "Idées là, ordre incertain → outline.",
            "Titres génériques dans un plan = signal d’alerte.",
          ],
          mistakes: [
            "Écrire « Introduction » comme premier bloc : ce n’est pas une idée, c’est un emplacement.",
          ],
        },
      ),
      st(
        "Le test de lecture à voix haute",
        "Lisez uniquement les titres et les premiers mots de chaque bloc, à voix haute. Si la suite forme un raisonnement — parce que, donc, en revanche —, le plan tient. Si elle forme une liste de sujets, il manque les liens : c’est le signe qu’il faut soit fusionner, soit ajouter une phrase de transition. Ce test prend deux minutes et remplace une relecture de vingt.",
        "timer",
        {
          check:
            "Vos titres lus seuls racontent un raisonnement, pas une table des matières.",
        },
      ),
    ],
  },

  {
    id: "t-cornell",
    track: 1,
    index: 2,
    title: "Cornell : poser des questions sur ses notes",
    subtitle: "Le geste qui transforme une note en mémoire",
    minutes: 6,
    method: "cornell",
    outcome:
      "Formuler des questions qui font vraiment travailler la mémoire, les attacher au bon passage, et savoir lesquelles jeter.",
    phases: ["Écrire la note", "Poser les questions", "Éprouver les questions"],
    steps: [
      st(
        "Écrire d’abord, normalement",
        "Cornell ne change rien à la prise de notes : des phrases courtes, vos mots, dans l’ordre où ça vient. Ce qui change, c’est l’après — la marge dans laquelle vous poserez les questions. Si vous essayez de poser les questions en même temps que vous écoutez, vous ferez les deux mal. Notez d’abord, interrogez ensuite, à froid.",
        "book",
        {
          points: [
            "Pendant : capturer, sans se soucier de la marge.",
            "Après : relire le passage, puis poser la question.",
            "La marge se remplit à froid, jamais à chaud.",
          ],
        },
      ),
      st(
        "Une question, un passage",
        "Sélectionnez la phrase qui contient la réponse, puis écrivez la question qui la ferait revenir. Le lien entre les deux est ce qui fait la valeur de la carte : en révision, la question s’affiche, la réponse se vérifie sur ce passage précis. Une question posée sur un paragraphe entier ne se révise pas — on ne sait pas ce qu’on doit retrouver.",
        "question",
        {
          points: [
            "Sélection courte : une phrase, pas une section.",
            "La question vise cette phrase, pas le chapitre.",
            "Chaque question devient une carte indépendante.",
          ],
          mistakes: [
            "Sélectionner tout le paragraphe « au cas où » : la carte perd son point d’ancrage.",
            "Poser trois questions sur la même phrase : la deuxième et la troisième se répondent l’une l’autre.",
          ],
        },
      ),
      st(
        "Ce qui fait une bonne question",
        "Une bonne question est fermée sur le fond et ouverte sur la forme : elle admet une réponse précise, mais pas un simple « oui ». Elle ne contient pas sa réponse. Elle utilise le vocabulaire du cours, parce que c’est celui de l’examen. Et elle tient en une ligne — au-delà, c’est le passage qui est trop long, pas la question.",
        "cards",
        {
          points: [
            "Réponse en une phrase, mais pas « oui / non ».",
            "Le vocabulaire de la question est celui qui sera exigé.",
            "Une question = un point de vérification.",
          ],
          mistakes: [
            "« Le contrat est-il valable ? » : réponse possible en un mot, aucun rappel réel.",
            "« Qu’est-ce que le chapitre 2 ? » : trop large pour être corrigée.",
            "Recopier la phrase en mettant un point d’interrogation : la réponse est dans l’énoncé.",
          ],
        },
      ),
      st(
        "Trier : trois questions, pas dix",
        "Toutes les phrases d’une note ne méritent pas une question. Gardez celles qui portent une définition, une cause, une distinction, un chiffre-clé. Jetez celles qui ne servent qu’au contexte : dates de l’auteur, plan du cours, anecdotes. Une note de quatre pages donne trois à cinq cartes utiles ; le reste serait du volume, et le volume se révise mal.",
        "timer",
        {
          points: [
            "Définition, cause, distinction, chiffre : quatre motifs de question.",
            "Contexte et plan : jamais de question.",
            "Trois à cinq cartes par note : c’est le rythme tenable.",
          ],
        },
      ),
      st(
        "Répondre avant de retourner",
        "En séance, lisez la question, répondez à voix haute ou par écrit, puis vérifiez le passage. L’écart entre votre réponse et le texte est l’information la plus utile de la séance — plus utile que la note elle-même. C’est aussi ce qui distingue une révision d’une relecture : la relecture ne produit jamais d’écart, donc n’apprend rien sur vous.",
        "review",
        {
          points: [
            "Réponse formulée avant toute vérification.",
            "L’écart se note mentalement : incomplet, faux, hésitant.",
            "L’évaluation honnête vaut mieux qu’une évaluation généreuse.",
          ],
          check:
            "Vous savez écrire une question dont la réponse tient en une phrase et ne figure pas dans l’énoncé.",
          practice: {
            title: "À vous",
            text: "Ouvrez une de vos notes, sélectionnez une phrase et ajoutez la question qu’elle répond.",
            href: "/",
            hrefLabel: "Ouvrir une note",
          },
        },
      ),
    ],
  },

  {
    id: "t-mindmap",
    track: 1,
    index: 3,
    title: "Carte mentale : penser en liens",
    subtitle: "Pour les systèmes, pas pour les plans",
    minutes: 5,
    method: "mindmap",
    outcome:
      "Dessiner une carte qui reste lisible sur un téléphone, et la transformer en questions plutôt qu’en décoration.",
    phases: ["Des nœuds", "Des liens", "De la carte aux questions"],
    steps: [
      st(
        "Un nœud, un mot",
        "Le centre porte le sujet ; les branches portent des concepts, pas des phrases. « Potentiel d’action » est un nœud ; « le potentiel d’action est la dépolarisation transitoire de la membrane » est une note. La carte sert à voir des relations, et une relation se voit mal entre deux paragraphes. Si un nœud a besoin de trois lignes, il a besoin d’un enfant.",
        "map",
        {
          points: [
            "Un nœud = un concept, deux ou trois mots.",
            "Les phrases vont dans la note, pas dans la carte.",
            "Le centre est unique : deux centres, c’est deux cartes.",
          ],
          mistakes: [
            "Utiliser la carte comme un document : elle devient un plan laid.",
            "Créer un nœud par phrase lue : la carte devient une table des matières.",
          ],
        },
      ),
      st(
        "Le sens des formes",
        "Trois formes suffisent et chacune dit quelque chose : cercle pour le cœur du sujet, rectangle pour un concept, losange pour une question ouverte. Cette convention n’est pas décorative — en relisant la carte six mois plus tard, la forme vous dit ce que vous ne saviez pas encore. Une carte où tout est un rectangle est une liste ; une carte où les formes varient est une pensée.",
        "cards",
        {
          points: [
            "Cercle : le sujet, une seule fois.",
            "Rectangle : un concept établi.",
            "Losange : une question non résolue, à traiter en révision.",
          ],
        },
      ),
      st(
        "Trois niveaux, puis on arrête",
        "Au-delà du troisième niveau, une carte cesse d’être lisible sur un écran de téléphone — et une carte qu’on ne peut pas lire en entier ne sert à rien. Si un sujet demande un quatrième niveau, il demande une seconde carte ou une note structurée. La carte n’est pas un contenant : c’est une vue.",
        "timer",
        {
          points: [
            "Trois niveaux maximum, sans exception.",
            "Trop dense → deuxième carte reliée, pas une carte plus grande.",
            "Le zoom ne remplace pas la lisibilité.",
          ],
          mistakes: [
            "Empiler les niveaux pour « tout garder » : la carte devient illisible avant d’être complète.",
          ],
        },
      ),
      st(
        "De la carte aux questions",
        "Chaque lien est une question en puissance. « Superposition → mesure » devient « que devient la superposition lors d’une mesure ? ». C’est le passage que la plupart des cartes ne font jamais : elles restent belles et ne servent à rien. Prenez trois liens de votre carte et écrivez-les en questions — vous venez de créer trois cartes de révision à partir d’un dessin.",
        "question",
        {
          points: [
            "Un lien = une relation = une question possible.",
            "Trois liens suffisent pour une première séance.",
            "Les losanges (questions ouvertes) sont prioritaires.",
          ],
          practice: {
            title: "À vous",
            text: "Ouvrez une carte mentale, choisissez trois liens et notez la question que chacun pose.",
            href: "/",
            hrefLabel: "Ouvrir une carte",
          },
        },
      ),
      st(
        "Ce qu’une carte ne sait pas faire",
        "Une carte ne démontre pas : elle montre des proximités et des dépendances. Pour un raisonnement linéaire — une dissertation, une preuve —, l’outline est le bon outil ; pour un système avec des boucles, la carte gagne. Choisir la carte pour faire un plan, c’est utiliser une boussole comme règle.",
        "book",
        {
          check:
            "Votre carte tient en trois niveaux et vous en avez tiré au moins trois questions.",
        },
      ),
    ],
  },

  {
    id: "t-zettel",
    track: 1,
    index: 4,
    title: "Zettelkasten : une fiche, une idée",
    subtitle: "Pour la recherche au long cours",
    minutes: 6,
    method: "zettelkasten",
    outcome:
      "Écrire des fiches reformulées, sourcées et reliées à la main — et savoir quand le Zettelkasten est inutile.",
    phases: ["Écrire une fiche", "La sourcer", "La relier"],
    steps: [
      st(
        "Avec vos propres mots",
        "Une fiche contient une idée reformulée, jamais un copier-coller. Ce n’est pas une précaution morale : c’est le seul moyen de savoir si vous avez compris. Si la reformulation résiste, retournez à la source — c’est exactement là que se trouve votre lacune. Une fiche qui reprend la phrase de l’auteur ne s’oubliera pas parce qu’elle n’a jamais été sue.",
        "cards",
        {
          points: [
            "Une fiche = une idée, en trois à six phrases.",
            "Reformuler, c’est tester la compréhension.",
            "Deux idées dans une fiche = deux fiches à faire.",
          ],
          mistakes: [
            "Copier un paragraphe et l’appeler fiche : vous avez archivé, pas pensé.",
            "Écrire des fiches de résumé (« ce chapitre parle de… ») : ce n’est pas une idée.",
          ],
        },
      ),
      st(
        "Toujours la source",
        "Sans référence, une fiche est une rumeur. Notez l’auteur, l’ouvrage, la page — de quoi retrouver le passage en trente secondes. Cette discipline a un effet secondaire précieux : elle vous oblige à ne pas inventer. Une fiche dont vous ne pouvez pas retrouver la source n’entrera jamais dans un travail rendu, quel qu’en soit l’intérêt.",
        "book",
        {
          points: [
            "Auteur, ouvrage, page : trois informations minimales.",
            "La source se met au moment de l’écriture, jamais après.",
            "Une fiche sans source ne s’utilise pas.",
          ],
        },
      ),
      st(
        "Relier à la main",
        "Pas de liens automatiques par mots-clés : vous décidez qu’une idée en éclaire une autre, et vous l’écrivez — « Voir #1A », « contredit #2C ». C’est ce geste, répété, qui construit un réseau ; un algorithme produirait des liens plausibles et faux. Chaque lien doit pouvoir se justifier en une phrase : « parce que… ». Si la phrase manque, le lien ne sert qu’à densifier le graphe.",
        "map",
        {
          points: [
            "Un lien se justifie par une phrase : « parce que… ».",
            "Deux à quatre liens par fiche : au-delà, la moitié est décorative.",
            "Relier, c’est se souvenir — pas classer.",
          ],
          mistakes: [
            "Relier tout à tout : le graphe devient une pelote et perd son information.",
            "Relier par mot-clé identique : deux notions peuvent partager un mot et n’avoir aucun rapport.",
          ],
        },
      ),
      st(
        "Le code de citation",
        "Chaque fiche porte un code qui permet de la citer dans le texte : #1A pour une idée, #1A1 pour son développement. Ce code n’est pas un identifiant technique, c’est une adresse de lecture — elle dit d’où vient l’idée et à quoi elle se rattache. C’est ce qui permet de citer sans recopier, et de vérifier son propre raisonnement en remontant la chaîne.",
        "question",
        {
          points: [
            "Un code par fiche, stable, court.",
            "La descendance (1A1) indique la filiation, pas la chronologie.",
            "Citer un code dans une note évite de recopier l’idée.",
          ],
        },
      ),
      st(
        "Quand le Zettelkasten est inutile",
        "Pour réviser un partiel dans trois semaines, il est disproportionné : les questions posées sur les notes suffisent. Le Zettelkasten prend sa valeur sur un travail long — mémoire, thèse, veille — où l’on ne sait pas encore quelles idées se rencontreront. Le reconnaître évite deux erreurs symétriques : l’abandonner trop tôt, et l’imposer partout.",
        "timer",
        {
          check:
            "Votre dernière fiche est reformulée, sourcée, et porte au moins un lien justifié en une phrase.",
        },
      ),
    ],
  },

  {
    id: "t-reviser",
    track: 1,
    index: 5,
    title: "Réviser : l’espacement, pas la volonté",
    subtitle: "Quatre boutons, une doctrine",
    minutes: 5,
    method: "cornell",
    outcome:
      "Évaluer une carte honnêtement, comprendre ce que chaque bouton fait aux intervalles, et tenir une séance sans s’épuiser.",
    phases: ["Rappeler", "Évaluer", "Tenir dans la durée"],
    steps: [
      st(
        "Répondre avant de retourner",
        "La carte affiche la question, pas la réponse. Formulez votre réponse à voix haute ou dans le champ prévu, puis retournez. Ce délai — quelques secondes d’effort — est l’ingrédient actif de la révision : le sauter transforme la séance en relecture déguisée. Une carte lue sans effort ne modifie presque rien.",
        "review",
        {
          points: [
            "Formuler, puis vérifier : jamais l’inverse.",
            "L’hésitation fait partie du travail.",
            "Retourner trop vite annule l’effet de la carte.",
          ],
        },
      ),
      st(
        "Ce que les quatre boutons changent",
        "« Encore » ramène la carte dans la séance même. « Difficile », « Bien » et « Facile » éloignent la carte de quelques jours, d’une semaine ou davantage, selon l’historique de la carte et non selon votre humeur. C’est l’algorithme (FSRS) qui calcule l’intervalle : votre rôle est de dire honnêtement comment le rappel s’est passé, pas de choisir la date.",
        "timer",
        {
          points: [
            "Encore : la carte revient tout de suite.",
            "Difficile / Bien / Facile : intervalles croissants.",
            "L’intervalle appartient à l’algorithme, l’évaluation à vous.",
          ],
          mistakes: [
            "Choisir « Facile » pour raccourcir la séance : la carte reviendra dans trois mois, au pire moment.",
            "Cliquer « Encore » par confort alors que la réponse était là : les intervalles se raccourcissent pour rien.",
          ],
        },
      ),
      st(
        "Ce qu’un échec signifie",
        "Une carte ratée ne dit rien de votre intelligence ; elle dit que l’intervalle était trop long, ou que la question est mal posée. Deux conséquences pratiques : on laisse l’algorithme raccourcir, et on réécrit parfois la question. Si trois cartes d’une même note échouent, le problème est la note — trop dense, mal découpée —, pas la mémoire.",
        "question",
        {
          points: [
            "Un échec = un intervalle trop long, ou une question floue.",
            "Trois échecs sur une note = la note est à reprendre.",
            "Une carte réécrite vaut mieux qu’une carte répétée.",
          ],
        },
      ),
      st(
        "Dix minutes, tous les jours",
        "La régularité bat l’intensité : dix minutes quotidiennes produisent plus de rétention que deux heures le dimanche, parce que les intervalles travaillent entre les séances. L’app propose un nombre de cartes ; vous décidez de vous arrêter, jamais de sauter un jour. Une séance courte et faite vaut mieux qu’une séance parfaite et reportée.",
        "timer",
        {
          points: [
            "Un jour sauté coûte deux jours de rattrapage.",
            "Mieux vaut écourter que reporter.",
            "Le rappel est fatigant : c’est le signe qu’il fonctionne.",
          ],
          practice: {
            title: "À vous",
            text: "Lancez une séance de dix cartes, sans en sauter aucune.",
            href: "/review",
            hrefLabel: "Réviser maintenant",
          },
        },
      ),
      st(
        "Ce que la séance ne remplace pas",
        "Réviser ne sert qu’à consolider des cartes existantes ; cela n’apprend rien de neuf. Si une question vous semble incompréhensible en séance, ce n’est pas une carte à réviser mais une note à reprendre. La règle est simple : incompréhension → retour à la note ; oubli → séance de révision.",
        "book",
        {
          check:
            "Vous savez dire, après une carte, si l’échec vient de l’intervalle ou de la question.",
        },
      ),
    ],
  },

  {
    id: "t-effort",
    track: 1,
    index: 6,
    title: "Pourquoi l’effort fait retenir",
    subtitle: "Rappel actif, espacement, difficulté souhaitable",
    minutes: 5,
    outcome:
      "Reconnaître les trois illusions qui font perdre du temps, et les remplacer par trois gestes qui coûtent un peu plus et rapportent beaucoup.",
    phases: ["Les illusions", "Les gestes", "L’équilibre"],
    steps: [
      st(
        "L’illusion de compétence",
        "Relire donne une impression de maîtrise immédiate — et cette impression est un très mauvais prédicteur de ce dont vous vous souviendrez dans une semaine. Ce n’est pas que relire soit inutile : c’est que la sensation de fluidité est trompeuse. Plus un texte paraît facile, moins il est en train de vous apprendre.",
        "book",
        {
          points: [
            "La fluidité ressentie n’est pas la mémoire.",
            "Relire est confortable, donc peu efficace.",
            "Ce qui paraît difficile maintenant se retient mieux.",
          ],
        },
      ),
      st(
        "L’effet de test",
        "Se tester modifie la trace mnésique plus profondément que relire, même quand le test est raté. C’est le résultat le plus solide de la psychologie de l’apprentissage, et c’est exactement ce que fait une carte de révision. Une question ratée vaut mieux qu’un surlignage réussi : l’une réorganise la mémoire, l’autre la décore.",
        "question",
        {
          points: [
            "Tester > relire, à temps égal.",
            "L’échec pendant le test est productif.",
            "Une question par passage suffit à déclencher l’effet.",
          ],
          mistakes: [
            "Vérifier la réponse avant d’avoir formulé la sienne : le test se transforme en relecture.",
          ],
        },
      ),
      st(
        "L’espacement",
        "Revoir juste avant d’oublier renforce durablement ; revoir trop tôt ne fait rien. C’est tout l’intérêt de laisser l’algorithme décider des intervalles plutôt que de relire « quand on a le temps ». L’espacement est aussi la raison pour laquelle un retard de trois jours n’est pas grave, alors qu’un abandon de trois semaines coûte cher.",
        "timer",
        {
          points: [
            "Trop tôt : aucun effet.",
            "Juste avant l’oubli : effet maximal.",
            "Trois jours de retard sont rattrapables ; trois semaines non.",
          ],
        },
      ),
      st(
        "La difficulté souhaitable",
        "Un apprentissage qui ne coûte rien ne laisse rien : c’est le principe de la difficulté souhaitable. Il faut donc résister à quatre tentations — relire au lieu de réciter, surligner au lieu de questionner, regrouper par thème au lieu d’alterner, et se rassurer en reconnaissant au lieu de se tester. Chacune est agréable, et chacune vole du temps.",
        "cards",
        {
          points: [
            "Réciter plutôt que relire.",
            "Questionner plutôt que surligner.",
            "Alterner les sujets plutôt que les bloquer.",
            "Se tester plutôt que se rassurer.",
          ],
          mistakes: [
            "Enchaîner trente cartes du même chapitre : l’alternance est ce qui fait la différence en examen.",
          ],
        },
      ),
      st(
        "Expliquer simplement : la technique de Feynman",
        "Expliquez l’idée à voix haute, comme à quelqu’un qui ne connaît rien. Là où la phrase se casse — vous cherchez un mot, vous sautez une étape —, la compréhension manque encore. Cet endroit précis est votre prochaine question de révision. C’est la seule technique qui rende visible ce qu’on croyait savoir.",
        "review",
        {
          check:
            "Vous avez repéré, dans votre dernière séance, un moment où vous avez reconnu sans savoir.",
          practice: {
            title: "À vous",
            text: "Expliquez à voix haute une idée de votre dernier cours, sans notes, pendant deux minutes.",
            href: "/learn/t-reviser",
            hrefLabel: "Voir la leçon Réviser",
          },
        },
      ),
    ],
  },
  {
    id: "t-ecrire",
    track: 1,
    index: 7,
    title: "Écrire sans lever les mains",
    subtitle: "La palette, le pupitre, la fiche — et la lecture",
    minutes: 6,
    outcome:
      "Mettre en forme sans quitter le clavier, garder quatre gestes sous le pouce sur téléphone, régler une note sans la réécrire, étiqueter un passage en un caractère, et lire sans être sollicité.",
    phases: ["Un seul registre", "Pupitre et fiche", "Étiquettes"],
    steps: [
      st(
        "Une commande, une seule porte",
        "Tout ce que l’éditeur sait faire existe dans un registre unique. La palette (Ctrl ou ⌘ + K) n’est qu’une façon de l’ouvrir : la barre de mise en forme, le menu de sélection et le pupitre y puisent les mêmes commandes. La conséquence pratique, c’est qu’aucune commande ne peut exister à un endroit et manquer à un autre — et qu’une commande inapplicable s’y affiche grisée, avec sa raison, au lieu de disparaître.",
        "book",
        {
          points: [
            "Ctrl/⌘ + K ouvre la palette, où que soit le curseur.",
            "Tapez « puces », « gras », « remplace » : la recherche ignore les accents.",
            "Une ligne grisée dit pourquoi — jamais de bouton qui s’évapore.",
            "Les cinq dernières commandes reviennent en tête de liste.",
          ],
          mistakes: [
            "Chercher un geste dans un menu alors que la palette le trouve en trois lettres.",
          ],
        },
      ),
      st(
        "Le pupitre : quatre gestes, pas plus",
        "Sur téléphone, une barre de vingt boutons ne tient pas sous le pouce. Le pupitre en garde quatre, que vous choisissez, plus un bouton « Tout » qui ouvre la palette. Une barre courte n’est pas une barre pauvre : elle est stable, donc vous savez où est chaque geste sans regarder.",
        "cards",
        {
          points: [
            "Quatre gestes au maximum, choisis par vous.",
            "Le contenu ne change jamais selon le contexte : même place, même ordre.",
            "« Tout » ouvre la palette pour les jours où il faut autre chose.",
          ],
        },
      ),
      st(
        "Ranger le pupitre, au doigt comme au clavier",
        "Un appui long de 500 ms sur n’importe quel bouton du pupitre ouvre le rangement : une croix retire un geste, une poignée le déplace (flèches haut et bas au clavier), « Ajouter un geste » en propose un de plus, « Réinitialiser » revient aux quatre d’origine. Rien ne se règle dans un écran de configuration séparé : on range là où l’on écrit.",
        "map",
        {
          points: [
            "Appui long sur le pupitre, ou « Ranger le pupitre » depuis la fiche.",
            "La poignée se déplace au clavier, avec les flèches.",
            "Le réglage suit l’appareil : un téléphone n’impose rien au bureau.",
          ],
          mistakes: [
            "Ranger le pupitre depuis le bureau : la barre n’y existe pas, la palette suffit.",
          ],
        },
      ),
      st(
        "La fiche : régler la note sans la toucher",
        "Ctrl/⌘ + . ouvre la fiche — un panneau collé au bord droit sur bureau, une feuille sur téléphone. Elle range (vault, projet), elle fait lire (lecture, chercher, remplacer), elle fait sortir (exporter, copier, lier) et elle gère (renommer, corbeille). Rien n’y modifie le texte : c’est le point de la séparation. La corbeille est à part, et demande une seconde confirmation.",
        "question",
        {
          points: [
            "Quatre sections nommées : Ranger, Lire, Sortir, Gérer.",
            "Changer de projet vide le vault s’il n’appartient pas au nouveau projet.",
            "La corbeille ne se déclenche jamais au premier clic.",
          ],
          mistakes: [
            "Chercher « Exporter » dans un menu d’édition : c’est une sortie, donc dans Sortir.",
          ],
        },
      ),
      st(
        "Les étiquettes : un mot qui traverse les notes",
        "Tapez # dans une note : la liste des étiquettes déjà employées s’ouvre sous le curseur, filtrée à mesure que vous écrivez. Choisissez avec les flèches et Entrée, ou cliquez. L’étiquette écrite reste du texte — #méthode, pas un objet caché —, ce qui veut dire qu’elle survit à l’export Markdown, à une sauvegarde restaurée et à un changement d’éditeur. La base retient les noms rencontrés : à la note suivante, la même liste vous attend, même dans une note vide.",
        "cards",
        {
          points: [
            "Tapez # puis les premières lettres : la liste se filtre.",
            "Entrée prend la proposition surlignée, Échap referme sans rien écrire.",
            "#chapitre/3 reste une seule étiquette : la barre oblique hiérarchise.",
            "L’accent compte, la casse non : #Thèse et #thèse sont la même étiquette.",
            "La bibliothèque filtre par étiquette, et deux étiquettes cochées élargissent la vue.",
          ],
          mistakes: [
            "Mettre une espace dans une étiquette : elle s’arrête au premier blanc.",
            "Compter sur # au milieu d’un mot : « C# » n’ouvre pas la liste.",
          ],
        },
      ),
      st(
        "La lecture : le texte, et rien d’autre",
        "Le mode lecture retire le compositeur, la colonne de questions et le pupitre. Il reste le texte, à 68 signes de large, et un seul bouton discret pour sortir — ou Échap. C’est le seul mode de l’application qui ne propose rien : c’est pour cela qu’il sert.",
        "review",
        {
          check:
            "Vous avez réglé un geste du pupitre et relu une note entière en lecture, sans chercher un bouton.",
          practice: {
            title: "À vous",
            text: "Ouvrez une note, appuyez sur « Fiche », passez en lecture, lisez jusqu’au bout, puis quittez avec Échap.",
            href: "/",
            hrefLabel: "Choisir une note",
          },
        },
      ),
    ],
  },
];
