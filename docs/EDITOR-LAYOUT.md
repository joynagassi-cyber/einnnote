# L’éditeur : une seule barre, en haut sur bureau, au-dessus du clavier sur téléphone

**Décision du 29 octobre 2026.** La note n’a plus qu’**une** barre. Elle tient la
mise en forme, la question ancrée, les réglages de la note et la palette. Tout ce
qui était empilé à côté d’elle est supprimé.

Ce document est le wireframe demandé pour une mise en page de bureau : il décrit
la cible **avant** l’implémentation, puis les écarts assumés.

---

## 0. Ce qui change, en huit lignes

1. **Une barre, pas trois.** La barre de mise en forme, la barre de
   personnalisation de la note et le pupitre à quatre gestes fusionnent.
2. **Bureau (≥ 768 px)** : la barre est en **haut**, collante sous l’en-tête,
   et va **d’un bord à l’autre** de la colonne. Les gestes d’écriture à gauche,
   la structure et la palette à droite.
3. **Téléphone (< 768 px)** : la barre est en **bas**, fixée juste **au-dessus
   du clavier** (`--kb`, mesuré par `visualViewport`, pas supposé).
4. **Elle n’existe qu’en mode écriture.** En lecture, elle disparaît avec la
   colonne de questions : il ne reste que le texte.
5. **Une icône de mode, juste à gauche du menu** (le « ⋯ » sur téléphone, la
   fiche sur bureau) : écrire ↔ lire en un geste, sans ouvrir de panneau.
6. **La barre contextuelle flottante est supprimée.** Ses gestes sont sur la
   barre : marques déjà présentes, et un bouton **« Créer une question »**,
   grisé avec son motif quand rien n’est sélectionné.
7. **Les réglages de la note** (taille du texte, interligne, largeur de lecture,
   papier) passent dans le menu **« ⋯ »**, sous « Affichage de la note ».
8. **Le fond d’une note n’est plus un canevas.** Uni (qui suit le thème, clair
   ou sombre) ou ligné — jamais de pointillés ni de quadrillage. Les motifs
   restent aux cartes mentales et aux graphes.

---

## 1. Wireframe — bureau (≥ 768 px)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ←   Plan du chapitre 3                          [ 📖 Lecture ] [ Fiche  ⌘. ] │  en-tête, collant
├───────────────────────────────────────────────────────────────────────────┤
│ ↶ ↷ │ Texte ▾ │ B I U S </> 🖍 🔗 ┊ • 1. ☑ ⇥ ⇤ ┊ ≡ ≡ ≡ ┊ ❓ ⋯ + [Tout] 12 mots │  LA barre, collante
├───────────────────────────────────────────────────────────────────────────┤
│  Plan du chapitre 3                          ← titre (défile avec le texte)│
│  Outline · 4 questions                                                     │
│                                                                            │
│  Q1  ▍3. Lire un article scientifique                                      │  pastille dans la gouttière
│      ▍Résumé d’abord : question, méthode, résultat, limite.                │
│                                   ┌──────────────────────────┐             │
│                                   │ Questions de la note     │             │  colonne Cornell
│                                   │  Q1  Quelles sont…       │             │
│                                   └──────────────────────────┘             │
└───────────────────────────────────────────────────────────────────────────┘
   gauche ←──────────────────── la barre va d’un bord à l’autre ───────────→ droite
```

Règles de placement :

| Zone | Contenu | Pourquoi là |
| --- | --- | --- |
| extrême gauche | historique, type de bloc, marques | ce qu’on touche en écrivant |
| milieu | listes, retrait, alignement | ce qu’on fait après avoir écrit |
| avant-dernier | **❓ Créer une question** | le geste Cornell, à côté du texte |
| avant-derniers | **⋯** puis **+** | ce qui ouvre un menu, puis ce qui ajoute |
| extrême droite | **Tout** + compteur de mots | la porte de sortie vers la palette |

---

## 2. Wireframe — téléphone (< 768 px)

```
┌───────────────────────────────┐
│ ←   Plan du chapitre 3  [📖][⋯] │  en-tête
├───────────────────────────────┤
│  Plan du chapitre 3           │
│  Outline · 4 questions        │
│                               │
│  3. Lire un article…          │  le texte
│  Résumé d’abord : question,   │
│  méthode, résultat, limite.   │
│                          ▍    │  curseur
├───────────────────────────────┤
│ ↶ ↷ │ Texte ▾ │ B I U … ⋯ + Tout │  LA barre — fixée au-dessus du clavier
└───────────────────────────────┘
   ┌───────────────────────────┐
   │         clavier           │  la barre remonte avec lui (--kb)
   └───────────────────────────┘
