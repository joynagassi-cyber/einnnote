# VisualFlow — relevé du corpus, et ce qu’on en a fait

> Deux sources, une question : **qu’est-ce qui manque à nos graphes, et qu’est-ce
> qui n’est qu’une démo de bibliothèque ?** La réponse n’est pas « copier
> l’exemple » : c’est de nommer les motifs, de garder ceux qui servent à
> apprendre, et de refuser les autres en disant pourquoi.
>
> Relevé effectué le **27 octobre 2025** sur
> `https://www.visualflow.dev/free-examples` (5 blocs de page lus, liste
> complète) et sur le dépôt `Azim-Ahmed/Flow_renderer_test` (clone `--depth 1`).

---

## 1. Ce que la page liste réellement

**24 entrées** sont visibles gratuitement. Chaque vignette renvoie soit à un
dépôt GitHub, soit à un bac à sable CodeSandbox, soit à une démo Netlify ;
le catalogue « Pro » est payant et ne publie ni code ni capture exploitable.

| # | Exemple | Source publique | Motif de fond | Verdict pour Engram |
|---|---|---|---|---|
| 1 | Concept map | GitHub | liens **nommés** entre concepts | **adopté** → style `carte-conceptuelle`, étiquettes calculées |
| 2 | Kanban | GitHub | colonnes d’états + glisser | refusé : un tableau d’états n’est pas un graphe de fiches |
| 3 | State machine | GitHub | états stables, transitions autorisées | **adopté comme modèle** → vault « Machine à états » |
| 4 | Microservices | GitHub | topologie d’infrastructure | refusé : aucun contenu d’étude |
| 5 | Git branching | GitHub | graphe orienté acyclique de commits | refusé : le contenu viendrait de git, pas des fiches |
| 6 | Organisation chart | GitHub | hiérarchie stricte, une mère, n enfants | **adopté comme modèle** → « Décomposition d’un chapitre » |
| 7 | Minimap | GitHub | vue d’ensemble + cadre de caméra | déjà en place (`MiniMap` sur bureau) |
| 8 | Radial mind map | GitHub | disposition radiale | déjà en place (styles `Réseau`, `Constellation`) |
| 9 | Flow pattern | GitHub | motifs de flux réutilisables, palette | **adopté** : idée de catalogue de motifs → 6 modèles de vault |
| 10 | Edge intersection | GitHub | point d’accroche = intersection réelle | déjà en place (`floating.ts` → `borderPoint`) |
| 11 | Interactive editable edges | GitHub | libellé de lien éditable | **partiellement adopté** : libellé lu, pas encore éditable |
| 12 | Animation flow | GitHub | flux animé sur le trait | **adopté** → réglage « Animation du courant » |
| 13 | Advanced edge routing | GitHub | routage qui évite les nœuds | refusé : coût de calcul élevé, nos dispositions sont sans croisement par construction |
| 14 | Neural network | GitHub | nœuds circulaires, liens pondérés | refusé : le poids n’existe pas dans une fiche |
| 15 | ReactFlow mindmap | GitHub | nœuds texte libres | déjà couvert (`/mindmap/:id`) |
| 16 | Node intersections | GitHub | détection de chevauchement | déjà garanti par test (`zettel.test.ts`) |
| 17 | Pipeline flow | GitHub | étapes ordonnées, une seule entrée | **adopté comme modèle** → « Chaîne d’arguments » |
| 18 | Validation flow | GitHub | un test, deux issues | **adopté comme modèle** → « Arbre de décision » |
| 19 | Workflow automate | GitHub | cycle avec retour | **adopté comme modèle** → « Boucle de révision » |
| 20 | **Flow diagram** | `Azim-Ahmed/Flow_renderer_test` | canevas éditable : palette, nœuds, arêtes libellées, export | **adopté comme modèle de rendu** (§2) |
| 21 | Financial analytics | CodeSandbox `react-6qgyt` | tableau de bord, KPI | refusé : c’est de la donnée, pas de la connaissance |
| 22 | Chat flow builder | GitHub | arbre de décision conversationnel | refusé : doublon de l’arbre de décision, sans le contenu |
| 23 | FSM editor | `Azim-Ahmed/fsm-editor` | validation + annuler/refaire | **partiellement adopté** : validation d’import (§3) |
| 24 | Multiple handles flow | CodeSandbox `mwxqfb` | plusieurs poignées par nœud, règles de connexion | refusé : nos arêtes sont calculées, pas tirées |

