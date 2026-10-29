# L’éditeur : une seule barre, en haut sur bureau, au-dessus du clavier sur téléphone

**Décision du 29 octobre 2026, révisée le même jour (tour 39).** La note n’a plus
qu’**une** barre. Elle tient la mise en forme, la question ancrée, les réglages
de la note et la palette. Tout ce qui était empilé à côté d’elle est supprimé.

La révision du tour 39 ne revient sur aucune de ces règles ; elle en corrige trois
effets de bord : la flèche des questions était une **bande** de 20 px au milieu du
bord droit, le côté des questions s’ouvrait en **fenêtre** sur téléphone, et la
barre **débordait** de la colonne de texte en bureau. Les § 7 à 9 décrivent l’état
retenu, et le § 10 la cinquième méthode.

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
| `vitest` | 771/771 (dont `src/test/canevas.test.tsx` : forme libre, poignée `+`, habillage, redimensionnement, fond unique, barre repliée, tableau blanc) |
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

---

## 7. Le côté des questions — un côté, pas une fenêtre

Décision : **plus de fenêtre pour les questions**, ni sur téléphone ni sur
bureau. Le panneau est un **côté** de la feuille, et il ne recouvre jamais le
texte d’un voile : on doit sentir le texte derrière.

```
bureau (≥ 768 px)                        téléphone (< 768 px)
┌──────────────────────┬──────────────┐  ┌──────────────────────────┐
│ ⌨ │ Ce que je lis     │  Questions   │  │ ←  Note                  │
│   │ Le texte respire. │  ① ② ③       │  │                          │
│   │                   │  ▸ Trier     │  │  le texte, plein cadre   │
│   │                   │              │  │                          │
└──────────────────────┴──────────────┘  └──────────────────────────┘
                                           le panneau arrive par le bord
```

| Point | Décision | Pourquoi |
| --- | --- | --- |
| déclencheur | une **icône fine** (`ChatsCircle`) collée au coin **haut-gauche** du texte, avec le compte des questions | la flèche `ArrowFatLineRight` de 20 × 80 px volait une bande entière de marge pour dire « il y a des questions » |
| ouverture (bureau) | le panneau est **ouvert d’emblée**, il se replie en largeur (0 px) | la colonne Cornell n’a de valeur que visible pendant l’écriture |
| ouverture (téléphone) | **glissement** depuis le bord droit, ou l’icône | le geste, pas le bouton |
| fermeture | glissement vers la droite, `Échap`, ou la flèche de l’en-tête du panneau | trois issues, aucune n’est une fenêtre |
| voile | **aucun** | un voile dit « tu ne peux plus écrire » ; ici on écrit toujours |
| hors champ | `aria-hidden` **et** `inert` quand replié | un panneau invisible ne doit pas attraper le focus |
| questions posées depuis le texte | le panneau s’ouvre, puis on saute au passage | le lien entre la question et le passage reste visible |

## 8. La barre s’arrête où s’arrête le texte

| Contexte | Avant | Maintenant |
| --- | --- | --- |
| bureau | `sticky`, d’un bord à l’autre de la fenêtre, `border-bottom` sur toute la largeur | `sticky`, **calée sur la colonne de lecture** (`margin-left: 74px`, `margin-right: 40px`, contenu borné à `--reading-width`) |
| téléphone | fixe au-dessus du clavier, pleine largeur | inchangé — c’est la bonne forme au pouce |
| écran d’écriture | `.screen` avec bordures et ombre en bureau | **plein cadre** : ni bordure, ni ombre, ni largeur maximale ; la mesure de lecture reste tenue par `.note-prose` |

La règle qui décide : *une barre qui traverse toute la fenêtre pendant que le
paragraphe s’arrête à 720 px laisse une marge vide qu’on voit* — et cette marge
fait « formulaire », pas « feuille ».

## 9. Une icône par élément, et le clavier pour aller vite

