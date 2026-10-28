# Engram — structure du design

Ce document décrit **comment le thème est construit**, pas à quoi il ressemble.
Objectif : qu’une personne puisse ajouter un écran, un accent ou un composant
sans casser la cohérence ni l’accessibilité.

## 1. Trois couches, une seule direction

```
primitives          sémantique                 composants
#F6F1E7        →    --bg, --surface…      →    .btn-primary, .row, .field
#0F766E        →    --accent, --accent-soft
```

Règles non négociables :

1. **Aucune couleur en dur dans un composant.** On lit une variable ; les
   valeurs vivent dans `src/index.css` (`@layer base`) et nulle part ailleurs.
2. **Aucune opacité Tailwind sur une variable** (`bg-accent/20`). Tailwind ne
   sait pas décomposer `var(--accent)` : l’utilitaire est silencieusement
   ignoré. Pour une teinte, on utilise `color-mix()` dans une classe dédiée
   (`.mark-highlight`, `.glass`) ou une variable dédiée (`--accent-soft`).
3. **Un composant ne choisit pas sa couleur d’état** : les états sont couverts
   par les primitives (`--ink`, `--muted`, `--line`, `--line-strong`).

## 2. Accent : un choix, quatre variables

| Variable | Rôle | Où elle apparaît |
| --- | --- | --- |
| `--accent` | action, focus, lien, badge | boutons pleins, soulignements |
| `--accent-soft` | fond teinté | pastilles, sections « à revoir », sélection |
| `--accent-ink` | texte sur fond teinté | titres de section, liens sur soft |
| `--on-accent` | texte posé sur `--accent` | libellés des boutons pleins |

### Presets

Huit presets (`teal`, **`indigo` « Indigo Gemini »**, `blue`, `violet`,
`green`, `terracotta`, `plum`, `graphite`) sont écrits en CSS, un bloc clair +
un bloc sombre. La source unique des valeurs est `src/lib/accents.ts` ;
`src/lib/accents.test.ts` lit `src/index.css` et échoue si les deux divergent,
ou si un accent tombe sous 4,5:1 sur le fond de page (clair et sombre) ou sur
son propre fond doux.

Indigo Gemini : `#4257D6` (5,23:1 sur papier), `#DEE3FB` doux, `#3B4CC0` encre
(5,53:1 sur le doux), `#A5B4FC` en sombre (8,53:1). Un `#4C6BFA` plus proche du
cyan de Gemini a été écarté : 3,89:1, sous le seuil AA.

### Couleur libre

`settings.accent = "custom"` + `settings.customAccent` déclenchent
`src/lib/accent.ts` :

1. la couleur est convertie en HSL ;
2. `--accent` est décalé par pas de 2 % de luminosité **dans la direction du
   thème** (assombri en clair, éclairci en sombre) jusqu’à 4,5:1 sur `--bg` ;
3. `--accent-soft` est une teinte à saturation contenue (24–52 %) et
   luminosité franche (92 % clair, 20 % sombre) ;
4. `--accent-ink` est recalé jusqu’à 4,5:1 sur `--accent-soft` ;
5. `--on-accent` est blanc ou presque-noir, celui qui contraste le plus.

Les variables sont posées **en style inline sur `<html>`**, donc elles gagnent
sur les règles de preset ; elles sont retirées dès qu’un preset reprend la
main. L’écran Apparence affiche le ratio mesuré (« Texte sur fond : 5,2:1 ·
AA ») et signale une correction éventuelle : l’utilisateur voit la
conséquence, il ne la subit pas.

### Ajouter un preset

1. `src/index.css` : un bloc `:root[data-accent="x"]` et son pendant
   `[data-theme="dark"][data-accent="x"]`.
2. `src/types/index.ts` : ajouter la clé à `AccentKey`.
3. `src/lib/accents.ts` : une entrée dans `ACCENT_PRESETS` — l’écran Apparence
   la lit directement, rien à dupliquer.
4. `src/lib/accents.test.ts` vérifie automatiquement cohérence CSS ↔ TS et
   contraste AA. Les presets `green` et `terracotta` ont dû être assombris
   (`#14753A`, `#A94B24`) parce que les teintes d’origine tombaient à 4,45:1 et
   4,43:1 : le test a trouvé un défaut réel, il n’a pas été assoupli.

