# Deux mises en page, pas une qui s’étire

> Ce document répond à trois défauts constatés en usage réel : **les graphes
> s’affichaient vides**, **rien n’était modifiable sur téléphone**, et **il était
> impossible de voir le rendu bureau** autrement qu’en agrandissant la fenêtre.
> Chacun avait une cause précise ; aucun n’était cosmétique.

---

## 1. Le graphe vide : une hauteur nulle, pas un défaut de rendu

Symptôme : la page « Graphe » affichait le fond pointillé, les compteurs, le
dock — et **aucune carte**, sans erreur.

Mesures (Chromium, 1440 × 900 puis 390 × 844) :

| Élément | Avant | Après |
|---|---|---|
| Hauteur de `.react-flow` | **0 px** | 807 px (bureau) · 744 px (téléphone) |
| Nœuds montés | 12 | 12 |
| Nœuds visibles à l’écran | 0 | 12 (bureau), 4 (vue « autour ») |
| Arêtes dessinées | **0** | 12 |

Deux causes, cumulatives :

1. **`.screen` n’avait pas de hauteur.** C’était un `flex` en colonne avec
   `min-height: 100dvh` ; un enfant en `flex: 1` y retombe à 0 px. React Flow
   pose `height: 100 %` **en style inline** : un pourcentage ne se résout que
   contre une hauteur définie, donc le canevas mesurait zéro. Correctif :
   `.screen-canvas` (hauteur de fenêtre exacte, `overflow: hidden`) et une
   enveloppe `.flow-fill` positionnée en absolu (classe **hors** `@layer`, car la
   feuille de React Flow n’est pas en couche — une règle en couche perdait
   contre elle).
2. **Les nœuds n’avaient plus de poignées.** En dessinant nos propres arêtes
   (`EngramEdge`), les `<Handle>` avaient été retirés. React Flow refuse de
   dessiner une arête dont la source ou la cible n’a pas d’ancre : les arêtes
   étaient déclarées, jamais rendues. Les poignées invisibles sont revenues, et
   l’arête s’ancre sur le côté calculé par `floatingParams`.

**Leçon générale** : un canevas n’est pas un composant comme un autre. Il exige
une chaîne de hauteurs *définies*, pas seulement `min-height`.

---

## 2. Le téléphone : deux vues, et enfin des boutons qui marchent

### 2.1 La pile Zettelkasten volait les appuis

La carte était un `article` avec `onPointerDown` + `setPointerCapture` pour le
feuilletage. Résultat : **tout** appui dans la carte était capturé par le
feuilletage — impossible de toucher le titre, un renvoi, un bouton. Correctif :
la capture ignore les éléments interactifs
(`event.target.closest("button, a, input, textarea")`), et la carte gagne un
bouton explicite « Modifier cette fiche ».

### 2.2 Deux mises en page, réellement distinctes

| | Téléphone (< 1024 px) | Bureau (≥ 1024 px) |
|---|---|---|
| Vault | pile feuilletée au doigt, une carte à la fois | **liste + carte** en deux panneaux, recherche, panneau droit défilant |
| Graphe | vue « **autour** » : la fiche et ses voisines, une seule colonne, échelle ≥ 0,6 (texte lisible) ; bascule « Tout » pour l’arbre entier | arbre complet, mini-carte, contrôles |
| Détail | pas de mini-carte, pas de contrôles | `MiniMap` discrète (168 × 104), `Controls` |

La vue « autour » n’est pas un zoom : c’est un **autre cadrage**. Un arbre de
12 fiches fait ~2 000 px de large ; réduit à 390 px, le titre tombe à 7 px et ne
se lit plus. En colonne à l’échelle 1, il se lit — et toucher une carte en fait
la nouvelle racine, ce qui permet de parcourir le vault sans jamais dézoomer.

### 2.3 Le seuil de navigation : 768 px, pas 1024 px

Un `transform: scale()` ne rend pas une page « bureau » : les media queries et
les variantes `lg:` se calculent sur la largeur de la **fenêtre**, jamais sur
celle d’un conteneur. Réduire une page étroite la rend juste plus petite ; la
mettre dans une iframe de 1440 px ne la transforme pas non plus en application
de bureau — c’est une **enveloppe**, et l’enveloppe a été retirée.

La version bureau, c’est l’application elle-même, à sa largeur réelle :

| Largeur | Navigation | Écrans riches |
|---|---|---|
| < 768 px | barre basse (`.bottom-nav`) | une colonne, graphe « autour » |
| 768–1023 px | **rail compact** de 88 px : icônes seules, cibles 44 px, `aria-label` + `title` | une colonne |
| ≥ 1024 px | **rail complet** de 264 px : libellés, sections, badges | vault en deux panneaux, `MiniMap`, `Controls` |

Deux media queries, donc deux vérités différentes : `RAIL_QUERY`
(`min-width: 768px`) décide s’il y a un rail, `DESKTOP_QUERY`
(`min-width: 1024px`) décide s’il y a la place pour deux panneaux. Un écran de
900 px de large a bien un rail et **aucune** barre basse — c’est le cas le plus
courant en aperçu, et c’était le défaut : le rail n’existait qu’à partir de
1024 px, donc la barre basse restait visible partout en dessous.

Le réglage `Mise en page` (Apparence) et les adresses `?bureau=1` / `?mobile=1`
ne sont plus qu’une **préférence de mise en page** : `forcedLayout()` la lit en
amont de `settings.layout`, `useRail()` / `useIsDesktop()` s’en servent, et
`data-layout` est posé sur `<html>` pour que le CSS suive (rail retiré, barre
basse rendue). Rien n’est encapsulé, rien n’est mis à l’échelle.

Corollaire assumé : **forcer « bureau » ne crée pas de largeur**. À 820 px on
obtient un rail compact et deux panneaux serrés ; à 390 px, la mise en page
reste celle du téléphone. Pour montrer les deux tailles côte à côte, il reste
`/preview` — une planche de comparaison, pas un « mode bureau ».

---

## 3. Ce qui reste à prouver, et comment

Les captures de ce dépôt sont produites par un vrai navigateur (Chromium
headless piloté par `puppeteer-core`), pas par jsdom :

- `/` · `/vault/:id` · `/vault/:id/graph` · `/mindmap/:id` · `/settings/data`
  en 1440 × 900 **et** 390 × 844 : aucun débordement horizontal, aucun canevas
  à hauteur nulle ;
- sélection d’un nœud puis « Modifier » sur téléphone → feuille d’édition
  ouverte avec le bon texte ;
- toucher une carte du graphe mobile → la racine change, la vue se recentre ;
- export Markdown → archive téléchargée, `zipfile.testzip()` **ok**, un fichier
  par note et par fiche, arborescence `Notes/<projet>/…`,
  `Vaults/<projet>/<vault>/…`.

Limite assumée : la qualité *visuelle* (goût d’un dégradé, élégance d’une
carte) n’est pas testable ; la géométrie, la lisibilité et les interactions le
sont, et le sont par test ou par capture instrumentée.
