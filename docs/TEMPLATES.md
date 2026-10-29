# Modèles — 18 charpentes de notes et de fiches + 14 cartes mentales + 6 vaults

> Ce document explique **d’où vient chaque modèle**, comment il est calculé, ce
> qui est vérifié par test, et ce qui reste à faire. Il ne recopie pas le code :
> il dit pourquoi il est écrit ainsi.

> **Styles ≠ modèles.** Un modèle dit *comment penser* (Ishikawa, Toulmin,
> SQ3R) ; un style de graphe dit *comment dessiner* (arêtes flottantes,
> angles, rubans, colonnes). Les deux se combinent : voir `docs/GRAPH.md`.

---

## 1. Le problème réel

Un étudiant qui ouvre l’app ne manque pas de fonctionnalités : il manque de
**savoir-faire**. « Cornell » ne veut rien dire tant qu’on n’a pas vu une page
Cornell remplie ; « Zettelkasten » ressemble à une religion tant qu’on n’a pas
tenu une fiche permanente.

Un catalogue de modèles n’est donc pas une galerie décorative, c’est un
**professeur silencieux**. Trois conséquences de conception :

| Décision | Raison |
|---|---|
| Les modèles proposent des **phrases à réécrire** (« Date : », « Piège d’examen : ») | Une page à moitié remplie enseigne la structure ; une page vide non |
| Chaque modèle affiche **son cas d’usage et son public** | On choisit par situation (« article scientifique », « vidéo de 40 min »), pas par esthétique |
| Un modèle **remplit**, il ne remplace pas après coup | Éviter d’écraser le travail déjà écrit (sauf carte mentale, avec confirmation) |
| Aucun bloc vide | Un bloc vide est une dette : il sera supprimé ou laissé mort |

**Remix** = tout est du texte normal après création : on renomme, on supprime,
on ajoute. Aucun modèle n’est « verrouillé ».

---

## 2. Sources des méthodes (ce n’est pas de l’invention)

### Outline — 6 modèles

| Modèle | Méthode d’origine | Public | Pourquoi ce découpage |
|---|---|---|---|
| Cours magistral | prise de notes en amphi | Étudiant | Plan annoncé → définitions → idées → exemples → pièges : l’ordre d’un cours réel |
| Lecture d’article (SQ3R) | **SQ3R**, F. P. Robinson (1946) | Étudiant | Survoller, questionner, lire, réciter, réviser — 5 étapes, 5 sections |
| Explication Feynman | **technique Feynman** | Autodidacte | Expliquer sans jargon révèle les trous ; la section « Les trous » est le cœur |
| Compte-rendu de réunion | **5W1H** (journalisme) | Professionnel | Une réunion ne vaut que par ses décisions et ses responsables |
| Plan de dissertation | thèse–antithèse–synthèse | Étudiant | Problématique d’abord, preuves ensuite, ouverture finale |
| Protocole scientifique | **IMRaD** | Scientifique | Question, hypothèse, méthode, attendu, limites — reproductible |

### Cornell — 6 modèles

Le format Cornell (Walter Pauk, 1949) est **une géométrie** : indices à gauche,
notes à droite, résumé en bas. Dans un éditeur linéaire, on le traduit par trois
zones nommées, toujours dans le même ordre — le réflexe se construit.

| Modèle | Cas d’usage | Public |
|---|---|---|
| **Enseignement biblique** | prédication / étude biblique | Étudiant, tout public |
| Cours magistral | le Cornell d’origine | Étudiant |
| Lecture d’article scientifique | lecture critique | Scientifique |
| Révision d’examen | questions probables + erreurs passées | Étudiant |
| Cours en ligne / vidéo | MOOC, YouTube, conférence | Autodidacte |
| Protocole de laboratoire | travaux pratiques | Scientifique |

**Le modèle d’enseignement biblique** (demandé explicitement) suit la méthode
d’étude inductive **observation → interprétation → application** :