| Élément | Signe | Ne partage son signe avec rien |
| --- | --- | --- |
| Paragraphe | `¶` | — |
| Filet | `—` | — |
| Texte plus grand / plus petit | `A+` / `A−` | — |
| Casse : MAJUSCULES / Capitale / minuscules / Chaque Mot | `AA` · `Aa` · `aa` · `Aa Bb` | — |
| Gras · Italique · Souligné · Barré · Code | `B` · `I` · `U` · `S` · `</>` | — |
| Dupliquer le bloc / Copier le bloc | `CopySimple` / `Copy` | — |
| Surlignage : retirer | `X` dans la palette du surligneur | `Eraser` reste à « Effacer la mise en forme » |
| Plus d’options | `SlidersHorizontal` | `DotsThree` reste au menu de la fiche |

**Commandes rapides.** Chaque bouton annonce son raccourci dans son infobulle,
et la palette (`Ctrl+K`, bouton « Tout ») porte les mêmes verbes. Les raccourcis
nouvellement annoncés : `Ctrl+Maj+L` (gauche), `Ctrl+Maj+E` (centrer),
`Ctrl+Maj+R` (droite), en plus de `Ctrl+Alt+0…3` pour les blocs.

## 10. Le tableau blanc — la cinquième méthode

**Décision.** Une dernière méthode réunit **le texte et la planche** dans la
même note. Tout ce que les autres méthodes savent faire s’y applique — sauf le
zettelkasten, qui n’est pas une mise en page mais un **réseau de fiches** dans
un vault, et qui garde son propre espace.

| Ce qui est vrai | Détail |
| --- | --- |
| La note a du **texte** | même éditeur, mêmes blocs, mêmes questions ancrées, mêmes étiquettes |
| La note a une **planche** | la carte mentale de la note (`note.mindmapId`), créée en même temps qu’elle |
| Deux vues, un seul état | la planche du tableau blanc **est** la carte mentale : la modifier ici la modifie sur la page Carte mentale |
| Bureau | trois vues : `Texte` · `Planche` · `Les deux` (côte à côte, planche collante à droite) |
| Téléphone | deux vues : `Texte` · `Planche` — la bascule vit dans l’en-tête, donc elle reste atteignable quand le texte est masqué |
| Export | le Markdown emporte **les deux** : le plan de la carte, puis le texte |
| Ce que la planche ne refait pas | changer de style de graphe, appliquer un modèle, afficher la mini-carte : ces gestes appartiennent à la page Carte mentale, qui les tient avec ses réglages |

**Composants partagés** (une seule implémentation, deux surfaces) :

- `src/components/canvas/mindFlow.tsx` — `toFlow`, `EinnoteNode` : le dessin d’un
  nœud et la conversion de la carte en graphe ;
- `src/components/canvas/MapDock.tsx` — la barre flottante, **la même partout** ;
- `src/components/canvas/MindCanvas.tsx` — la planche sans la page autour.

## 11. Le canevas de carte mentale (tour 39)

| Geste | Effet |
| --- | --- |
| Un bouton de forme de la **barre flottante** | **pose** une forme libre au centre du canevas — aucune liaison |
| Une poignée `+` d’une forme sélectionnée (quatre côtés) | **relie** une nouvelle forme du côté touché |
| Toucher un **trait** | ouvre son habillage : couleur, épaisseur, pointillé, six pointes |
| Toucher une **forme** | ouvre son habillage : remplissage, encre, contour (avec épaisseur), texture, surlignage |
| Chevron au bord gauche | replie/déplie la barre : replié, il ne reste que lui |
| Pincement / molette | dézoom jusqu’à **0,08** — le canevas n’a pas de limite visible |
| Plein cadre | `data-canvas` : ni bordure, ni ombre, ni largeur maximale |

### Ce que la barre contient, et où elle vit