## 3. Typographie

- **Literata** : titres, notes, contenu éditorial. **Inter** : interface.
- Corps de note : `17 px / 28 px` par défaut, réglable de 14 à 22 px
  (`--note-size`, `--note-leading` reste fixe pour garder le rythme).
- Échelle d’interface réellement utilisée : 11, 11.5, 12, 12.5, 13, 13.5,
  14, 15, 16, 17, 18, 19, 22, 26, 28, 30.
- Interlignes appariés : 18/13.5, 21/14, 24/16, 28/17, 32/26, 36/30.
- Les chiffres alignés (compteurs, intervalles) passent en `tabular-nums`.

## 4. Espace, rayons, élévation

- Pas de 4 px ; gouttière d’écran 20 px (mobile) / 32 px (bureau).
- Rayons : 10 px (outil), 12 px (champ), 16–20 px (carte), 28 px (feuille).
- Trois ombres seulement : `--shadow-card` (posé), `--shadow-float` (au-dessus
  du papier), `--shadow-lift` (feuille, barre contextuelle).

## 5. Mouvement

150 ms (couleur, opacité), 220 ms (apparition de feuille), 300 ms
(transitions de mise en page). `[data-motion="reduced"]` neutralise les
animations non essentielles ; le respect de `prefers-reduced-motion` est déjà
branché dans `applySettingsToDom`.

## 6. Mise en page

| Contexte | Largeur | Navigation |
| --- | --- | --- |
| Téléphone (< 768 px) | 440 px (`--screen-max`) | barre d’onglets basse |
| Tablette (768–1023 px) | 720 px (`--screen-max`) | rail compact 88 px, icônes seules |
| Bureau (≥ 1024 px) | 720 px lecture · 1060 px listes · 620 px réglages | rail fixe 264 px, libellés |

- Une seule variable décide de la largeur : `--screen-max`, surchargée par
  `.screen-wide` / `.screen-narrow`.
- Les barres flottantes (`.dock`) se recadrent sur `--rail`.
- Deux seuils, deux rôles : `useRail()` (« y a-t-il une navigation latérale ? »,
  768 px) et `useIsDesktop()` (« y a-t-il la place pour deux panneaux ? »,
  1024 px). Le rail et la barre basse ne coexistent jamais : la barre basse
  rend `null` dès que `useRail()` est vrai.
- **La forme du rail suit la largeur réelle**, pas la préférence
  (`useCompactRail()`, qui ignore le forçage) : le CSS dimensionne le rail par
  media query, donc un « bureau » forcé à 820 px reste en icônes. Sans cela, des
  libellés se retrouvaient dans 88 px.
- Le forçage (`?bureau=1`, `?mobile=1`, réglage « Mise en page ») pose
  `data-layout` sur `<html>` ; le CSS suit (`[data-layout="mobile"]` retire le
  rail, remet la barre basse, ramène `--screen-max` à 440 px). Il **ne crée pas
  de largeur** : à 390 px, `?bureau=1` ne fabrique ni rail ni deux panneaux.

## 6 bis. Personnalisation avancée : chaque attribut pilote du CSS

Le réglage n’est pas un thème de plus : il change des attributs sur `<html>`
(`data-density`, `data-radius`, `data-borders`, `data-elevation`, `data-paper`)
et trois variables continues. Aucun contrôle n’est décoratif.