```

- La barre est **fixe**, collée au-dessus du clavier : quand on touche le texte
  et que le clavier s’ouvre, elle monte avec lui, elle ne se cache pas dessous.
- Elle **défile horizontalement** : toutes les commandes restent atteignables
  (aucune ne disparaît faute de place).
- En **lecture**, la barre disparaît — c’est le seul mode qui ne propose rien.

---

## 3. La bascule de mode

```
   écriture                                   lecture
┌──────────────────────────┐          ┌──────────────────────────┐
│ ←  Note        [📖] [⋯]  │          │ ←  Note        [✏] [⋯]  │
└──────────────────────────┘          └──────────────────────────┘
        l’icône propose                       l’icône propose
        ce qu’on obtient                      le retour
```

| Point | Décision |
| --- | --- |
| emplacement | immédiatement à gauche du menu de la fiche (« ⋯ » sur téléphone) |
| icône | `BookOpen` en écriture, `PencilSimple` en lecture — toujours ce qu’on **obtient** |
| libellé | visible sur bureau (« Lecture » / « Écrire »), icône seule sur téléphone |
| clavier | `Échap` quitte la lecture (déjà en place) |
| accessibilité | `aria-pressed` + `aria-label` explicite ; jamais la couleur seule |

---

## 4. Ce qui est supprimé, et où ça a été mis

| Supprimé | Remplacé par |
| --- | --- |
| Barre de personnalisation de la note (2ᵉ rangée) | « ⋯ » → **Affichage de la note** (4 réglages, chacun disant sa valeur) |
| Pupitre à quatre gestes + rangement par appui long | la barre complète, qui défile ; « Tout » ouvre la palette |
| Barre contextuelle flottante sur sélection | marques de la barre + **« Créer une question »** |
| `data-canvas` sur la note (pointillés) | `data-sheet` : `plain` ou `ruled` |

**Aucune commande ne disparaît** : les 55 entrées du registre restent dans la
palette, et la barre expose les mêmes verbes qu’avant. Ce qui a disparu est une
**surface**, pas un geste.

---

## 5. Les fonds, séparés une fois pour toutes

| Surface | Fonds autorisés | Pourquoi |
| --- | --- | --- |
| **Note** | `plain` (uni, suit le thème clair/sombre) · `ruled` (lignes de cahier) | le texte est le sujet ; un motif derrière des phrases ne guide rien |
| **Canevas** (carte mentale, graphe, aperçus) | pointillé · quadrillé · uni | on y déplace des nœuds : la grille aide à aligner |

Réglage : **Apparence → « Fond de la note »** (deux choix) puis **« Fond du
canevas »** (trois choix), avec la mention « jamais les notes ».

---

## 6. Vérification

| Contrôle | Résultat |
| --- | --- |
| `tsc` | 0 erreur |
| `eslint src` | 0 erreur (2 avertissements préexistants) |
| `vitest` | 760/760 (les tests du pupitre remplacés par ceux de la barre) |
| `vite build` | ✓ |

Tests qui tiennent cette page :

- `src/test/commands.test.tsx` → « Barre d’édition » : une seule barre,
  « Tout » ouvre la palette, un geste atteint le document, « Créer une
  question » grisé sans sélection, réglages dans « ⋯ », disparition en lecture
  et retour par la bascule.
- `src/test/fonds.test.tsx` → la note n’a jamais `data-canvas`, le graphe
  garde le sien, « ligné » ne touche pas au canevas.
- `src/test/fiche.test.tsx` → la fiche ne propose plus de rangement de pupitre.

Ce que ces tests **ne** prouvent pas : la position réelle de la barre (jsdom ne
calcule pas de mise en page). Elle se vérifie à l’écran, aux deux largeurs.
