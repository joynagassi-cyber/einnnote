# Engram — prototype « papier calme »

Application de notes qui oblige à l’**apprentissage actif**, construite d’après le
cahier des charges **v3.0** et les maquettes mobiles « papier calme ».
Éditeur **TipTap** avec barre de mise en forme, menu « / » et surligneurs ;
thème à accent personnalisable dont les contrastes sont mesurés.

Quatre méthodes — **Outline, Cornell, carte mentale, Zettelkasten** — puis des
cartes de rappel revues à intervalles espacés. Aucun compte, aucun serveur :
tout reste dans le stockage local de l’appareil.

**Synchronisation optionnelle** (`/settings/cloud`, 10 $/mois) : un backend
Supabase que l’on peut inspecter, avec un paywall appliqué par la base et non
par l’interface. Sans abonnement, l’application reste exactement la même.
Architecture, coûts et mise en service : [`docs/CLOUD.md`](docs/CLOUD.md).

## Lancer

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # build de production
npm test         # tests d’écran (Vitest + Testing Library)
npm run lint
```

## Écrans

| Adresse | Écran |
| --- | --- |
| `/` | Bibliothèque : recherche, révisions du jour, cartes-rectangles en grille 2 colonnes et filtre à facettes |
| `/new` | Choisir une méthode (4 méthodes + « Je lis simplement ») |
| `/note/:id` | Éditeur TipTap : titre, barre de mise en forme, menu « / », gouttière Q, panneau des questions |
| `/review` | Révision : question, passage écrit, 4 évaluations avec intervalle prévu |
| `/mindmap/:id` | Carte mentale : nœuds libres, « + » pour créer une liane, formes, courbes/angles |
| `/vault/:id` | Zettelkasten : pile de cartes, glissement, références manuelles |
| `/vault/:id/new` | Nouvelle carte : formulaire en forme de carte, source, image, lien, référence |
| `/vault/:id/graph` | Graphe du coffre : carte ouverte et voisines, extensible à 2 niveaux |
| `/learn` · `/learn/:id` | Apprendre : 6 tutoriels + 9 leçons du cours « Lire pour retenir » |
| `/settings` | Réglages, dont **Cloud**, **Apparence**, **Personnalisation**, **Données**, **Progrès**, **Corbeille**, **À propos** |
| `/settings/cards` | Studio des cartes : éventail 3D, relief, carte image — appliqués à vos fiches |
| `/settings/cloud` | Cloud : connexion par code, abonnement, synchro manuelle ou automatique, appareils, effacement distant |
| `/settings/personalization` | Personnalisation avancée : densité, rayons, bordures, relief, papier, interligne, largeur, canevas |
| `/preview` | Aperçu production : **mobile et bureau côte à côte**, deux iframes réelles |

## Deux mises en page, une seule application

- **Mobile (< 1024 px)** : coque téléphone pleine largeur (max 440 px), barre
  d’onglets en bas (Notes · Réviser · **+** · Apprendre · Réglages).
- **Bureau (≥ 1024 px)** : rail de navigation fixe de 264 px (marque, thème
  clair/sombre, « Nouvelle note », Notes / Réviser / Apprendre, réglages,
  carte de révision du jour) et colonne « papier » centrée qui s’élargit —
  720 px pour lire et écrire, 1060 px pour la bibliothèque, les réglages et
  l’apprentissage. La barre d’onglets disparaît, les barres d’action et les
  feuilles du bas se recentrent sur la colonne.

Le basculement se fait par media query CSS **et** par le hook
`useIsDesktop()` (`src/lib/useMediaQuery.ts`) : le rail n’est monté qu’en
bureau, donc aucun doublon de navigation pour les lecteurs d’écran.

## Bibliothèque : deux cartes côte à côte, un filtre qui sait tout

La bibliothèque affiche **deux cartes par ligne sur téléphone** (trois à partir
de 1024 px). Chaque carte-rectangle porte : l’icône **Duotone** de la méthode,
la méthode employée, le titre (2 lignes), un **aperçu réel du fichier**
(3 lignes de blocs, sinon les titres des nœuds ou des cartes du coffre),
la collection, et l’état vrai de la note (`3 à revoir · 3 questions · il y a 2 h`).

Un seul bouton **Filtres** ouvre un panneau qui croise **sept familles de
critères**, chacune comptée à facettes (le nombre affiché tient compte des
autres critères déjà posés) :

| Famille | Valeurs | Sélection |
| --- | --- | --- |
| Méthode | Outline, Cornell, Carte mentale, Zettelkasten | plusieurs |
| Collection | celles qui existent dans les notes | plusieurs |
| État de la note | Brouillon, Capturée, Questionnée, Terminée | plusieurs |
| Révision | Toutes, À revoir, En retard, Jamais révisée, À jour, Sans carte | une |
| Dernière modification | Toutes, Aujourd’hui, 7 jours, 30 jours, Plus ancienne | une |
| Chercher dans | Partout, Titres, Contenu, Questions | une |
| Trier par | Récents, Titre A→Z, Cartes à revoir, Prochaine échéance, Questions | une |

Détails qui font la différence :

- les critères d’un même groupe se combinent en **OU**, les groupes entre eux
  en **ET** ;
- une option sans résultat est **désactivée** : on ne peut pas se retrouver
  dans une impasse ;
- les filtres actifs restent visibles sous forme de **puces retirables**
  (« Cornell × », « À revoir × ») avec « Tout effacer » ;
- **Révision** distingue vraiment *à revoir aujourd’hui* (dont le retard),
  *en retard*, *jamais révisée* (cartes existantes, `reps = 0`), *à jour* et
  *sans carte* — quatre états différents, pas un seul « dû » ;
- la recherche suit la portée choisie et indexe aussi les **nœuds d’une carte
  mentale** et les **cartes d’un coffre**, pas seulement les blocs ;
- les filtres **survivent à la navigation** (store `useLibraryFilters`) : on
  revient de la note sur la même vue, sans les reconstruire.

Toute la logique est pure et testée à part dans `src/lib/libraryFilters.ts`.

## Éditeur (TipTap 3)

- **Barre persistante** groupée comme une barre d’Obsidian : annuler/rétablir ·
  H1/H2, puces, numéros, citation · gras, italique, souligné, barré, code,
  **surligneur 5 couleurs**, lien · retrait ±. État actif visible, compteur de
  mots.
- **Menu « / »** dans un paragraphe vide : titre 1/2, liste à puces, liste
  numérotée, citation, retour au texte normal.
- **Barre contextuelle** sur sélection : « Créer une question » (le geste
  central du produit), surligner, gras, copier.
- **Raccourcis** : `Tab` / `Shift-Tab` (retrait), `Ctrl/⌘+Maj+8` (puces),
  `Ctrl/⌘+Maj+7` (numéros), `Ctrl/⌘+Maj+9` (citation), plus ceux de ProseMirror
  (`⌘B`, `⌘I`, `⌘Z`, `⌘⇧Z`, `⌘⌥1-2`).
- **Gouttière** : les pastilles `Q1`, `Q2` sont des décorations ProseMirror :
  elles ne polluent ni le copier-coller ni l’export.
- **Continuité garantie** : un bloc = un nœud de premier niveau, avec son
  `blockId`. Rééditer une note ne casse ni les questions ni le lien vers le
  passage. Le pont est testé (`src/lib/editor/blocks.test.ts`).
- **Sécurité** : le HTML stocké est assaini (scripts, iframes, `on*`,
  `javascript:`) avant d’entrer dans l’éditeur.

## Thème et accents

Huit presets (`teal`, **`indigo` « Indigo Gemini »**, `blue`, `violet`, `green`,
`terracotta`, `plum`, `graphite`) **et une couleur libre**.
L’indigo Gemini : `#4257D6` (5,23:1 sur le papier) ; un `#4C6BFA` plus proche
du cyan d’origine a été écarté à 3,89:1. Pour une couleur libre, `src/lib/accent.ts`
dérive `--accent`, `--accent-soft`, `--accent-ink` et `--on-accent`, corrige la
luminosité jusqu’à respecter WCAG AA sur le fond du thème, et l’écran Apparence
affiche le ratio mesuré (« 5,2:1 · AA ») ainsi que la mention « couleur ajustée
pour rester lisible ». L’architecture complète est dans
[`docs/DESIGN.md`](docs/DESIGN.md).

