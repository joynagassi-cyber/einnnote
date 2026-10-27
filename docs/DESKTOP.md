# Le bureau — ce qui change, et pourquoi

Fil de fer de référence : `docs/wireframes/desktop-shell.html` (écrit **avant**
le code, comme le veut la règle).

---

## 1. Le diagnostic

Jusqu’ici, le bureau était un téléphone élargi : une colonne de 720 px au
milieu d’un écran de 1440, des feuilles qui montent du bas, des filtres cachés
derrière un bouton, et aucune touche du clavier. Trois symptômes d’une même
cause : **on réutilisait la mise en page mobile au lieu d’en écrire une.**

Un poste de travail se reconnaît à trois propriétés :

1. **La place disponible est utilisée** — deux ou trois zones lisibles à la
   fois, pas une seule.
2. **Les commandes sont atteignables** — le clavier fait ce que la souris fait
   mal (chercher, créer, changer d’espace, noter).
3. **Rien ne bouge sans raison** — un panneau ouvert ne cache pas ce qu’on est
   en train de lire.

---

## 2. Ce qui a été construit

### 2.1 Les feuilles deviennent des boîtes centrées

`Sheet` produit désormais :

| Largeur | Rendu |
|---|---|
| < 1024 px | feuille basse (inchangé, geste du pouce) |
| ≥ 1024 px | boîte centrée, 680 px (900 px pour les galeries), ombre portée, contenu qui défile, voile cliquable, **sans poignée** |

Aucun écran n’a été réécrit : c’est le composant qui change de vêtement. Bénéfice
immédiat sur les filtres, les modèles (14 cartes), les questions, les
confirmations et le menu de note.

### 2.2 Bibliothèque : colonne de filtres permanente

- Colonne de 268 px, collante, avec les mêmes facettes et les mêmes compteurs
  que la feuille mobile (`FilterPanel`, une seule implémentation, deux habits).
- Le bouton « Filtres » **n’est plus rendu** en bureau (pas seulement masqué :
  une seule copie dans le DOM, donc pas de doublon pour les lecteurs d’écran).
- Vue liste : en-tête de colonnes (`Note · Méthode/collection · Révision ·
  Ouvrir`) et alignement en grille — la densité qu’on attend d’une table.

### 2.3 Éditeur : les questions à côté du texte

- `<aside>` de 340 px, collante, qui défile indépendamment : on écrit à gauche,
  on voit ses questions à droite. C’est le geste Cornell — la colonne d’indices
  est *visible*, pas derrière un bouton.
- L’onglet flottant et la feuille mobile disparaissent en bureau ; le même
  `QuestionsPanel` sert aux deux (aucune divergence de contenu).
- Le papier s’élargit (`--screen-max: 1180px`) sans toucher à la largeur de
  lecture choisie dans la personnalisation.

### 2.4 Révision : le clavier comme accélérateur

- **Espace** révèle la réponse, **1–4** notent (Again / Hard / Good / Easy).
- Colonne de contexte à droite : note, méthode, position dans la série, rappel
  des touches.
- Les touches sont ignorées dans un champ de saisie.

### 2.5 Couche clavier globale

| Touche | Action |
|---|---|
| `/` | met le curseur dans la recherche de la bibliothèque |
| `n` | nouvelle note (`/new`) |
| `g` puis `n` / `p` / `r` / `l` / `a` | notes / projets / révision / leçons / apparence |
| `?` | liste des raccourcis |
| `Échap` | ferme le panneau ouvert |

Implémentation : `src/lib/useDesktopShortcuts.ts`. Trois garde-fous —
désactivé sous 1024 px, ignoré dès qu’on tape (`input`, `textarea`, `select`,
`contenteditable`, `.note-prose`), et toujours découvrable (`?` + entrée
« Raccourcis » en bas du rail).

### 2.6 Rail

Rien de structurel : il portait déjà la marque, « Nouvelle note », les projets,
les espaces, les réglages et la carte de révision. Ajout d’une entrée
**Raccourcis** avec la touche `?` affichée, plus une entrée **Coffres** (les
coffres Zettelkasten sont une destination, pas un sous-onglet des projets).

