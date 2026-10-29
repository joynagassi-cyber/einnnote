import type { Lesson, LessonStep } from "@/types";

/**
 * Le cours — « Lire pour retenir ».
 *
 * Neuf leçons qui ne parlent plus de l’app mais de la lecture elle-même :
 * quatre niveaux, inspection, page blanche, livre, article, documentation,
 * cours, sources multiples, durée. Ce sont des leçons de contenu, pas de
 * manipulation — et c’est assumé : sans méthode de lecture, l’outil ne sert à
 * rien.
 */

type Extra = Omit<LessonStep, "title" | "body" | "illustration">;

const st = (
  title: string,
  body: string,
  illustration: LessonStep["illustration"],
  extra: Extra = {},
): LessonStep => ({ title, body, illustration, ...extra });

export const lectureLessons: Lesson[] = [
  {
    id: "c-1",
    track: 2,
    index: 1,
    title: "Lire n’est pas apprendre",
    subtitle: "Repérer l’illusion de compétence",
    minutes: 4,
    outcome:
      "Distinguer ce qui donne l’impression de savoir de ce qui produit réellement une trace mémorielle.",
    phases: ["Le constat", "Le test", "Le remplacement"],
    steps: [
      st(
        "Le confort n’est pas la mémoire",
        "Surligner, relire, recopier : ces trois gestes sont agréables, rapides, et laissent une trace sur la page plutôt que dans la tête. Ils partagent un point commun — aucun ne demande de reconstruire l’idée. Or c’est la reconstruction qui consolide. Le sentiment de fluidité qu’ils produisent est le pire conseiller de votre semaine de révision.",
        "book",
        {
          points: [
            "Trois gestes confortables, un effet quasi nul : surligner, relire, recopier.",
            "La fluidité ressentie n’est pas un indicateur de mémoire.",
            "Ce qui coûte un effort de reconstruction est ce qui reste.",
          ],
        },
      ),
      st(
        "Le test avant la relecture",
        "Après un chapitre, fermez le livre et écrivez trois questions — sans regarder. Vous découvrirez en deux minutes ce que la relecture vous aurait caché pendant une heure. Ce test est inconfortable la première fois ; c’est précisément pour cela qu’il informe : l’inconfort signale l’endroit où le savoir n’est pas encore là.",
        "question",
        {
          points: [
            "Fermer le livre avant d’écrire.",
            "Trois questions, pas un résumé : le résumé se récite.",
            "Ce que vous ne pouvez pas questionner n’est pas encore appris.",
          ],
          mistakes: [
            "Écrire un résumé « pour voir » : il reprend le plan du texte sans tester la mémoire.",
          ],
        },
      ),
      st(
        "Ce qu’on remplace, concrètement",
        "Remplacez la relecture par un rappel : fermez, récitez, puis vérifiez. Remplacez le surlignage par une question en marge : la phrase surlignée ne sera jamais relue seule, la question si. Remplacez la recopie par une reformulation en trois phrases, avec vos mots. Trois substitutions, aucun outil nouveau, et la même heure de travail rapporte davantage.",
        "cards",
        {
          points: [
            "Relecture → rappel libre.",
            "Surlignage → question en marge.",
            "Recopie → reformulation en trois phrases.",
          ],
          practice: {
            title: "À vous",
            text: "Prenez la dernière note que vous avez écrite et transformez un passage surligné en question.",
            href: "/",
            hrefLabel: "Ouvrir mes notes",
          },
        },
      ),
      st(
        "Le critère honnête",
        "Une séance de lecture réussie n’est pas une séance où l’on a tout compris, mais une séance d’où l’on sort avec des questions qu’on ne savait pas poser en entrant. Si vous ne pouvez pas formuler une seule question après une heure de lecture, ce n’est pas que tout est clair : c’est que rien n’a été confronté.",
        "timer",
        {
          points: [
            "Le bon indicateur est le nombre de questions nouvelles, pas le confort.",
            "Zéro question après une heure signale une lecture non confrontée.",
            "Le but n’est pas d’avoir compris, mais d’avoir de quoi tester.",
          ],
          mistakes: [
            "Prendre « j’ai tout compris » pour un résultat : c’est le plus souvent l’absence de test.",
          ],
          check:
            "Après votre prochaine séance de lecture, vous avez trois questions écrites, pas trois pages surlignées.",
        },
      ),
    ],
  },

  {
    id: "c-2",
    track: 2,
    index: 2,
    title: "Les quatre niveaux de lecture d’Adler",
    subtitle: "Élémentaire, informative, analytique, syntopique",
    minutes: 5,
    outcome:
      "Choisir un niveau de lecture avant d’ouvrir un texte, et savoir combien de temps y consacrer.",
    phases: ["Les quatre niveaux", "L’inspection", "Le bon niveau"],
    steps: [
      st(
        "Quatre niveaux, quatre efforts",
        "Lire pour le sens immédiat (élémentaire), pour s’informer (informatif), pour comprendre (analytique), pour comparer plusieurs auteurs (syntopique). Ces niveaux ne s’empilent pas : on ne lit pas un article de presse comme un chapitre de manuel, et on ne lit pas un manuel comme on compare trois auteurs sur une question. Choisir le niveau évite le gaspillage dans les deux sens.",
        "book",
        {
          points: [
            "Élémentaire : comprendre les phrases.",
            "Informatif : savoir de quoi parle le texte, en survol.",
            "Analytique : comprendre l’argument et ses preuves.",
            "Syntopique : comparer plusieurs textes sur une même question.",
          ],
        },
      ),
      st(
        "L’inspection en quinze minutes",
        "Titre, sous-titres, sommaire, introduction, conclusion, index, premières phrases de chaque section. En quinze minutes, vous saurez si le texte mérite une lecture analytique — et vous l’aborderez avec une carte en tête, ce qui change radicalement la vitesse de la lecture suivante. Une inspection ratée coûte quinze minutes ; une lecture analytique inutile coûte trois heures.",
        "timer",
        {
          points: [
            "Toujours dans cet ordre : sommaire, introduction, conclusion.",
            "L’index révèle les notions que l’auteur juge centrales.",
            "La sortie de l’inspection est une décision : lire ou non.",
          ],
          practice: {
            title: "À vous",
            text: "Prenez un livre ou un rapport sur votre bureau et chronométrez quinze minutes d’inspection.",
            href: "/new",
            hrefLabel: "Noter l’inspection",
          },
        },
      ),
      st(
        "Ce que chaque niveau demande",
        "Le niveau informatif demande de la vitesse et une mémoire de l’architecture ; l’analytique demande un crayon, des questions et de la lenteur locale ; le syntopique demande une grille de questions communes à tous les textes, sinon la comparaison dérive. Confondre les exigences — vouloir être rapide en analytique — donne la pire des lectures : lente et superficielle.",
        "map",
        {
          points: [
            "Informatif : architecture du texte, pas les détails.",
            "Analytique : questions écrites, passages cités.",
            "Syntopique : une grille de questions identique pour tous les auteurs.",
          ],
          mistakes: [
            "Lire un article scientifique en mode informatif puis se plaindre de ne pas le comprendre.",
          ],
        },
      ),
      st(
        "Le niveau se décide, il ne s’improvise pas",
        "Avant d’ouvrir le texte, écrivez le niveau et le temps alloué : « informatif, 20 minutes », « analytique, 1 h 30 pour le chapitre 3 ». Cette phrase minuscule empêche deux dérives : passer trois heures sur un texte qui n’en valait pas une, et expédier en vingt minutes un texte qui demandait une matinée.",
        "question",
        {
          check:
            "Vous notez, avant chaque lecture, un niveau et une durée — et vous les respectez.",
        },
      ),
    ],
  },

  {
    id: "c-3",
    track: 2,
    index: 3,
    title: "Avant de lire : la page blanche",
    subtitle: "Ce que je sais déjà, ce que je cherche",
    minutes: 4,
    outcome:
      "Transformer une lecture en vérification d’hypothèses plutôt qu’en défilement de pages.",
    phases: ["Deux colonnes", "Trois questions", "Le retour"],
    steps: [
      st(
        "Deux colonnes",
        "Sur une page, deux colonnes : à gauche ce que vous savez déjà du sujet, à droite ce que vous cherchez. L’exercice prend cinq minutes et change la nature de la lecture — vous ne subissez plus un texte, vous vérifiez des attentes. La colonne de gauche révèle aussi vos erreurs : les corriger pendant la lecture ancre mieux que découvrir une notion neuve.",
        "book",
        {
          points: [
            "Gauche : mes connaissances, même approximatives.",
            "Droite : mes questions, formulées avant d’ouvrir.",
            "Cinq minutes, pas quinze : c’est un échauffement.",
          ],
        },
      ),
      st(
        "Les questions d’attente",
        "Formulez trois questions avant d’ouvrir le texte : ce que vous voulez savoir, ce que vous doutez de comprendre, ce que vous aimeriez pouvoir expliquer ensuite. Vous lirez plus lentement là où se trouvent les réponses et plus vite ailleurs — c’est exactement ce que fait un lecteur expérimenté, sans y penser.",
        "question",
        {
          points: [
            "Trois questions, écrites, avant la première page.",
            "Elles deviennent les questions de révision.",
            "Une lecture sans attente se lit au même rythme partout.",
          ],
          mistakes: [
            "Écrire des questions trop générales (« qu’est-ce que c’est ? ») qui ne dirigent aucune lecture.",
          ],
        },
      ),
      st(
        "Le retour après lecture",
        "Après la lecture, reprenez la page : quelles questions ont reçu une réponse, lesquelles sont restées ouvertes, lesquelles se sont révélées mal posées ? La troisième catégorie est la plus instructive — elle montre ce que vous croyiez devoir apprendre et qui n’était pas le sujet. C’est ainsi qu’on apprend à lire un domaine, et pas seulement un texte.",
        "review",
        {
          points: [
            "Répondues : matière à questions de révision.",
            "Ouvertes : prochaine lecture ou prochaine question à poser.",
            "Mal posées : la vraie progression de la séance.",
          ],
          practice: {
            title: "À vous",
            text: "Écrivez vos deux colonnes dans une note avant votre prochaine séance de lecture.",
            href: "/new",
            hrefLabel: "Ouvrir une note",
          },
        },
      ),
      st(
        "Sans page blanche, pas de lecture active",
        "Une lecture sans préparation produit deux choses : du surlignage et une impression de travail. La page blanche est le seul dispositif qui vous oblige à savoir ce que vous cherchez — et donc à reconnaître le moment où vous l’avez trouvé.",
        "timer",
        {
          check:
            "Votre prochaine lecture commence par trois questions écrites, pas par la première page.",
        },
      ),
    ],
  },

  {
    id: "c-4",
    track: 2,
    index: 4,
    title: "Lire un livre",
    subtitle: "Inspection, puis lecture analytique chapitre par chapitre",
    minutes: 5,
    outcome:
      "Aborder un livre entier sans se perdre : plan en cinq lignes, une note par chapitre, questions à la fin de chaque section.",
    phases: ["La carte", "La traversée", "La sortie"],
    steps: [
      st(
        "La carte avant le voyage",
        "Inspection : couverture, sommaire, introduction, dernier chapitre. Écrivez le plan du livre en cinq lignes, avec vos mots. Ce plan n’a pas besoin d’être juste — il a besoin d’exister, parce qu’il donne un cadre aux chapitres et permet de rattacher chaque idée à une architecture. Un livre lu sans carte se réduit à une suite d’anecdotes.",
        "map",
        {
          points: [
            "Cinq lignes, pas davantage : c’est une carte, pas un résumé.",
            "Le dernier chapitre annonce souvent la thèse réelle.",
            "La carte se corrige au fil de la lecture.",
          ],
        },
      ),
      st(
        "Une note par chapitre, pas une note par livre",
        "Une note unique pour un livre entier finit en patchwork illisible. Une note par chapitre garde le contexte, permet de revenir sur un point précis et produit des questions locales — donc révisables. Le titre de chaque note reprend l’idée du chapitre, jamais son numéro : dans six mois, « Chapitre 4 » ne dira plus rien.",
        "book",
        {
          points: [
            "Une note par chapitre, titrée par l’idée.",
            "Deux à quatre questions par chapitre suffisent.",
            "Les notes se rangent dans un seul vault : le sujet du livre, pas le livre.",
          ],
          mistakes: [
            "Créer un vault par livre : le vault doit nommer une partie du sujet, pas une source.",
          ],
        },
      ),
      st(
        "Lire avec un crayon",
        "À la fin de chaque section, une question. Si vous ne trouvez pas de question, vous n’avez pas encore trouvé l’idée : relisez la dernière phrase, souvent elle la contient. Cette discipline ralentit la première moitié du livre et accélère considérablement la seconde, parce que vous lisez désormais avec les mots de l’auteur en tête.",
        "question",
        {
          points: [
            "Une question par section, écrite sur place.",
            "Pas de question = idée non identifiée.",
            "Les questions se relisent ; les notes non.",
          ],
          practice: {
            title: "À vous",
            text: "Ouvrez une note pour le chapitre en cours et posez deux questions.",
            href: "/new",
            hrefLabel: "Créer la note",
          },
        },
      ),
      st(
        "La sortie du livre",
        "Terminez par un tri : trois idées à retenir, une objection à formuler, une question restée ouverte. Ce tri prend dix minutes et remplace un résumé de trois pages. Une objection personnelle vaut particulièrement le coup : c’est le signe que vous avez lu en pensant, pas en enregistrant.",
        "review",
        {
          check:
            "Vous sortez d’un livre avec trois idées, une objection et une question — écrites.",
        },
      ),
    ],
  },

  {
    id: "c-5",
    track: 2,
    index: 5,
    title: "Lire un article scientifique",
    subtitle: "Résumé, introduction, discussion, méthode en dernier",
    minutes: 5,
    outcome:
      "Lire un article en trente minutes, en sachant ce que les auteurs démontrent — et ce qu’ils ne démontrent pas.",
    phases: ["L’ordre de lecture", "La question", "Les limites"],
    steps: [
      st(
        "L’ordre qui économise du temps",
        "Résumé pour la question et le résultat ; introduction pour l’enjeu et l’état de la littérature ; discussion pour l’interprétation et les limites ; méthode en dernier, et uniquement si vous devez vérifier. Lire dans l’ordre du texte est une habitude de roman, pas une méthode de recherche : la méthode arrive en premier dans la page et en dernier dans la compréhension.",
        "book",
        {
          points: [
            "Résumé : que testent-ils, que trouvent-ils ?",
            "Introduction : pourquoi cela manquait-il ?",
            "Discussion : ce qu’ils croient pouvoir conclure.",
            "Méthode : seulement pour vérifier ou reproduire.",
          ],
          mistakes: [
            "Commencer par la méthode : on abandonne au deuxième paragraphe de statistiques.",
          ],
        },
      ),
      st(
        "La question de recherche d’abord",
        "Cherchez la phrase du type « nous testons si… », « cette étude examine… ». Tout le reste — échantillon, statistiques, figures — ne prend son sens qu’en fonction d’elle. Sans cette phrase, vous lisez des résultats sans savoir à quelle question ils répondent, et vous retiendrez des chiffres décontextualisés.",
        "question",
        {
          points: [
            "Repérer la phrase qui énonce la question.",
            "Vérifier que le résultat y répond vraiment.",
            "Un résultat sans question est une anecdote chiffrée.",
          ],
          practice: {
            title: "À vous",
            text: "Sur votre prochain article, notez la question de recherche avant de lire les résultats.",
            href: "/new",
            hrefLabel: "Ouvrir une note",
          },
        },
      ),
      st(
        "Ce que la discussion avoue",
        "La discussion contient trois choses utiles : les limites annoncées par les auteurs, les limites qu’ils n’annoncent pas, et la généralisation qu’ils s’autorisent. La troisième est celle qui se transforme le plus souvent en erreur de citation. Notez la phrase exacte de la conclusion : c’est la seule formulation que vous pourrez reprendre sans trahir.",
        "cards",
        {
          points: [
            "Limites annoncées : à citer telles quelles.",
            "Généralisation : à vérifier contre l’échantillon.",
            "La phrase de conclusion se recopie mot pour mot.",
          ],
        },
      ),
      st(
        "Trois questions par article",
        "Quelle question ? Quel résultat principal ? Quelle limite ? Trois questions suffisent à retenir un article — et à le citer correctement six mois plus tard. La méthode, elle, ne devient une question que si vous devez reproduire l’étude : dans ce cas, elle mérite deux cartes à elle seule.",
        "timer",
        {
          check:
            "Vous pouvez citer un article par sa question, son résultat et sa limite, sans le relire.",
        },
      ),
    ],
  },

  {
    id: "c-6",
    track: 2,
    index: 6,
    title: "Lire une documentation technique",
    subtitle: "Le chemin minimal, puis l’élargissement",
    minutes: 4,
    outcome:
      "Trouver dans une documentation ce qui résout votre problème, sans lire cent pages inutiles.",
    phases: ["Le chemin minimal", "Casser", "Élargir"],
    steps: [
      st(
        "Chercher le chemin minimal",
        "Une documentation contient beaucoup plus que ce dont vous avez besoin. Cherchez l’exemple minimal qui fonctionne, comprenez-le ligne par ligne, puis élargissez. Lire la documentation comme un manuel — du début à la fin — est la meilleure façon de ne rien retenir : sans problème à résoudre, aucune information n’accroche.",
        "book",
        {
          points: [
            "Un problème concret d’abord, la documentation ensuite.",
            "L’exemple minimal, compris ligne à ligne.",
            "Élargir seulement après avoir fait marcher l’exemple.",
          ],
          mistakes: [
            "Lire le chapitre « concepts » avant d’avoir un problème : le vocabulaire ne s’accroche à rien.",
          ],
        },
      ),
      st(
        "Casser volontairement",
        "Modifiez l’exemple, provoquez une erreur, lisez le message. La documentation devient alors une carte de dépannage au lieu d’un roman technique : chaque erreur rencontrée est une entrée que vous avez écrite vous-même, donc retenue. Cette méthode est aussi la seule qui apprenne à lire les messages d’erreur — compétence qui vaut plus que la moitié des pages lues.",
        "timer",
        {
          points: [
            "Une erreur provoquée vaut trois paragraphes lus.",
            "Noter le message exact, pas son interprétation.",
            "Chaque erreur résolue devient une question de révision.",
          ],
        },
      ),
      st(
        "La note technique utile",
        "Une note technique qui sert contient : le problème en une phrase, la solution qui marche (code ou commande), la raison pour laquelle ça marche, et l’erreur dans laquelle vous êtes tombé. Le reste — historique de la version, alternatives — se retrouve en ligne. Une note sans le problème qu’elle résout est illisible six mois plus tard.",
        "cards",
        {
          points: [
            "Problème, solution, raison, piège : quatre blocs.",
            "Le code se colle tel quel ; l’explication s’écrit avec vos mots.",
            "Le piège est la partie la plus utile — et la plus souvent oubliée.",
          ],
          practice: {
            title: "À vous",
            text: "Écrivez la note du dernier problème technique que vous avez résolu, avec son piège.",
            href: "/new",
            hrefLabel: "Écrire la note",
          },
        },
      ),
      st(
        "Quand la documentation est le mauvais outil",
        "Pour apprendre un langage, un cours guidé bat la documentation ; pour résoudre un problème précis, la documentation bat le cours. Confondre les deux usages produit deux échecs classiques : lire la référence pour apprendre, et chercher un tutoriel pour un cas limite.",
        "question",
        {
          check:
            "Votre prochaine note technique contient le problème et le piège, pas seulement la solution.",
        },
      ),
    ],
  },

  {
    id: "c-7",
    track: 2,
    index: 7,
    title: "Suivre un cours",
    subtitle: "Prendre moins, questionner plus",
    minutes: 5,
    outcome:
      "Prendre des notes utilisables en cours, et transformer une heure d’amphi en trois questions le lendemain.",
    phases: ["Pendant", "Après", "La semaine"],
    steps: [
      st(
        "Prendre des notes incomplètes",
        "En cours, notez les idées et les exemples, pas chaque phrase. Une prise de notes exhaustive empêche d’écouter : on devient transcripteur. Laissez une marge à droite — c’est là que les questions viendront, à froid, et c’est cette marge qui distingue une note vivante d’un verbatim.",
        "book",
        {
          points: [
            "Les idées et les exemples, pas les phrases.",
            "Une marge à droite, vide pendant le cours.",
            "Noter les hésitations de l’enseignant : elles signalent les points difficiles.",
          ],
          mistakes: [
            "Photographier le tableau au lieu de noter ce qu’on n’a pas compris.",
          ],
        },
      ),
      st(
        "J+1 : les questions",
        "Le lendemain, sans relire, écrivez trois questions par heure de cours. Puis vérifiez dans vos notes. Ce qui manque est exactement ce qu’il faut travailler — et ce n’est pas la même chose que ce qui manquait pendant le cours, parce que la mémoire a déjà trié. Ce décalage est l’information la plus précieuse de la semaine.",
        "question",
        {
          points: [
            "J+1, sans relire : c’est le rappel qui compte.",
            "Trois questions par heure de cours.",
            "Vérifier ensuite, et noter l’écart.",
          ],
          practice: {
            title: "À vous",
            text: "Sans relire votre dernier cours, écrivez trois questions puis vérifiez-les.",
            href: "/new",
            hrefLabel: "Écrire les questions",
          },
        },
      ),
      st(
        "Le tri de la semaine",
        "Une fois par semaine, triez : quelles notes ont produit des questions, lesquelles n’en ont produit aucune ? Une note sans question est soit inutile, soit mal prise. Dans les deux cas, elle ne mérite pas de rester telle quelle — supprimez-la ou reprenez-la, mais ne la laissez pas encombrer un vault.",
        "timer",
        {
          points: [
            "Une note sans question est à reprendre ou à supprimer.",
            "Le tri hebdomadaire prend quinze minutes.",
            "Un vault propre se relit ; un vault encombré s’évite.",
          ],
        },
      ),
      st(
        "Ce que le cours ne donne pas",
        "Un cours donne une structure et des priorités ; il ne donne pas la compréhension. Celle-ci vient des questions posées après, seul. C’est pourquoi deux étudiants avec les mêmes notes n’ont pas le même résultat : l’un a relu, l’autre s’est interrogé.",
        "review",
        {
          check:
            "Chaque note de cours récente porte au moins une question posée à froid.",
        },
      ),
    ],
  },

  {
    id: "c-8",
    track: 2,
    index: 8,
    title: "Lire plusieurs sources",
    subtitle: "Lecture syntopique, fiches et graphe",
    minutes: 5,
    outcome:
      "Comparer plusieurs auteurs sur vos questions, sans noyer les désaccords dans des résumés parallèles.",
    phases: ["La grille", "Les fiches", "Le graphe"],
    steps: [
      st(
        "Comparer sur des questions",
        "La lecture syntopique part de vos questions, pas des livres. Écrivez d’abord cinq questions auxquelles vous voulez une réponse ; pour chaque source, notez la réponse de l’auteur, ses désaccords et ses preuves. Le résultat n’est pas une série de résumés côte à côte, mais un tableau où les vides et les contradictions deviennent visibles.",
        "cards",
        {
          points: [
            "Les questions d’abord, les sources ensuite.",
            "Pour chaque source : réponse, preuve, désaccord.",
            "Un vide dans le tableau est une piste de recherche.",
          ],
          mistakes: [
            "Résumer chaque livre séparément : la comparaison, qui était le but, n’a jamais lieu.",
          ],
        },
      ),
      st(
        "Une fiche par idée, pas par source",
        "Si vous écrivez une fiche par source, vous n’aurez que des résumés. Une fiche par idée — avec la ou les sources en référence — permet de voir que deux auteurs disent la même chose autrement, ou se contredisent sur un point précis. C’est cette vue-là qui manque à la plupart des mémoires : les sources sont lues, mais jamais confrontées.",
        "book",
        {
          points: [
            "Une fiche = une idée, avec plusieurs sources possibles.",
            "La référence complète se met au moment de l’écriture.",
            "Deux fiches qui se contredisent sont une découverte, pas un problème.",
          ],
        },
      ),
      st(
        "Le graphe comme carte des désaccords",
        "Un graphe n’est utile que s’il montre les liens que vous avez décidés : « contredit », « prolonge », « même exemple, autre conclusion ». Un graphe qui affiche seulement des proximités de vocabulaire ne dit rien. Reliez à la main, justifiez chaque lien en une phrase, et refusez les liens que vous ne pouvez pas expliquer.",
        "map",
        {
          points: [
            "Un lien = une phrase de justification.",
            "Les liens de désaccord sont les plus informatifs.",
            "Un graphe illisible est un échec, pas une richesse.",
          ],
          practice: {
            title: "À vous",
            text: "Créez une fiche et reliez-la à une fiche existante par un lien que vous pouvez justifier.",
            href: "/spaces",
            hrefLabel: "Ouvrir mes fiches",
          },
        },
      ),
      st(
        "La sortie d’une lecture comparée",
        "Une lecture syntopique se termine par une position : ce que vous retenez, ce que vous écartez, et ce qui reste indécidable avec les sources dont vous disposez. Sans cette position, vous avez compilé ; avec elle, vous avez lu. C’est aussi la seule forme de lecture qui produise un texte original plutôt qu’un patchwork de citations.",
        "review",
        {
          check:
            "Vos fiches récentes portent plusieurs sources, et vous savez quelle position vous défendez.",
        },
      ),
    ],
  },

  {
    id: "c-9",
    track: 2,
    index: 9,
    title: "Retenir dans la durée",
    subtitle: "Peu souvent, et sans se mentir",
    minutes: 4,
    outcome:
      "Construire une habitude de révision tenable, et lire les chiffres de progression sans se raconter d’histoire.",
    phases: ["Le rythme", "La mesure", "L’arrêt"],
    steps: [
      st(
        "Peu, souvent",
        "Dix minutes quotidiennes battent deux heures le dimanche : les intervalles travaillent entre les séances, pas pendant. La contrainte réelle n’est pas le temps disponible, c’est la régularité — et une séance courte est la seule qui survive à une semaine chargée. Choisissez un moment fixe, pas une durée ambitieuse.",
        "timer",
        {
          points: [
            "Dix minutes par jour, à heure fixe.",
            "La régularité produit la rétention, la durée non.",
            "Une séance courte et faite vaut mieux qu’une séance parfaite et reportée.",
          ],
        },
      ),
      st(
        "Mesurer sans se mentir",
        "Le taux de réussite d’une séance n’est pas une note : il indique seulement si vos intervalles sont trop courts (tout réussit, rien ne travaille) ou trop longs (tout échoue, la séance décourage). Un taux parfaitement stable est souvent le signe d’un rythme trop facile. L’objectif n’est pas de réussir, c’est de retenir.",
        "review",
        {
          points: [
            "Trop de réussite = intervalles trop courts.",
            "Trop d’échec = intervalles trop longs, ou questions floues.",
            "La stabilité parfaite n’est pas un objectif.",
          ],
        },
      ),
      st(
        "L’abandon est le seul vrai risque",
        "Les parcours de révision échouent rarement par mauvaise méthode : ils échouent par abandon, souvent après une semaine de retard. La parade est mécanique — reprendre là où l’algorithme en est, sans tenter de rattraper les jours manqués. Le retard se résorbe tout seul en quelques séances ; la culpabilité, non.",
        "question",
        {
          points: [
            "Ne jamais rattraper : reprendre.",
            "Trois jours de retard se résorbent en trois séances.",
            "La culpabilité n’est pas un algorithme.",
          ],
          practice: {
            title: "À vous",
            text: "Lancez la séance du jour, même si vous avez du retard.",
            href: "/review",
            hrefLabel: "Réviser maintenant",
          },
        },
      ),
      st(
        "Le bilan mensuel",
        "Une fois par mois, regardez trois chiffres : cartes dues, retard, projets sans révision. Ce bilan ne sert qu’à une décision : quel projet reprendre cette semaine. Tout le reste — graphiques, séries, moyennes — flatte l’outil sans changer le travail.",
        "book",
        {
          points: [
            "Trois chiffres suffisent : cartes dues, retard, projets sans révision.",
            "Le bilan sert à choisir un projet, pas à se rassurer.",
            "Les séries et les moyennes ne décident de rien.",
          ],
          mistakes: [
            "Multiplier les indicateurs : plus le tableau de bord est riche, moins il déclenche de décision.",
          ],
          check:
            "Vous avez une heure fixe de révision, et un chiffre qui décide de votre semaine.",
        },
      ),
    ],
  },
];
