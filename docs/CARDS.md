# Cartes — relief 3D, éventail, et les modes d’affichage du vault

> Ce document précède le code : les maquettes d’abord, puis les décisions, puis
> ce qui a été construit et vérifié.

---

## 1. Recherche : qui propose déjà un carrousel 3D prêt à l’emploi ?

Balayage large, puis filtrage. Ce qui existe réellement aujourd’hui :

| Source | Ce que c’est | Retenu ? |
|---|---|---|
| [Cover Flow (Planès / Ashish Gogula)](https://coverflow.ashishgogula.in/) | Coverflow iOS, physique à ressort, `npx shadcn add …`, MIT, sourcé sur GitHub | **Non** — dépend de Motion + conventions shadcn (`components/ui`), mais notre pile a déjà Framer Motion ; le code est court, l’importer ajouterait une dépendance d’exemple pour 120 lignes |
| [Motion — exemple Coverflow](https://motion.dev/examples/react-carousel-coverflow) | Démo officielle : `useTickerItem` + `useTransform` sur `rotateY` | **Non** — `useTickerItem` appartient à Motion+ (payant), pas à la version libre |
| [Tilted Coverflow (AI Canvas)](https://aicanvas.me/components/tilted-coverflow) | Sept cartes en arc, clic/flèches/clavier, a11y soignée | **Oui, comme référence de comportement** — c’est la même géométrie que l’éventail demandé |
| [Skiper 47](https://skiper-ui.com/v1/skiper47) | Swiper + effet `coverflow` | **Non** — Swiper pèse ~150 ko pour un seul effet |
| [Lightswind 3D Cards Carousel](https://lightswind.com/components/3d-cards-carousel) | Coverflow piloté au scroll | **Non** — composant « pro », non libre |
| [react-coverflow (andyyou)](https://github.com/andyyou/react-coverflow) | Historique, CSS modules | **Non** — plus maintenu (l’auteur cherche un repreneur) |
| [react-responsive-3d-carousel](https://github.com/Byongho96/react-responsive-3d-carousel) | Carrousel cylindrique clé en main | **Non** — impose son CSS, difficile à accorder au papier |

**Décision.** On écrit les deux primitives dans `src/components/ui/` en
suivant l’API fournie, sans dépendance nouvelle autre que `gsap` (déjà
exigée par l’éventail). Framer Motion est déjà là. Aucun paquet de carrousel :
ils imposent tous leur feuille de style, et l’application vit sur un système de
jetons (`--surface`, `--line`, `--accent`) qu’un carrousel tiers ne connaît pas.

**Écart assumé sur les images.** La consigne proposait des photos Unsplash. On
utilise les **24 fonds d’écran déjà livrés** (`public/walls/*.svg`) : ils font
partie de la palette, ils fonctionnent hors ligne, et ils n’ajoutent aucune
requête vers un tiers — ce qui est précisément la promesse de l’application.

---

## 2. Maquettes

### 2.1 Mode « Éventail » — téléphone (390 px)

```
┌──────────────────────────────────────┐
│ ‹  Vault · Économie      ⚙︎  ⊕      │
│                                      │
│          ÉVENTAIL · 12 fiches        │
│                                      │
│      ╱╲    ╱╲   ┌──────┐   ╱╲    ╱╲  │
│     ╱  ╲  ╱  ╲  │ #1A  │  ╱  ╲  ╱  ╲ │
│    ╱ 3 ╲╱ 2  ╲  │ Titre│ ╱ 4  ╲╱ 5  ╲│
│    ╲   ╱╲    ╱  │ corps│ ╲    ╱╲    ╱│
│     ╲ ╱  ╲  ╱   │ … 3 l│  ╲  ╱  ╲  ╱ │
│      ╲╱   ╲╱    └──────┘   ╲╱   ╲╱  │
│                                      │
│        ‹   • • ● • • • •   ›         │
│      Glissez, ou touchez une carte   │
└──────────────────────────────────────┘
  5 cartes visibles (2 de chaque côté)
  carte centrale : 15 rem × 20 rem
```

### 2.2 Mode « Éventail » — bureau (≥ 1024 px)

```
┌────────────┬───────────────────────────────────────────────────────────┐
│ rail 264px │  Vault · Économie        [Pile][Éventail][Relief][Grille] │
│            │                                                           │
│  Notes     │            ╱╲   ╱╲  ┌────────┐  ╱╲   ╱╲                    │
│  Réviser   │           ╱  ╲ ╱  ╲ │  #1A   │ ╱  ╲ ╱  ╲                   │
│  Apprendre │          ╱ 3  ╲╱ 2  ╲│ Titre  │╱ 4  ╲╱ 5  ╲                 │
│            │          ╲    ╱╲    ╱│ corps  │╲    ╱╲    ╱                 │
│  ────────  │           ╲  ╱  ╲  ╱ └────────┘ ╲  ╱  ╲  ╱                  │
│  + Nouvelle│            ╲╱    ╲╱  20 rem×26╲╱    ╲╱                   │
│            │                                                           │
│            │        ‹   • • ● • • • •   ›     [Ouvrir la carte]          │
└────────────┴───────────────────────────────────────────────────────────┘
  7 cartes visibles (3 de chaque côté), l’éventail s’élargit avec la place
```

### 2.3 Mode « Relief » — les deux tailles

```
téléphone                          bureau
┌────────────────────┐            ┌──────────────┬──────────────┬──────────────┐
│ ┌────────┐┌────────┐│            │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │  #1A   ││  #1B   ││            │ │   #1A    │ │ │   #1B    │ │ │   #1C    │ │
│ │ Titre  ││ Titre  ││            │ │  Titre   │ │ │  Titre   │ │ │  Titre   │ │
│ │ corps… ││ corps… ││            │ │  corps   │ │ │  corps   │ │ │  corps   │ │
│ └────────┘└────────┘│            │ └──────────┘ │ └──────────┘ │ └──────────┘ │
│ ┌────────┐┌────────┐│            │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │  #1C   ││  #1D   ││            │ │   #1D    │ │ │   #1E    │ │ │   #1F    │ │
│ └────────┘└────────┘│            │ └──────────┘ │ └──────────┘ │ └──────────┘ │
├────────────────────┤            └──────────────┴──────────────┴──────────────┘
│  2 colonnes        │               3 colonnes, la carte suit le pointeur
│  inclinaison max 8°│               (mobile : appui + glissement)
└────────────────────┘
```

### 2.4 « Studio des cartes » — `/settings/cards`

```
┌──────────────────────────────────────────────┐
│ ‹  Studio des cartes                         │
│  Voir avant d’appliquer. Vos vraies fiches.  │
├──────────────────────────────────────────────┤
│ ① ÉVENTAIL 3D                                │
│    [ éventail vivant, 7 fiches du vault ]   │
│    Glissez · flèches · clavier               │
│    [ Utiliser l’éventail dans mes vaults ]  │
├──────────────────────────────────────────────┤
│ ② RELIEF 3D                                  │
│    [ 3 cartes qui s’inclinent au pointeur ]  │
│    [ Utiliser le relief dans mes vaults ]   │
├──────────────────────────────────────────────┤
│ ③ CARTE IMAGE (démonstration isolée)         │
│    [ carte avec fond, titre, action ]        │
│    Démo : pas branchée sur vos données       │
├──────────────────────────────────────────────┤
│ ④ CARTE DE RÉVISION                          │
│    [ recto d’une carte, inclinaison 6° ]     │
│    [ Ouvrir une révision ]                   │
└──────────────────────────────────────────────┘
```

---

## 3. Décisions

1. **CSS 3D, pas WebGL.** `rotateX/rotateY` + `perspective` suffisent pour une
   inclinaison. Three.js pour une carte qui penche, c’est 600 ko pour un effet
   que le compositeur du navigateur fait gratuitement.
2. **Framer Motion pour l’inclinaison, GSAP pour l’éventail.** L’inclinaison est
   une valeur continue liée au pointeur (ressort) ; l’éventail est une
   chorégraphie de positions (entrée, sortie, survol). Deux outils, deux
   natures de mouvement — comme dans le code fourni.
3. **Toucher.** Une inclinaison qui suit le doigt pendant un défilement casse le
   défilement. Sur mobile, l’inclinaison n’existe **que pendant l’appui**
   (pointer down → move → up), avec un retour au repos au relâchement.
4. **Mouvement réduit.** `data-motion="reduced"` et
   `prefers-reduced-motion` coupent l’animation : l’éventail saute d’une
   position à l’autre, l’inclinaison est désactivée. Un réglage qui ne
   s’applique pas est un mensonge.
5. **Le centre est lisible, les bords sont contextuels.** Dans l’éventail, seule
   la carte centrale affiche son corps en entier ; les voisines montrent code et
   titre. C’est ce qui distingue un carrousel décoratif d’un outil de lecture.
6. **Aucun mode ne remplace les autres.** La pile reste le geste par défaut
   (feuilleter), l’éventail sert à choisir, le relief à comparer, la grille et la
   liste à balayer un vault de 200 fiches.

---

## 4. Ce qui change dans l’application

| Fichier | Rôle |
|---|---|
| `src/components/ui/3d-card.tsx` | `TiltCard` (inclinaison) + `ImageCard3D` (carte à fond, démo) |
| `src/components/ui/card-fan-carousel.tsx` | `CardFan` — éventail GSAP, contenu React libre, clavier, glissement |
| `src/pages/CardStudio.tsx` | `/settings/cards` — le studio, avec application réelle du réglage |
| `src/pages/Zettelkasten.tsx` | modes `fan` et `relief`, et respect de la vue en bureau |
| `src/pages/ReviewSession.tsx` | la carte de révision s’incline (web) et suit le doigt (mobile) |
| `src/lib/cards/fan.ts` | géométrie pure de l’éventail (testée sans navigateur) |
| `src/lib/cards/motion.ts` | « le mouvement est-il coupé ? », en JS et en React |
| `src/components/zettel/ZettelLeaf.tsx` | la fiche réduite à sa feuille (éventail, relief) |
| `src/lib/display.ts` | `DisplayView` accepte `fan` et `relief` |
| `src/components/DisplayMenu.tsx` | icônes des nouveaux modes |
| `src/index.css` | `.fan-stage`, `.fan-card`, `.tilt-*` |

---

## 4 bis. La fiche ouverte : une implémentation, deux surfaces

La fiche de vault existait **deux fois** — une dans la pile du téléphone, une
dans le panneau du bureau — avec des marges, des tailles et des règles de
défilement différentes. C'est ainsi qu'une carte « mal codée » apparaît : sur
un appareil le contenu pousse le pied de carte hors du cadre et les cartes de
derrière dépassent sous la pagination ; sur l'autre, la même fiche est courte
et laisse deux rectangles vides.

Désormais, un seul composant : `src/components/zettel/ZettelSheet.tsx`.

| Règle | Où elle vit |
|---|---|
| La fiche remplit **exactement** le cadre qu'on lui donne | `.zettel-stack-card { height: var(--stack-h) }`, `ZettelSheet` en `flex min-h-0 flex-col` + `flex-1` |
| L'en-tête, les renvois et le pied ne bougent pas | `shrink-0` sur le pied, `header` hors de la zone qui défile |
| Seul le corps défile | `data-part="body"` : `min-h-0 flex-1 overflow-y-auto` |
| Le titre est borné à trois lignes, texte complet en `title` | `line-clamp-3` + `title={card.title}` |
| Les renvois passent à la ligne au lieu de déborder | `flex flex-wrap`, `truncate` par renvoi |
| La cadre a une hauteur **calculée**, jamais un `h-[500px]` | `--stack-h: clamp(320px, calc(100dvh - 320px), 540px)` puis deux paliers (`min-height: 780px`, `min-width: 720px`) |
| La tranche des cartes de derrière est réservée | `--stack-peek: 22px`, ajouté à la hauteur du cadre |

Ce que chaque surface ajoute, et qui reste local :

- **téléphone** : `counter` (« 3 / 12 ») dans l'en-tête et un `footer`
  (« Glissez pour feuilleter » + Modifier) ;
- **bureau** : `actions` dans l'en-tête (Modifier, Situer), la liste des fiches
  à gauche et le panneau de lecture à droite.

Tests : `src/test/cards.test.tsx`, bloc « Fiche de vault, une seule
implémentation » — une seule fiche dans le DOM, cadre borné, corps seul
défilant, actions du bureau dans l'en-tête, et une relecture de `index.css`
qui échoue si la hauteur du cadre redevient un nombre de pixels en dur.

## 5. Vérification

| Contrôle | Résultat |
|---|---|
| Suite complète | **351 tests / 32 fichiers**, tous verts |
| Géométrie de l’éventail | 12 tests (centre à l’échelle 1, symétrie, bornes, 7 vs 5 cartes, rotation circulaire) |
| Modes du vault + studio | 8 tests d’écran (éventail mobile et bureau, ouverture dans la pile, relief, application du réglage) |
| `tsc -p tsconfig.app.json` | propre |
| `eslint` | 0 erreur (5 avertissements « fast refresh » dus au fait que `components/ui` est ignoré par la configuration du dépôt — ces fichiers sont traités comme du code importé) |
| `vite build` | 3,4 s, `gsap` bien isolé dans son propre morceau de 70 ko |
| Routes HTTP | `/settings/cards`, `/vault/v-eco`, `/review/session` → 200 |

**Coût mesuré du relief.** Le morceau principal passe de 452 à **506 ko gzip**
(+54 ko) parce que Framer Motion entre enfin dans le paquet — la dépendance
était déclarée depuis le début mais aucun composant ne l’importait. Si ce coût
devient gênant, `TiltCard` peut être réécrit en variables CSS (`--tilt-x`,
`--tilt-y`) comme `FlipCard` le fait déjà : même résultat visuel, zéro
dépendance. C’est un échange explicite, pas un oubli.

**Non vérifié, et il faut le dire :**

- **aucune capture d’écran** — Chromium ne démarre pas dans cet environnement
  (`libnspr4.so` absent, aucun miroir de paquets joignable). Le rendu 3D a été
  vérifié par la géométrie et par le DOM, jamais par l’œil ;
- **le toucher réel** — jsdom n’a pas de `PointerEvent` avec pression ni de
  défilement inertiel : l’inclinaison pendant l’appui et le glissement de
  l’éventail demandent un vrai téléphone ;
- **le survol** sur un pointeur fin, pour la même raison.