### 2.7 Fond et verre sur le bureau

Le fond personnalisé n’est pas une décoration de téléphone : `WallLayer` est
monté **une fois** dans `AppShell`, derrière tout le reste, et le rail devient
un verre (`backdrop-filter: blur(22px)`, surface à 68 %). Les boîtes modales et
le dock flottent au-dessus du même fond.

Conséquence de mise en page : les panneaux translucides doivent rester lisibles
sur une image. D’où trois garde-fous, vérifiés par `src/lib/glass.test.ts` :

| Garde-fou | Valeur | Où |
|---|---|---|
| Encre et texte secondaire AA sur le verre | ≥ 4,5:1 | `.screen`, `.bg-surface`, `.rail` |
| Valeur moyenne du fond déclarée et vérifiée | ± 6/255 | `WALLS[].tone` ↔ SVG |
| Voile borné par couple (thème, fond) | bande calculée | `src/lib/glass.ts` |

Détail des fonds, des signatures et de la régénération : `docs/WALLS.md`.

---

## 3. Règles de mise en page (à respecter pour les prochains écrans)

| Règle | Raison |
|---|---|
| Un panneau **secondaire** = colonne collante ≥ 260 px | on garde le contenu principal visible |
| Un panneau **modal** = boîte centrée ≤ 900 px | les modèles et les filtres se lisent en un coup d’œil |
| Jamais deux copies d’un même panneau dans le DOM | doublons d’accessibilité et de focus |
| `useIsDesktop()` pour **monter**, CSS pour **styliser** | un panneau caché en CSS reste lu par les lecteurs d’écran |
| Le clavier ne prend jamais la main pendant la frappe | sinon `n` devient impossible à écrire |

---

## 4. Vérification

| Preuve | Où |
|---|---|
| La colonne de filtres existe en bureau, filtre vraiment, et le bouton « Filtres » a disparu | `smoke.test.tsx` — « affiche la colonne de filtres en bureau » |
| Les questions sont une colonne latérale, l’onglet mobile a disparu | « tient les questions dans une colonne latérale » |
| `/`, `n`, `g p`, `?` fonctionnent ; `n` tapé dans la recherche ne navigue pas | « répond au clavier » |
| Espace révèle, `2` note, la carte suivante arrive | « révise au clavier » |
| Aucun test mobile cassé | 42 tests d’écrans verts |

---

## 5. Limites assumées

1. **Pas de vérification visuelle** : l’environnement n’a pas de navigateur. Les
   assertions portent sur le DOM et les états, pas sur le rendu. À contrôler à
   l’œil : alignement de l’en-tête de liste, largeur réelle de l’aside dans une
   fenêtre de 1024 px, ombre des dialogues.
2. **Pas de palette de commandes** (⌘K) : `?` et `/` couvrent l’essentiel ; une
   palette complète demande un index de commandes et un piège de focus.
3. **Pas de vue divisée** (deux notes côte à côte) ni de glisser-déposer pour
   réorganiser les projets.
4. **Le toast de navigation** annoncé dans le fil de fer n’a pas été livré :
   l’élément actif du rail suffit, et un toast à chaque lettre masquerait le
   contenu. Le fil de fer est corrigé en conséquence.
5. **`g` puis lettre** attend 1,2 s : au-delà, la frappe reprend son sens normal.
   Ce délai n’a pas été réglé par un test utilisateur.

---

## 6. Prochaines étapes (dans l’ordre de rentabilité)

1. **Palette de commandes ⌘K** : recherche globale (notes, cartes, actions) —
   c’est ce qui manque le plus à un utilisateur de bureau.
2. **Vue divisée** : note + source, ou note + carte mentale.
3. **Colonnes réglables** (poignée entre le papier et l’aside) + mémorisation.
4. **Menu contextuel au clic droit** sur une carte de la bibliothèque.
5. **Raccourcis remappables** (fichier de préférences), si l’usage le demande.