1. en-tête `Date · Orateur · Thème` ;
2. **verset principal** recopié exactement (bloc citation) ;
3. contexte du passage ;
4. **détails de l’enseignement** (points, illustrations, références croisées) ;
5. ce que le texte dit / ce qu’il ne dit pas — la frontière entre le texte et le
   commentaire de l’orateur ;
6. application personnelle, résumé, à approfondir.

Ce dernier point est le plus important et le plus absent des cahiers réels :
sans lui, on note les opinions de l’orateur comme si c’était le texte.

### Zettelkasten — 6 fiches

Six charpentes de **note atomique** : fiche de lecture, note permanente,
question ouverte, définition de concept, note de méthode, note d’argumentation.
Chacune impose une contrainte utile (une idée, une source, une limite), et se
charge en un geste depuis le formulaire de carte.

### Carte mentale — 14 modèles

Chaque modèle vient d’une discipline qui a réellement formalisé ce type de
schéma :

| Modèle | Discipline d’origine | Disposition |
|---|---|---|
| Carte de lecture active *(défaut)* | lecture savante (SQ3R) | radiale |
| Cours en direct | prise de notes | arbre horizontal |
| Système et composants | analyse fonctionnelle / physiologie | arbre horizontal |
| Plan de mémoire | IMRaD | arbre vertical |
| Arbre de décision | analyse multicritère | arbre horizontal (losanges) |
| SWOT / FFOM | stratégie d’entreprise | matrice 2×2 |
| Ishikawa (6M) | qualité industrielle (Ishikawa) | arête de poisson |
| Frise chronologique | histoire | frise |
| Argumentation (Toulmin) | logique juridique et philosophique | arbre horizontal |
| Progression de Bloom | ingénierie pédagogique | escalier |
| Révision par questions | sciences cognitives (*testing effect*) | arbre vertical |
| Carte conceptuelle | concept mapping (Novak) | radiale |
| Lancement de projet | gestion de projet (WBS) | colonnes |
| Apprendre une langue | didactique des langues | arbre horizontal |

Publics couverts : étudiant, scientifique, autodidacte, professionnel. Les huit
dispositions différentes (radiale, arbre H, arbre V, frise, matrice, arête de
poisson, colonnes, escalier) évitent l’effet « 14 fois la même étoile ».

---

## 3. Comment une carte est calculée (et pourquoi ce n’est pas du dessin)

Un modèle n’est **pas** une liste de coordonnées. C’est une arborescence +
une règle de placement (`src/lib/mindmap/layout.ts`).

```
TemplateNode (sens) ──layout──▶ { nodes[] avec x/y, edges[] } ──▶ React Flow
```

Algorithmes utilisés :

- **Arbre « tidy »** (Reingold–Tilford simplifié) : les feuilles s’empilent, un
  parent se centre sur ses enfants. C’est le même résultat que `dagre` pour un
  arbre, sans ajouter 60 ko de dépendance.
- **Radial par secteurs pondérés** : chaque branche reçoit un angle
  proportionnel au nombre de ses feuilles — une branche riche ne se fait pas
  écraser par une branche pauvre.
- **Variantes métier** : frise alternée haut/bas, matrice dont la rangée du bas
  est calculée d’après la plus grande colonne du haut, arête de poisson
  alternée, colonnes, escalier.

Bénéfices mesurables (et testés) :

| Promesse | Test |
|---|---|
| Aucun nœud ne se superpose | `layout.test.ts` — collision sur 8 dispositions, `templates.test.ts` — sur les 14 modèles |
| Chaque nœud est placé une seule fois, dans le positif | `layout.test.ts` |
| Une seule racine, une arête par nœud non racine, arêtes valides | `layout.test.ts` + `templates.test.ts` |
| Le radial met bien les branches de niveau 1 sur un même cercle | `layout.test.ts` (écart < 1 px) |
| Résultat déterministe (mêmes entrées → mêmes sorties) | `layout.test.ts` |
| Profondeur ≤ 2 niveaux sous la racine, textes ≤ 64 caractères | `templates.test.ts` |

