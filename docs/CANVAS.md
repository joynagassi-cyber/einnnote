# Canevas — ce que Miro et tldraw font, ce qu’on en prend

Recherche faite sur la documentation publique de tldraw et de Miro, puis
confrontée à ce que le canevas d’Einnote sait déjà faire (React Flow 12).
Objectif : **prendre les gestes**, pas copier l’interface.

Sources principales :
- tldraw — [Canvas concepts](https://tldraw-tldraw.mintlify.app/concepts/canvas),
  [Accessibilité](https://tldraw.dev/features/composable-primitives/accessibility),
  [notes de version 5.2](https://tldraw.dev/releases/v5.2.0),
  [raccourcis](https://tldraw.dev/examples/keyboard-shortcuts) ;
- Miro — [Structurer le contenu](https://help.miro.com/hc/en-us/articles/360017730973-Structuring-board-content),
  [Aligner des objets](https://help.miro.com/hc/en-us/articles/360017730953-Working-with-objects),
  [Barres d’outils](https://help.miro.com/hc/en-us/articles/360017730553-Toolbars),
  [Diagrammes](https://help.miro.com/hc/en-us/articles/4403634496402-Miro-for-mapping-diagramming).

---

## 1. Matrice de décision

| Geste attendu sur un canevas infini | Miro | tldraw | Einnote — état |
|---|---|---|---|
| Déplacer le canevas au glissement | oui | oui | **fait** (`panOnScroll`, `panOnDrag`) |
| Zoom molette / pincement | oui | oui | **fait** (`zoomOnPinch`, `minZoom 0.35`) |
| Ajuster tout le contenu | oui | oui | **fait** (`fitView`, padding adaptatif) |
| Mini-carte | oui | non | **fait** en bureau |
| Rectangle de sélection | glisser | glisser | **fait** — Maj + glisser (`selectionKeyCode="Shift"`) |
| Ajouter à la sélection | Cmd/Ctrl | Cmd/Ctrl | **fait** (`multiSelectionKeyCode`) |
| Aligner une sélection | barre contextuelle | barre de propriétés | **fait** — gauche / haut |
| Répartir uniformément | oui | oui (v5.2) | **fait** — horizontal, 3 nœuds minimum |
| Supprimer une sélection | oui | oui | **fait** |
| Aimant sur grille | oui, réglable | non | **fait** — grille 16 px, bouton aimant |
| Guides d’alignement pendant le glissement | oui | oui | **non** — voir §3 |
| Annuler / rétablir | oui | oui | **non** — voir §3 |
| Groupes, cadres, calques | oui | oui | **non** — hors périmètre notes |
| Notes autocollantes, dessin, formes libres | oui | oui | **refusé** — la carte est un graphe de texte |
| Index spatial, culling, LOD | implicite | oui (R-tree, culling) | **non nécessaire** — 7 à 40 nœuds |

## 2. Ce qui a été ajouté cette fois

1. **Sélection multiple** — Maj + glisser trace le rectangle, Cmd/Ctrl + clic
   ajoute un nœud. Sans cela, ranger cinq nœuds demandait cinq glissements.
2. **Barre de sélection** — apparaît au-dessus du canevas dès deux nœuds :
   aligner à gauche, aligner en haut, répartir horizontalement, supprimer.
   Les positions écrites sont entières, donc stables après rechargement.
3. **Aimant** — accroche à une grille de 16 px, activé par défaut, bouton dans
   la barre d’outils avec `aria-pressed`. Miro le rend réglable ; 16 px suffit
   ici parce que les nœuds font 150–260 px de large.

Texte d’aide mis à jour : « Maj + glisser pour sélectionner plusieurs nœuds ».

## 3. Ce qui reste ouvert, avec son coût

| Chantier | Pourquoi ce n’est pas fait maintenant | Coût honnête |
|---|---|---|
| **Guides d’alignement au glissement** | React Flow n’en fournit pas ; il faut comparer les bords des nœuds voisins à chaque frame et dessiner des lignes. | ~120 lignes + tests de géométrie. |
| **Annuler / rétablir** | Les nœuds vivent dans un store persisté ; il faut un journal de commandes (position, texte, forme, arêtes) et une pile par carte. | 1 modèle + 1 barre + tests. C’est le prochain vrai gain. |
| **Cadres et calques** | Aucun besoin exprimé ; le modèle actuel est un arbre, pas un tableau blanc. | Modèle + rendu + déplacement groupé. |
| **Redimensionner un nœud** | Les six formes ont une taille dictée par le texte ; la redimensionner casserait le rendu des linteaux. | Changer le modèle de nœud. |

## 4. Sources de performance (pour plus tard)

tldraw documente trois leviers qui deviendront utiles si une carte dépasse
quelques centaines de nœuds : **culling** (ne rendre que le visible),
**index spatial R-tree** (sélection au pinceau en O(log n)) et **LOD** (rendu
simplifié à faible zoom). Rien de tout cela n’est prioritaire à 40 nœuds ; le
noter évite de complexifier avant d’en avoir besoin.