## Ce qui fonctionne réellement

- **Cornell** : sélectionner un passage → « Ajouter une question » crée une
  carte. Chaque liaison question → passage garde son propre texte ; la gouttière
  affiche Q1, Q2… et le panneau latéral mène au bloc.
- **Révision** : séance sur les cartes dues, réponse révélée après coup, quatre
  évaluations avec intervalle calculé, bilan de séance, historique local.
- **Carte mentale** : React Flow, nœuds déplaçables, ajout par « + », formes
  (cercle, rectangle, carré, losange), arêtes courbes ou en angles, modèles.
- **Zettelkasten** : pile feuilletée au doigt, formulaire par carte, références
  manuelles, graphe limité aux voisines.
- **Réglages** : thème clair/sombre/auto, 8 accents, 4 fonds de canevas, police
  et taille, contraste élevé, animations et transparence réduites — appliqués
  immédiatement et mémorisés.
- **Personnalisation avancée** : densité, rayons, bordures, relief et teinte du
  papier changent des attributs `data-*` qui pilotent de vrais blocs CSS ;
  interligne, largeur de lecture et force du canevas sont des variables
  continues. Une barre dans l’éditeur écrit ces mêmes valeurs.
- **Projets (multi-vault)** : un projet contient notes et coffres ; la
  bibliothèque, les créations et les exports suivent le projet ouvert, la vue
  « Tous les projets » reste disponible pour la révision. Migration automatique
  des données existantes vers un projet par défaut.
- **Garde-fou de stockage** : compteur d’occupation (`localStorage`, quota
  5 Mo), alerte à 80 %, état critique à 90 %, rappel de sauvegarde à 7 jours,
  et `ErrorBoundary` par route avec « Réessayer ».