---

## 4. React Flow : ce qui a été repris des exemples officiels

Recherche menée dans le dépôt `xyflow/xyflow`, dossier
`examples/react/src/examples/` (dépouillé exemple par exemple), et non sur des
articles de blog.

| Exemple officiel | Idée | État dans Einnote |
|---|---|---|
| `Layouting` (dagre) | recalculer les positions, `fitView` après | ✅ **réimplémenté sans dagre** : nos dispositions sont analytiques, donc testables et sans dépendance |
| `FloatingEdges` | choisir le côté de la poignée par géométrie, pas par hasard | ✅ **repris** : 4 poignées invisibles par nœud, `sidesFor()` choisit `s-*`/`t-*` selon la position relative. Indispensable en radial, frise et arête de poisson |
| `CustomNode` | un type de nœud maison | ✅ déjà en place (`EinnoteNode`), enrichi : rendu par niveau (racine / carte / pastille) |
| `NodeToolbar` / `EdgeToolbar` | actions contextuelles sur le nœud sélectionné | ✅ version intégrée : `+` et crayon apparaissent sur le nœud sélectionné |
| `Controls`, `MiniMap` | navigation sur grande carte | ✅ sur bureau uniquement (`useIsDesktop`) : 16 nœuds se perdent vite au doigt |
| `Subflow` (groupes) | nœuds parents contenant des enfants | ⛔ non retenu : incompatible avec notre modèle `parentId` (qui décrit le sens, pas l’emboîtement visuel) |
| `NodeResizer`, `DragHandle` | redimensionner, poignée de glissement | ⛔ non retenus : la carte se lit, elle ne se maquette pas |
| `SaveRestore` (viewport) | mémoriser zoom + position | 🟡 à faire : demanderait un champ `viewport` sur `MindMap` et une migration |
| `EdgeRouting`, `EasyConnect` | tracer/relier à la main | ⛔ hors périmètre : on relie par parenté, pas au stylet |
| `A11y` | nœuds et arêtes focusables, libellés | ✅ `nodesFocusable`, `edgesFocusable`, `aria-label` sur le canevas |

**Ce qui n’a pas été copié, et pourquoi** : les exemples React Flow utilisent
souvent `dagre` ou `elkjs`. Les importer aurait ajouté une dépendance lourde
pour un gain nul sur des arbres de 16 nœuds. Une disposition maison de 200
lignes, couverte par des tests de collision, est plus solide ici.

## 5. Vaults — 6 réseaux de fiches

Dernier venu : un modèle peut remplir non pas *une* fiche mais **plusieurs
fiches déjà liées**. Six modèles, chacun dérivé d’un motif de diagramme
(`docs/VISUALFLOW.md`) et traduit en contenu d’étude réel :

| Modèle | Motif d’origine | Style de graphe | Ce qu’il pose |
|---|---|---|---|
| Carte conceptuelle | Concept map | `carte-conceptuelle` | concept pivot, inclusions, exclusions, voisin |
| Chaîne d’arguments | Pipeline / Flow diagram | `flux` | thèse, deux prémisses, objection, réponse |
| Arbre de décision | Validation flow | `arbre-binaire` | question, critère, deux issues, cas résiduel |
| Machine à états | State machine | `circuit` | état initial, nominal, erreur, final, transitions interdites |
| Décomposition d’un chapitre | Organisation chart | `colonnes` | chapitre → sections → notion révisable |
| Boucle de révision | Workflow automatisé | `reseau` | cours → questions → fiche → test → ajustement → retour |