| Réglage | Écrit | Effet mesurable |
| --- | --- | --- |
| Densité | `data-density` | `--pad-screen`, `--pad-card` (14 / 20 / 26 px) |
| Rayons | `data-radius` | `--r-rect/field/card/sheet` → jetons Tailwind |
| Bordures | `data-borders` | couleur de `--line` (45 % → `--line-strong`) |
| Relief | `data-elevation` | `--shadow-*`, `--elev-card` (aucune → 34 px) |
| Papier | `data-paper` | `--bg`, `--surface`, `--surface-2`, `--line` — **calculés en JS** |
| Interligne | `--note-leading` | hauteur de ligne des notes (20–38 px) |
| Largeur de lecture | `--reading-width` | `.note-column` (520–980 px) |
| Force du canevas | `--canvas-strength` | opacité du pointillé/lignes (0–100 %) |
| Fond | `data-wall` | monte `.wall-layer` et rend `.screen`, `.bg-surface`, `.rail` translucides |
| Flou du fond | `--wall-blur` | 18–48 px (voir `docs/WALLS.md`) |
| Voile | `--wall-dim` | 0–1, ramené dans la bande lisible du couple (thème, fond) |
| Accent | `--accent` recalculé | dérivé **sur la couleur réelle du verre**, pas sur le papier |
| Accent du fond | `--primary`, `--ring`, `--accent`, `--accent-2`, `--on-accent`, `--tint` | lus dans l’image (canvas 48 × 48), corrigés jusqu’à AA, **animés 0,8 s** (`@property <color>`) — voir `docs/PRESENTATION.md` §7 |

**Le papier et les traits ne sont plus écrits en CSS.** Ils l’étaient
(`:root[data-paper="ivory"] { --bg: … }`) alors que la palette pose les mêmes
variables en style en ligne : le style en ligne gagnait, donc ces deux réglages
ne faisaient rien. Ils se calculent maintenant dans `src/lib/presentation.ts`,
qui est la **seule** source de vérité de l’apparence (registre des contrôles,
teintes, traits, variables DOM). Un test interdit d’y ajouter un contrôle sans
effet. Détail : `docs/PRESENTATION.md`.

La barre de note de l’éditeur (taille, interligne, largeur, papier) écrit les
mêmes valeurs : une seule source, donc aucun risque de divergence.

Le fond « verre » suit la même règle : le réglage écrit des variables, le CSS
décide de l’apparence, et `src/lib/glass.ts` calcule les bornes au lieu de les
supposer. Détail complet : `docs/WALLS.md`.

## 6 quater. Thèmes extérieurs : ce qu’on prend, ce qu’on refuse

Des registres de thèmes existent (tweakcn, presets shadcn, colorswitchcn,
`@madooei/shadcn-theme-presets`). **Décision : on ne les importe pas.**

| Ce qu’ils vendent | Pourquoi ce n’est pas notre forme |
| --- | --- |
| Un `components.json` + des composants shadcn | Le projet n’en a aucun : les primitives sont écrites ici, avec Radix et TipTap. Importer le registre remplacerait nos composants, pas nos couleurs. |
| Des jetons `--background`, `--primary`, `--ring` en HSL ou oklch | Nos jetons sont des hex consommés par le verre (`--bg`, `--surface`, `--ink`, `--accent`) et **dérivés** par `src/lib/accent.ts` sur la couleur réelle du fond. Un `--primary` opaque ne sait pas s’éclaircir sur un voile sombre. |
| Un thème par `class="dark"` | Nous avons `data-theme` + 24 fonds + 12 papiers + accents dérivés : un seul attribut ne suffit pas. |
| Des dégradés prêts | La règle tient : les dégradés viennent des deux générateurs fournis, avec des arrêts calculés, pas choisis à l’œil. |

Ce qui est **déjà** en place et joue le même rôle : le bloc `compat shadcn/ui`
(§2) expose nos valeurs en HSL pour un composant shadcn éventuel, et
`applySettingsToDom()` recalcule accents et voiles à chaque changement. Un
import de thème tiendrait en une fonction `importTheme(css)` qui lirait
`--primary` / `--background`, convertirait en hex, puis appellerait
`deriveAccent()` — utile, mais **ce n’est pas ce qui manque aujourd’hui**.

## 6 ter. Maquette du bureau (avant implémentation)