| Décision | Détail |
| --- | --- |
| **Position** | un rail vertical collé au **bord gauche** (`left: var(--rail)`), du bas de l’en-tête au bas de l’écran |
| **Replié** | une poignée de 24 px, avec un chevron `›` — rien d’autre |
| **Déplié** | 308 px : formes, aimant, style, puis taille, remplissage, texte, contour, surlignage, texture ; et pour un trait : couleur, épaisseur, pointillé, pointe |
| **Pourquoi pas en bas** | une barre basse mangeait la moitié de la hauteur d’un téléphone et recouvrait le canevas qu’on venait dessiner |
| **Un seul contrôle de repli** | la poignée. Un second bouton « fermer » dans l’en-tête du panneau aurait fait deux gestes pour une action |
| **Doublons retirés de l’en-tête** | « Style » (il est dans la barre) et la capsule « Nœuds / Profondeur » avec son « Plan » : elle décrivait une liste qu’on ne voyait pas sur le canevas |

### Redimensionner

Quatre **coins** tirent la forme ; le coin opposé reste immobile. Le glissement
est divisé par le zoom du canevas, sinon redimensionner à 50 % doublerait la
forme. Bornes : 64 × 36 au plus petit (en deçà le texte n’existe plus),
520 × 360 au plus grand. Deux **pas de 16 px** dans la barre permettent d’écrire
la taille exacte — 16 parce que c’est la grille de l’aimant : deux formes
ajustées au pas s’alignent d’elles-mêmes.

La taille est écrite dans le nœud (`w`, `h`) et **une seule** fonction la rend,
`nodeSize` : le dessin et l’accroche des traits passent par elle. Deux calculs
différents donneraient des flèches qui s’arrêtent à quelques pixels du bord.

### Couleurs : trois intentions, trois entrées

| Entrée | Sens |
| --- | --- |
| **Automatique** | rien n’est écrit : la forme suit `var(--accent)` du thème |
| **Sans couleur** | `transparent` : la forme perd son fond et ne garde que son contour |
| **Jetons du thème** | accent, accent doux, encre, muet, papier, papier ombré, surlignage, alerte — le contraste est déjà garanti |
| **Nuancier libre** | le sélecteur du système, pour une teinte qu’aucun thème ne connaît |

La pastille du nuancier affiche l’arc-en-ciel quand aucune couleur libre n’est
posée, et la couleur choisie ensuite. « Automatique » est mi-thème mi-vide,
« Sans couleur » est barré : on les distingue sans lire l’infobulle.

### Un seul fond

La page ne peint **plus** de motif. C’est `<Background>` de React Flow qui
dessine la grille, donc elle suit le déplacement et le zoom. Deux couches
donnaient deux réseaux de pointillés qui glissaient à des vitesses
différentes — le « double fond » visible dès qu’on bougeait le canevas. La
préférence **Fond du canevas** (pointillé / ligné / quadrillé / uni) choisit
maintenant le motif de `<Background>` lui-même, dans les trois graphes.

**Défaut de couleur = accent du thème.** `NodePaint` et `EdgePaint` sont
**optionnels** : un champ absent suit `var(--accent)`. Changer d’accent recolore
donc la carte entière sans réécrire un nœud ; dès qu’une personne choisit une
couleur, ce choix-là ne bouge plus. Les couleurs proposées sont des **jetons du
thème**, jamais des teintes inventées — le contraste est déjà garanti.

## 12. Hors périmètre, consigné pour plus tard

**« À long terme, nous allons permettre aux agents de manipuler tout Einnote. »**
Ce n’est pas de ce tour. Ce qui est acquis et qui le rendra possible un jour :
tout l’état vit dans des magasins (zustand) sérialisables, les actions du
magasin sont nommées et typées (`addMindNode`, `updateMindEdge`, `addMindNodeAt`,
`connectMindNodes`…), et la synchronisation passe déjà par des RPC
(`push_entities` / `pull_entities`). Un agent n’aurait donc pas à piloter
l’interface : il appellerait les mêmes actions. Ce qui manque est **la
permission**, pas le levier.