- **Export Markdown du vault entier** : un fichier `.md` autonome (en-tête
  YAML, une section par note, questions, cartes, carte mentale) — lisible dans
  Obsidian, Logseq ou GitHub ; périmètre au choix (bibliothèque, projet, coffre).
- **Données** : export chiffré (AES-GCM 256, PBKDF2-SHA256, 210 000 tours),
  export JSON lisible, restauration avec vérification du mot de passe et
  rapport ; corbeille avec restauration.
- **Leçons** : 15 leçons courtes, progression enregistrée, geste pratique à
  chaque étape.

## Design system

Jetons en variables CSS (`src/index.css`), aucune couleur en dur :

```
--bg #F6F1E7   --surface #FFFDF8   --surface-2 #EFE8D8   --line #E4DCCB
--ink #2B2A27  --muted #6B6659     --accent #0F766E      --accent-soft #D9EEEA
```

Sombre : `#1E1C19 / #27241F / #302C26 / #3A362F / #F1ECE1 / #A8A193 / #5EC8BD`.
Typographie : **Literata** pour les notes et les titres, **Inter** pour
l’interface, interligne de note fixe à 28 px. Icônes **Phosphor**, zones
tactiles ≥ 44 px, focus visible, respect de `prefers-reduced-motion` et
`prefers-contrast`.

## Limites du prototype

Ce dépôt est une **maquette interactive fidèle**, pas encore l’application
native :

- persistance dans `localStorage` et non SQLite (Capacitor / Electron à venir) ;
- éditeur TipTap, mais **puces et numéros portés par des attributs de bloc** :
  l’aller-retour vers un traitement de texte perd la sémantique de liste
  (choix expliqué dans `docs/ROADMAP.md`) ; pas encore d’images, de tableaux ni
  de recherche interne ;
- ordonnanceur de répétition espacée maison, à remplacer par `ts-fsrs` ;
- pas de code PIN, de biométrie ni de verrouillage automatique ;
- bureau sans panneau redimensionnable ni raccourcis clavier (le rail, lui,
  est en place) ;
- « Engram » est un nom de travail : à remplacer avant publication.

## Tests

- `src/test/smoke.test.tsx` (29 tests) monte l’application réelle (routeur,
  stores, React Flow) : écrans, navigation, rail de bureau, thème, révision,
  renommage, graphe à deux niveaux, édition d’un nœud, filtre par collection,
  filtre méthode + révision, recherche sans résultat, frappe dans TipTap,
  puce depuis la barre d’outils, menu « / », accent libre, filtre par projet,
  personnalisation (densité, papier) appliquée au document, page `/preview`.
- `src/lib/libraryFilters.test.ts` (12 tests) couvre la logique de filtre sur
  des dates fixes : statistiques par note, cinq critères de révision, portée de
  recherche, périodes, corbeille, tris, comptes à facettes et puces actives.

- `src/lib/accent.test.ts` (11 tests) : parsing, WCAG, dérivation pour les
  presets et pour dix couleurs extrêmes, correction de la luminosité.
- `src/lib/accents.test.ts` (8 tests) : les presets TypeScript et les blocs
  `data-accent` de `index.css` doivent coïncider (valeurs **et** contraste AA
  clair/sombre). Ce test a fait assombrir `green` et `terracotta`.
- `src/lib/storage.test.ts` (7 tests) : poids UTF-8, formatage, seuils
  80 %/90 %, mesure par clé, absence de stockage.
- `src/lib/markdown.test.ts` (10 tests) : en-tête YAML, blocs, questions, carte
  mentale, coffre, périmètres projet/coffre, corbeille exclue.
- `src/stores/projects.test.ts` (14 tests) : création dans le bon projet,
  rattachement des coffres, renommage, refus de supprimer un projet non vide,
  dernier projet protégé, migration v1 → v2, réglages complétés par défaut.
- `src/components/ErrorBoundary.test.tsx` (4 tests) : écran de secours,
  trace dans `sessionStorage`, bouton « Réessayer » qui remonte au parent,
  retour à la bibliothèque.
- `src/lib/editor/blocks.test.ts` (10 tests) : aller-retour blocs / TipTap
  (identifiants, titres, puces, retrait, citation, marques, surlignage, lien),
  assainissement du HTML, exports Markdown et texte.

```bash
npx vitest run                        # 110 tests, 9 fichiers
npx tsc -p tsconfig.app.json --noEmit # le tsconfig racine ne vérifie rien
npx vite build
```

Ce qui reste à faire, avec utilité et effort : [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Limites d’architecture

- TipTap ajoute ~400 kB : le bundle passe à 1,21 Mo (361 kB gzip). Une découpe
  par route est la prochaine optimisation, volontairement reportée pour ne pas
  fragiliser les tests d’écran.
- La mesure de stockage est celle de `localStorage` (≈ 5 Mo). Un jour SQLite
  rendra cette jauge obsolète : elle est isolée dans `src/lib/storage.ts` pour
  que ce remplacement ne touche qu’un fichier.