Dépôts partagés derrière les vignettes : `Azim-Ahmed/FlowPattern`
(`flow-pattern.vercel.app/?ex=…&embed=true`) et
`Azim-Ahmed/flow-showcase-studio` (`/intersection`, `/editable`, `/flow`,
`/routing`).

**Ce que la page ne donne pas** : aucun exemple n’est un modèle de *contenu*.
Tous montrent comment dessiner un schéma ; aucun ne dit quoi mettre dedans. C’est
précisément le trou que comble cette application — d’où la traduction en
**modèles de vault** (§4).

---

## 2. `Flow_renderer_test` — anatomie du modèle

Dépôt lu intégralement (`src/` : `FlowCanvas.jsx`, `CustomEdge`, `NodeA`,
`Sidebar`, `FilterItems`, `Diagram`, `helpers`, `assets/FlowData/index.js`).

### Ce que le dépôt fait bien

| Fait | Détail | Ce qu’on en garde |
|---|---|---|
| **Étiquette sur le trait** | le chemin SVG reçoit un `id`, puis `<text><textPath href="#id" startOffset="50%" textAnchor="middle">` | notre `EngramEdge` (`src/lib/graph/edges.tsx`), **avec un liseré** `paint-order: stroke` pour rester lisible sur le trait |
| **Palette en données** | `FlowData/index.js` décrit types de nœuds et de liens | nos `GRAPH_STYLES` (13) et `VAULT_TEMPLATES` (6) sont aussi des données pures, testées |
| **Identité d’arête déterministe** | `id` unique obligatoire par arête | `tree-${source}-${target}` / `echo-…`, dérivé des codes de fiches |
| **Export depuis le canevas** | `helpers/index.js` : PNG (`html-to-image`) + JSON (`Blob`) | export **SVG** + JSON validé (voir plus bas) |

### Ce que le dépôt fait mal — et pourquoi on ne l’a pas copié

| Défaut constaté | Conséquence | Notre décision |
|---|---|---|
| `react-flow-renderer@10` **et** `reactflow@11` **et** `@xyflow/react@12` installés ensemble | trois API dans un même paquet, comportements divergents | un seul `@xyflow/react@12` |
| `convert()` : `JSON.parse` puis `concat`, sans vérification | un fichier étranger casse le canevas au lieu d’être refusé | `parseGraphDocument` valide forme, codes, doublons et liens orphelins |
| `onConnect` : `data.text = "connection line text"` codé en dur, trait `#FF0072` | étiquette factice sur chaque lien créé | libellé **déduit** de `refs` ; aucun texte en dur |
| `onDrop` : `reactFlowInstance.project()` | API supprimée depuis la v11 | rien à remplacer : nous ne créons pas de nœud par glisser |
| `id: flow_azim_${type}_renderer_${uuidv4()}` | identifiants non reproductibles → pas de test possible | identifiants dérivés du contenu |
| `toPng` via `html-to-image` | dépendance + pixels : illisible à l’impression, non rééditable | `graphToSvg`, sans dépendance |
| CRA + MUI 5, classes Tailwind dans les styles de nœuds, reset CSS maison, `console.log` dans le rendu, `Backup*.txt` versionnés | dette de maintenance | on garde nos primitives (Tailwind + jetons de thème) |

**Verdict** : le dépôt est un **exemple**, pas une base. On a repris son modèle
de *rendu* (arête libellée, palette pilotée par les données, export) et laissé
son *échafaudage*.