Trois propriétés tenues par `src/lib/templates/graphs.test.ts` : codes uniques,
**références résolues** (aucun lien orphelin), et graphe **connexe** — aucune
fiche hors arbre. Un modèle qui produirait une fiche isolée serait un modèle
cassé : le test le refuse.

Application en **un geste**, depuis `Vaults → + Vault` : le vault, ses fiches,
leurs codes, leurs références et le style de graphe sont posés, puis le graphe
s’ouvre. La vignette est calculée par le moteur du graphe, pas dessinée à part.

---

## 6. Le modèle par défaut

`carte-lecture` — **Carte de lecture active**, radiale, courbes.

Pourquoi celui-là :

1. **Il montre le rendu des cartes.** Racine pleine en cercle accent, branches en
   cartes (52 px de haut, ombre légère), feuilles en pastilles compactes. C’est
   la hiérarchie visuelle par défaut de tout le canevas.
2. **Il se lit comme un graphe.** La disposition radiale rend les cinq axes
   visibles d’un coup d’œil, sans zoom, sur un téléphone.
3. **Il est immédiatement utile** : contexte, thèses, preuves, objections, à
   réutiliser — c’est la structure de n’importe quelle lecture sérieuse.

Toute nouvelle carte créée sans modèle explicite reçoit ce modèle (store :
`createNote("mindmap")` → `DEFAULT_MINDMAP_TEMPLATE`), au lieu du nœud unique
« Idée centrale » qui laissait l’utilisateur devant une page vide.

---

## 7. Exporter ce qu’on a produit

Deux formats, deux usages :

| Sortie | Geste | Ce qu’on obtient |
|---|---|---|
| **Arborescence** (`.zip`) | bouton « Arborescence » | un fichier **par note** (nommé de son titre) et **par fiche**, rangés `Notes/<projet>/…` et `Vaults/<projet>/<vault>/…`, plus `_index.md` et une fiche par projet |
| **Fichier unique** (`.md`) | bouton « Fichier unique » | tout le périmètre dans un seul document, pour un courriel ou un billet |

Dans l’arborescence, les citations deviennent des liens wiki
(`[[#1B Taux nominal]]`) **dans les deux sens** : chaque fiche liste ce qu’elle
cite et ce qui la cite. Deux notes de même titre ne s’écrasent pas (`… - 2.md`),
les caractères interdits sont remplacés et les accents conservés.

Pourquoi un ZIP et pas un dossier : un navigateur ne sait pas écrire de dossier.
La bibliothèque `jszip` aurait coûté ~100 ko pour compresser des fichiers texte
qui pèsent quelques centaines de kilo-octets ; `src/lib/zip.ts` écrit donc
l’archive **sans compression** (méthode 0), sans dépendance, et le test vérifie
la structure binaire (signatures, offsets, CRC-32) plutôt que « ça produit des
octets ». Contrôle indépendant : `zipfile.testzip()` de Python renvoie **ok** sur
l’archive produite par l’application dans un vrai navigateur.

---

## 8. Ce qui manque encore (honnêtement)

| Manque | Effet | Coût |
|---|---|---|
| ~~Appliquer un modèle à une note existante~~ | ✅ fait : « Insérer un modèle » ajoute les sections **absentes**, sans rien écraser (dédoublonnage par texte) | — |
| Mémoriser le **viewport** de la carte | on rouvre toujours recadré | S |
| Modèles **utilisateur** (enregistrer sa propre charpente) | le vrai « remix » à long terme | L |
| Export PNG/SVG d’une carte | partage | M |
| Traduction des modèles | l’app est en français uniquement | M |
| Vérification visuelle en navigateur | les 14 aperçus SVG et le routage des arêtes ne sont prouvés que par tests DOM et géométrie | — (pas de navigateur dans l’environnement de travail) |

**Limite assumée** : la beauté des aperçus n’est pas testable ; la géométrie,
si. C’est pourquoi tout ce qui est vérifiable l’est par test, et le reste est
signalé ici.