```
┌───────────────┬───────────────────────────────────────────────────────────┐
│ É Engram  ☾   │  ← rail 264 px, fixe                 colonne 720–1060 px │
│               │                                                          │
│ [+ Nouvelle note]                                                         │
│               │  Bibliothèque                                            │
│ PROJETS   ⚙︎   │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│ • Tous        │  │ Cornell       │ │ Carte mentale │ │ Zettel        │  │
│ • Mes notes 4 │  └───────────────┘ └───────────────┘ └───────────────┘  │
│ • Thèse    3  │                                                          │
│               │  ┌─────────────────────────────────────────────────────┐ │
│ ESPACE        │  │ Il y a 8 jours — « Sauver » (rappel de sauvegarde)  │ │
│ • Notes       │  └─────────────────────────────────────────────────────┘ │
│ • Réviser  7  │                                                          │
│ • Apprendre   │                                                          │
│               │                                                          │
│ RÉGLAGES      │                                                          │
│ • Apparence   │                                                          │
│ • Aperçu      │                                                          │
│ • Données     │                                                          │
│               │                                                          │
│ ┌───────────┐ │                                                          │
│ │ 7 cartes  │ │                                                          │
│ │ à revoir  │ │                                                          │
│ └───────────┘ │                                                          │
└───────────────┴───────────────────────────────────────────────────────────┘
   Mobile : mêmes écrans, une colonne 440 px, onglets bas, compositeur
   d’édition collé au-dessus du clavier (voir §7).
```

La page `/preview` sert cette maquette **vivante** : deux iframes réelles côte
à côte (390 × 844 et 1280 × 800), la seconde mise à l’échelle pour tenir dans
la largeur. Ce ne sont pas des captures, et ce n’est **pas** la version bureau :
c’est une planche de comparaison. La version bureau, elle, est l’application
elle-même à sa largeur réelle — rail dès `min-width: 768px`, deux panneaux dès
`min-width: 1024px`. Aucune enveloppe, aucun `transform: scale()` dans
l’application.

## 7. Éditeur : grammaire visuelle

- **Compositeur** : sous 1024 px, la barre d’outils et la barre de
  personnalisation de note sont fixées en bas, au-dessus du clavier ; au-delà,
  le compositeur remonte et devient collant sous l’en-tête. Ordre visuel :
  barre de note au-dessus de la barre d’outils sur mobile, l’inverse sur
  bureau (`flex-direction: column-reverse` / `column`).
- Le clavier est mesuré par `visualViewport` (`--kb`), pas supposé : les barres
  restent collées au-dessus, y compris sur iOS où la fenêtre ne se redimensionne
  pas.
- Groupes de la barre d’outils, dans cet ordre : historique · structure ·
  marques · retrait.
- État actif : fond `--accent-soft`, texte `--accent-ink`, icône `bold`.
- Sur sélection : barre contextuelle sombre en bas, une action principale
  (« Créer une question ») + trois raccourcis.
- Gouttière : les questions sont des pastilles rondes alignées à gauche de
  leur bloc, jamais dans le flux du texte.
- Le menu « / » n’apparaît que dans un paragraphe vide commençant par « / ».

## 8. Contrat d’accessibilité

- Cibles tactiles ≥ 44 px pour toute action primaire.
- Chaque icône seule possède un `aria-label` ; les icônes décoratives sont
  `aria-hidden`.
- Les états ne reposent jamais sur la seule couleur : le libellé change
  (« À revoir »), les compteurs sont chiffrés, les puces actives sont cochées.
- Contraste de l’accent : mesuré et corrigé (voir §2). Le reste de la palette
  respecte les valeurs du cahier des charges mais **n’a pas encore d’audit
  automatisé** — c’est un trou assumé, listé dans `docs/ROADMAP.md`.

## 9. Ce qui reste ouvert

1. **Audit de contraste complet** (texte `--muted` sur `--surface`, états
   désactivés, mode contraste élevé) : les valeurs sont choisies à la main,
   rien ne les empêche de dériver.
2. **Piège de focus** dans `Sheet` : Échap et clic extérieur sont gérés, mais
   le focus n’est pas encore enfermé dans la feuille.
3. **Densité** : trois niveaux existent (`compact`/`regular`/`airy`) mais
   seules les marges et les cartes les suivent ; les hauteurs de ligne et la
   taille des libellés ne sont pas encore concernées.
4. **Échelle de titres** : l’éditeur n’offre que H1/H2 ; H3 existe dans le
   modèle (`kind`) mais pas dans la barre d’outils.