---

## 3. `fsm-editor` et la leçon de validation

`Azim-Ahmed/fsm-editor` ajoute deux choses absentes de `Flow_renderer_test` :
**valider avant d’accepter** et **annuler/refaire**. La première est devenue la
nôtre : un import de graphe est vérifié avant de toucher au contenu
(`parseGraphDocument`), et le refus dit **pourquoi** (« Ce code apparaît deux
fois », « Un lien pointe vers une fiche absente (#1A → #9Z) »). L’annulation est
déjà assurée ailleurs (corbeille, confirmations) — nous ne l’avons pas dupliquée.

---

## 4. Traduction en modèles utilisables

Six modèles de vault (`src/lib/templates/graphs.ts`), chacun dérivé d’un motif
du tableau §1, et chacun avec du **contenu d’étude réel** :

| Modèle | Motif VisualFlow d’origine | Style appliqué | Fiches |
|---|---|---|---|
| Carte conceptuelle | Concept map | `carte-conceptuelle` | 5 |
| Chaîne d’arguments | Pipeline / Flow diagram | `flux` | 5 |
| Arbre de décision | Validation flow | `arbre-binaire` | 5 |
| Machine à états | State machine / FSM editor | `circuit` | 5 |
| Décomposition d’un chapitre | Organisation chart | `colonnes` | 5 |
| Boucle de révision | Workflow automate | `reseau` | 5 |

**Un geste, pas cinq écrans** : depuis `Vaults → + Vault`, choisir un modèle
crée le vault, ses fiches, **leurs codes d’origine** et leurs références, règle
le style de graphe, et ouvre directement `/vault/:id/graph`. La vignette de
chaque modèle n’est pas une maquette : elle est calculée par
`zettelGraph` + `layoutZettelGraph`, c’est-à-dire par le moteur qui dessine la
page Graphe (`VaultPreview` dans `TemplateGallery.tsx`).

Ce qui est écarté volontairement : Kanban, microservices, Git, réseau de
neurones, tableau de bord financier. Beaux à regarder ; sans usage pour
apprendre quelque chose. Un modèle qui ne sert pas est une dette déguisée en
fonctionnalité.

---

## 5. Ce qui est en place, et où c’est vérifié

| Livré | Fichier | Preuve |
|---|---|---|
| Étiquettes de relation déduites | `src/lib/graph/labels.ts` | `labels.test.ts` (5) |
| Arête unique, 5 dessins, étiquette sur le chemin | `src/lib/graph/edges.tsx` | rendu vérifié par le smoke test (nombre d’arêtes = liens) |
| Export SVG clair/sombre + JSON validé | `src/lib/graph/export.ts` | `export.test.ts` (9) |
| Réglages étiquettes / renvois / animation | `useAppStore` → `setGraphDisplay` | `smoke.test.tsx` |
| Feuille « Affichage et export » + import en vault | `src/components/GraphExchange.tsx` | parcours manuel, validation testée côté module |
| 6 modèles de vault | `src/lib/templates/graphs.ts` | `graphs.test.ts` (6) : codes uniques, références résolues, styles existants, graphe **connexe** |
| 13ᵉ style « Carte conceptuelle » | `src/lib/graph/styles.ts` | `styles.test.ts` |

---

## 6. Ce qui reste ouvert

- **Éditer un libellé de lien à la main** (motif #11). Aujourd’hui le libellé est
  déduit ; l’éditer supposerait une relation stockée sur la fiche, donc une
  migration de données et une règle de priorité entre `refs` et libellé libre.
- **Routage qui évite les nœuds** (#13) : inutile tant que les dispositions
  garantissent l’absence de chevauchement ; à rouvrir le jour où l’on laisse
  glisser les cartes librement.
- **Modèles de vault au-delà de six** : le format est bon, le contenu est le
  travail. Chaque ajout doit venir d’une situation d’étude réelle, pas d’un
  motif joli.
