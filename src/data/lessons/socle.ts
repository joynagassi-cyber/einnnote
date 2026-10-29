import type { Lesson, LessonStep } from "@/types";

/**
 * Le socle — où vivent les notes.
 *
 * Cinq leçons, dans l’ordre où la question se pose : un projet (le chantier),
 * un vault (la catégorie), une note (la trace), une première note (le geste),
 * puis la relecture (retrouver). Chaque leçon finit par un critère vérifiable,
 * pas par un encouragement.
 */

type Extra = Omit<LessonStep, "title" | "body" | "illustration">;

const st = (
  title: string,
  body: string,
  illustration: LessonStep["illustration"],
  extra: Extra = {},
): LessonStep => ({ title, body, illustration, ...extra });

export const socleLessons: Lesson[] = [
  {
    id: "x-1",
    track: 3,
    index: 1,
    title: "Un projet, des vaults, des notes",
    subtitle: "La seule hiérarchie de l’app, et ce qu’elle interdit",
    minutes: 5,
    outcome:
      "Savoir, avant d’écrire, dans quel projet et dans quel vault une note va tomber — et pourquoi ce n’est pas la même question que « comment l’écrire ».",
    phases: ["Comprendre les trois niveaux", "Ranger une note réelle", "Vérifier le rangement"],
    steps: [
      st(
        "Un projet est un chantier, pas un dossier",
        "Un projet délimite un travail qui a un début, une fin et des sources : une thèse, un dossier client, une certification. Il ne range pas des fichiers, il décide de ce qui va ensemble. Le test est simple : si vous ne pouvez pas dire quand ce travail sera terminé, ce n’est pas encore un projet — c’est un thème. Un thème se découpe en projets le jour où il devient un travail daté.",
        "map",
        {
          points: [
            "Un projet a une fin prévisible : mémoire soutenu, dossier rendu, examen passé.",
            "Il décide de ce qui va ensemble — pas de ce qui se ressemble.",
            "Deux projets peuvent parler du même sujet sans se mélanger : ils ne servent pas la même échéance.",
          ],
          mistakes: [
            "Créer un projet par source (« Livre de Mankiw ») : une source est une référence, pas un chantier.",
            "Créer un projet « Divers » : tout y entre, donc rien n’y est retrouvable.",
          ],
          practice: {
            title: "À vous",
            text: "Ouvrez Espaces et regardez vos projets : pouvez-vous dire, pour chacun, quand il sera terminé ?",
            href: "/spaces",
            hrefLabel: "Ouvrir Espaces",
          },
        },
      ),
      st(
        "Un vault est une catégorie à l’intérieur du projet",
        "Dans un projet de physique, les vaults sont « Superposition » et « Intrication » : une catégorie par partie du sujet. Un vault n’est jamais un auteur, ni une méthode, ni un type de graphe — ce sont des façons de ranger la forme, pas le contenu. C’est pour cela qu’un vault appartient à un seul projet : la même catégorie dans deux travaux différents ne contient pas les mêmes notes.",
        "cards",
        {
          points: [
            "Un vault nomme une partie du sujet, dans les mots du sujet.",
            "Plusieurs notes par vault, une idée par note : c’est la note qui est fine, pas le vault.",
            "Un vault vide est un projet d’idée, pas un rangement : il se crée quand la deuxième note arrive.",
          ],
          mistakes: [
            "Un vault par méthode (« Cornell », « Carte mentale ») : la méthode décrit la note, elle ne la classe pas.",
            "Un vault fourre-tout (« À trier ») : il retarde la décision au lieu de la prendre.",
          ],
        },
      ),
      st(
        "Une note raconte, une fiche relie",
        "Une note garde la trace d’un moment de lecture : elle a un contexte, une méthode, une date. Une fiche isole une seule idée, reformulée avec vos mots, et porte un code qui permet de la citer (#1A, #1A1). Les fiches sortent des notes et alimentent la révision et le graphe ; les notes restent le journal de bord. Confondre les deux est la cause la plus fréquente d’un graphe illisible : on relie des pages, alors qu’on devrait relier des idées.",
        "book",
        {
          points: [
            "La note répond à « qu’ai-je lu, quand, avec quelle méthode ? ».",
            "La fiche répond à « quelle idée, à moi, et d’où vient-elle ? ».",
            "Toutes les notes ne donnent pas une fiche — et c’est normal.",
          ],
        },
      ),
      st(
        "Les trois questions qui précèdent l’écriture",
        "Avant d’ouvrir l’éditeur, trois réponses suffisent : à quel travail cette note sert-elle (le projet) ? De quelle partie du sujet parle-t-elle (le vault) ? Va-t-elle produire une idée à réviser (la fiche) ? Si la première réponse est floue, vous écrirez dans le vide ; si la deuxième l’est, vous créerez un vault en cours de route, et le vault créé après coup contient toujours un mélange. Trente secondes de décision économisent une heure de tri.",
        "question",
        {
          points: [
            "Projet d’abord, vault ensuite : l’ordre inverse produit des catégories orphelines.",
            "Une note peut rester sans fiche — mais jamais sans projet.",
            "Si vous hésitez entre deux vaults, la note contient probablement deux idées.",
          ],
          check:
            "Vous savez nommer le projet, le vault et la destination d’une note avant de l’écrire.",
        },
      ),
      st(
        "Ce que le modèle interdit, et pourquoi",
        "Trois niveaux, pas quatre : projet, vault, note. Toute hiérarchie qui peut grandir indéfiniment finit par être abandonnée — on ne cherche plus, on fouille. C’est aussi pourquoi le vault ne contient que des notes et des fiches, sans sous-dossier : la finesse vient du contenu, pas de l’arborescence. Une contrainte n’est pas une limite ; ici, c’est ce qui garde la recherche rapide.",
        "timer",
        {
          points: [
            "Trois niveaux : projet, vault, note — pas quatre.",
            "Un vault ne contient pas de sous-dossier : la finesse vient du contenu.",
            "Une contrainte fixe est ce qui garde la recherche rapide.",
          ],
          mistakes: [
            "Ajouter un niveau « sous-vault » : au quatrième niveau, personne ne range plus.",
            "Renommer un vault pour y faire entrer une note qui n’y a pas sa place : c’est le projet qui est mal découpé.",
          ],
          check:
            "Vous pouvez expliquer à quelqu’un pourquoi Einnote n’a pas de sous-dossiers.",
          practice: {
            title: "À vous",
            text: "Ouvrez la leçon suivante : elle crée un projet en deux gestes, puis y ouvre un vault.",
            href: "/learn/x-2",
            hrefLabel: "Créer un projet",
          },
        },
      ),
    ],
  },

  {
    id: "x-2",
    track: 3,
    index: 2,
    title: "Créer un projet",
    subtitle: "Nommer, c’est déjà décider",
    minutes: 4,
    outcome:
      "Créer un projet dont le nom suffit à trancher, plus tard, entre deux notes qui hésitent à y entrer.",
    phases: ["Le nom", "Les fausses frontières", "Le geste"],
    steps: [
      st(
        "Un nom précis vaut un rangement",
        "« Mémoire M2 » range : on sait ce qui entre et ce qui reste dehors. « Travail » n’existe pas, parce que tout y entre. Un bon nom contient le sujet et l’échéance — « Droit des contrats · partiel janvier ». Il n’a pas besoin d’être joli : il doit répondre à la question « est-ce que cette note appartient ici ? » sans que vous ayez à réfléchir.",
        "book",
        {
          points: [
            "Sujet + échéance : deux informations qui tranchent.",
            "Un nom court vaut mieux qu’un nom complet : il sera affiché partout.",
            "Si deux noms conviennent au même contenu, c’est le découpage qui est faux.",
          ],
          mistakes: [
            "Nommer par émotion (« Important », « À lire ») : ce sont des états, pas des chantiers.",
            "Nommer par format (« PDF », « Cours ») : le format décrit la source, pas le travail.",
          ],
        },
      ),
      st(
        "Ce qui n’est pas un projet",
        "Une source, un cours, un semestre, une méthode ne sont pas des projets. Un cours est une partie du sujet — donc un vault. Un semestre est une période, pas un travail : ce sont les travaux du semestre qui sont des projets. Une méthode décrit la forme de la note. Cette distinction paraît scolaire ; elle évite le cas le plus courant : un projet « Semestre 5 » qui contient six matières, donc aucune catégorie lisible.",
        "map",
        {
          points: [
            "Matière, chapitre, auteur, méthode : ce sont des vaults ou des fiches, jamais des projets.",
            "Un projet peut contenir plusieurs matières si elles servent le même travail.",
            "Un projet qui n’a pas de fin n’a pas besoin d’exister : il sera un thème, plus tard.",
          ],
        },
      ),
      st(
        "Ce que le projet ne demande pas",
        "Aucun modèle à choisir, aucun style de graphe à régler, aucun dossier à créer à côté : le projet est une ligne dans l’app, avec un nom. Cette sobriété est volontaire — chaque question posée à la création est une raison d’abandonner avant la première note. Les réglages viendront plus tard, quand il y aura quelque chose à régler.",
        "cards",
        {
          points: [
            "Un champ : le nom. C’est tout.",
            "Le projet apparaît aussitôt dans Espaces et dans les filtres de la bibliothèque.",
            "Rien à déplacer sur le disque : les notes vivent dans le projet, pas dans un fichier.",
          ],
        },
      ),
      st(
        "Deux gestes, et un droit de rature",
        "Espaces, puis « Nouveau projet » : un nom, validez. Le projet existe. S’il est mal nommé, renommez-le — un nom se change sans que les notes bougent. S’il est trop large, créez-en deux et déplacez les notes ; s’il est trop étroit, fusionnez mentalement en changeant le nom. Un découpage se corrige ; un mauvais découpage non corrigé coûte des mois.",
        "timer",
        {
          points: [
            "Créer : Espaces → Nouveau projet → un nom.",
            "Renommer ne déplace rien.",
            "Scinder vaut mieux que tasser : deux projets clairs battent un projet fourre-tout.",
          ],
          check:
            "Vous avez créé un projet dont le nom, à lui seul, dit si une note y entre ou non.",
          practice: {
            title: "À vous",
            text: "Créez le projet du travail en cours, avec sujet et échéance dans le nom.",
            href: "/spaces",
            hrefLabel: "Créer un projet",
          },
        },
      ),
    ],
  },

  {
    id: "x-3",
    track: 3,
    index: 3,
    title: "Ouvrir un vault dans ce projet",
    subtitle: "Une catégorie, pas une méthode",
    minutes: 4,
    outcome:
      "Décider du nombre de vaults d’un projet, et refuser les catégories qui ne servent qu’à différer une décision.",
    phases: ["Le grain", "Le test de cohérence", "Le bon moment"],
    steps: [
      st(
        "Le vault nomme une partie du sujet",
        "Un vault s’appelle comme une partie du sujet, dans ses mots : « Superposition quantique », « Responsabilité civile », « Traitement du signal ». Jamais comme un auteur, une date, un format. Cette règle n’est pas une coquetterie : le nom du vault est ce que vous lirez dans six mois pour retrouver une note. « Chap. 3 » ne vous dira plus rien ; « Effets du contrat » si.",
        "map",
        {
          points: [
            "Nommer avec les mots du sujet, pas avec ceux du support.",
            "Un vault = une partie qui pourrait faire l’objet d’une question d’examen.",
            "Trois à sept vaults par projet : au-delà, le projet est trop large.",
          ],
          mistakes: [
            "« Cours du 12 mars » : une date ne dit pas de quoi ça parle.",
            "« À classer » : un vault sans contenu est une décision repoussée.",
          ],
        },
      ),
      st(
        "Deux sujets qui ne se parlent pas",
        "Le test de cohérence est brutal : prenez deux notes du même vault et demandez-vous si l’une peut éclairer l’autre. Si la réponse est toujours non, ce ne sont pas deux notes du même vault. Si elle est toujours oui, le vault est probablement trop fin — une seule note devrait suffire. L’équilibre est là : un vault où les notes se citent parfois.",
        "cards",
        {
          points: [
            "Un vault utile contient des notes qui se recoupent parfois.",
            "Des notes qui ne se parlent jamais : deux vaults.",
            "Une note seule dans un vault : le vault est peut-être une note.",
          ],
        },
      ),
      st(
        "Un projet sans vault reste possible",
        "Vous pouvez écrire dix notes avant d’ouvrir un vault : elles vivent à plat dans le projet. C’est même la bonne façon de faire quand le sujet est encore flou — on découvre le découpage en écrivant, pas en le devinant. Le signal qu’il faut créer un vault : la troisième note qui parle de la même chose, ou la première fois que vous cherchez une note et ne la trouvez pas.",
        "book",
        {
          points: [
            "Pas de vault provisoire : une note attend dans le projet.",
            "Le découpage se découvre après quelques notes, pas avant.",
            "Un vault créé trop tôt se remplit de tout.",
          ],
        },
      ),
      st(
        "Le geste, et ce qu’il demande",
        "Espaces → votre projet → « Nouveau vault » : un nom, une phrase qui dit ce qu’il contient. La phrase n’est pas décorative : elle vous oblige à formuler la frontière, et c’est cette phrase qui tranchera plus tard. Un vault sans phrase accepte tout ; un vault avec phrase refusera la note qui n’y a pas sa place — c’est exactement ce qu’on lui demande.",
        "timer",
        {
          points: [
            "Deux champs : le nom et la frontière, en une phrase.",
            "La phrase se lit comme un critère : « ici, les notes sur… ».",
            "Le vault hérite du projet : il ne peut pas changer de projet.",
          ],
          check:
            "Votre vault a une frontière écrite, et vous savez quelle note il refuserait.",
          practice: {
            title: "À vous",
            text: "Ouvrez un vault dans le projet créé à la leçon précédente, avec sa phrase de frontière.",
            href: "/spaces",
            hrefLabel: "Ouvrir un vault",
          },
        },
      ),
    ],
  },

  {
    id: "x-4",
    track: 3,
    index: 4,
    title: "Écrire la première note",
    subtitle: "La méthode dépend du moment, pas du goût",
    minutes: 5,
    outcome:
      "Choisir une méthode en dix secondes selon l’état de vos idées, et transformer une note en questions sans la réécrire.",
    phases: ["Choisir la méthode", "Écrire", "Poser les questions"],
    steps: [
      st(
        "Trois moments, trois méthodes",
        "Devant un plan à construire, l’outline : des blocs, des retraits, une hiérarchie. Devant un texte à retenir, Cornell : la note au centre, les questions en marge. Devant un sujet qui part dans tous les sens, la carte mentale : des nœuds et des liens, pas des phrases. Choisir n’est pas affaire de style : c’est un diagnostic sur l’état de vos idées — en vrac, en plan, ou à mémoriser.",
        "book",
        {
          points: [
            "Idées en vrac → carte mentale.",
            "Idées à organiser → outline.",
            "Idées à retenir → Cornell, avec ses questions.",
          ],
          mistakes: [
            "Commencer par Cornell alors que le sujet n’est pas compris : vous poserez des questions sur du vide.",
            "Faire une carte mentale pour un plan linéaire : la carte ne hiérarchise pas une démonstration.",
          ],
        },
      ),
      st(
        "La première ligne n’est pas un titre",
        "La première ligne d’une note dit ce que la source répond — pas son nom. « Pourquoi le salaire réel baisse quand l’inflation accélère » ouvre un travail ; « Chapitre 4 » le ferme. Un titre qui ne contient pas de verbe oblige à relire la note pour savoir de quoi elle parle, ce qui est exactement ce qu’on voulait éviter en la prenant.",
        "question",
        {
          points: [
            "Un titre de note est une question ou une réponse, jamais une étiquette.",
            "Le titre sert à retrouver ; il doit tenir dans la recherche.",
            "Si le titre est difficile à écrire, la note n’a pas encore d’idée.",
          ],
        },
      ),
      st(
        "Écrire au fil, structurer après",
        "Une note se prend en deux passes : la capture, rapide, dans l’ordre où ça sort ; puis la structure, où l’on transforme, déplace et hiérarchise. Ne faites pas les deux en même temps : le souci de la forme en pleine lecture fait perdre le fil. C’est pour cela que la barre de mise en forme permet de transformer un paragraphe en titre, en citation ou en case sans le réécrire — la structure s’ajoute après, sur un texte qui existe déjà.",
        "map",
        {
          points: [
            "Première passe : capturer, même mal écrit.",
            "Deuxième passe : transformer les blocs, déplacer, hiérarchiser.",
            "La mise en forme ne doit jamais interrompre la lecture.",
          ],
          practice: {
            title: "À vous",
            text: "Écrivez dix lignes en vrac, puis transformez-en deux en titres et une en citation.",
            href: "/new",
            hrefLabel: "Écrire une note",
          },
        },
      ),
      st(
        "Ce qui transforme une note en mémoire",
        "Une note lue deux fois ne s’ancre pas. Ce qui l’ancre, c’est une question posée sur un passage précis : sélectionnez la phrase qui contient la réponse, écrivez la question qui la ferait revenir. Chaque question devient une carte de révision, et c’est la question — pas la note — qui sera relue dans trois semaines. Une note sans question reste un document ; avec trois questions, c’est déjà un programme.",
        "review",
        {
          points: [
            "Une question par passage qui mérite d’être retenu.",
            "La question se pose sur la phrase-réponse, pas sur le paragraphe entier.",
            "Trois à cinq questions par note : au-delà, vous ne réviserez pas.",
          ],
          mistakes: [
            "Poser une question dont la réponse est « oui » ou « non ».",
            "Recopier la phrase comme question : elle donne la réponse avec l’énoncé.",
          ],
        },
      ),
      st(
        "Ce que la note doit contenir avant de fermer",
        "Une note terminée a un titre-question, deux ou trois blocs structurés, la source, et ses questions. La source compte : sans elle, dans six mois, vous aurez une affirmation sans autorité. Rien d’autre n’est obligatoire — pas de résumé final, pas de reformulation générale. Une note courte avec trois questions vaut mieux qu’une note longue sans aucune.",
        "timer",
        {
          points: [
            "Un titre qui dit ce qu’elle répond, pas un thème.",
            "Deux ou trois blocs structurés, pas un mur de texte.",
            "La source, toujours : sinon l’affirmation flotte.",
            "Une question au moins, écrite pour être reposée.",
          ],
          check:
            "Votre note a un titre qui dit ce qu’elle répond, une source, et au moins une question.",
        },
      ),
    ],
  },

  {
    id: "x-5",
    track: 3,
    index: 5,
    title: "Retrouver ce qu’on a écrit",
    subtitle: "Quatre portes, un seul contenu",
    minutes: 4,
    outcome:
      "Choisir la bonne porte selon la question posée — et savoir reconnaître un rangement qui ne fonctionne pas.",
    phases: ["Les portes", "Chercher", "Réviser"],
    steps: [
      st(
        "Quatre portes, aucune n’est un doublon",
        "Notes : toutes les notes de tous les projets, pour chercher un contenu. Espaces : la carte du rangement — quel projet, quels vaults, quelles fiches. Réviser : ce qui est dû aujourd’hui, par projet, par vault ou par note. Studio des cartes : l’apparence des fiches, jamais leur contenu. Quatre questions différentes, donc quatre pages : « où est cette phrase ? », « où suis-je rangé ? », « que dois-je réviser ? », « à quoi ça ressemble ? ».",
        "review",
        {
          points: [
            "Chercher un contenu → Notes.",
            "Comprendre le rangement → Espaces.",
            "Savoir quoi faire maintenant → Réviser.",
          ],
        },
      ),
      st(
        "La recherche passe avant le rangement",
        "Si vous retrouvez vos notes en tapant trois mots, votre rangement est bon. Si vous devez ouvrir trois vaults pour trouver une phrase, le rangement est en cause, pas la recherche. Le test est rapide : prenez une idée notée la semaine dernière et cherchez-la pendant dix secondes. Échec : le projet est trop large, ou le vault n’existe pas encore.",
        "timer",
        {
          points: [
            "Trois mots suffisent pour retrouver une note récente.",
            "Dix secondes d’échec = un problème de découpage.",
            "Un rangement sain se vérifie en cherchant, pas en contemplant l’arbre.",
          ],
          mistakes: [
            "Créer une catégorie de plus à chaque recherche ratée : le problème est la frontière, pas le nombre.",
            "Compter sur la mémoire du classement : elle ne survit pas à six mois.",
          ],
        },
      ),
      st(
        "Réviser n’est pas relire",
        "Une fiche ne devient pas une carte de révision par magie : c’est la question posée sur un passage qui la crée. Relire une note donne l’impression de savoir ; répondre à une question, non. La séance de révision commence donc toujours par un effort de rappel, jamais par une relecture — sinon, vous entraînez la reconnaissance, pas la mémoire.",
        "question",
        {
          points: [
            "Une fiche sans question n’est pas encore révisable.",
            "Répondre d’abord, retourner ensuite.",
            "Une question ratée est une information, pas une faute.",
          ],
        },
      ),
      st(
        "Le bilan de la semaine",
        "Une fois par semaine, ouvrez Progression : ce qui est dû, ce qui est en retard, ce qui n’a jamais été vu. Trois chiffres suffisent à décider de la semaine suivante. Ce bilan est court parce qu’il doit être fait : un tableau de bord qu’on n’ouvre pas ne sert qu’à décorer.",
        "book",
        {
          points: [
            "Trois chiffres : dû, en retard, jamais vu.",
            "Le retard se traite par petites séances, pas par une session héroïque.",
            "Un projet sans révision depuis trois semaines se voit tout de suite.",
          ],
          check:
            "Vous savez où chercher une note, et quel chiffre décide de votre semaine.",
          practice: {
            title: "À vous",
            text: "Ouvrez Réviser et lancez la séance du jour sur un seul projet.",
            href: "/review",
            hrefLabel: "Ouvrir Réviser",
          },
        },
      ),
    ],
  },
];
