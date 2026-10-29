# Méta-prompt — faire passer une interface Einnote du mobile au web

**Comment s'en servir.** Colle tout ce qui suit la ligne `▼ DÉBUT DU PROMPT`
dans ton agent de codage, dans un dépôt où l'interface mobile existe déjà. Si
l'agent a accès au dépôt, donne-lui aussi les cinq fichiers de référence cités
au § 1.3 : ils portent les valeurs exactes, et ce prompt n'a pas à les répéter.

---

▼ DÉBUT DU PROMPT

## 0. Contrat d'exécution (à appliquer sans le réciter)

Tu vas faire passer une interface **pensée pour le téléphone** à une **vraie
version web**, sans la trahir. Ce n'est pas « ajouter une barre latérale » :
c'est écrire une mise en page de poste de travail qui garde l'identité visuelle
du produit.

Pour toute tâche substantielle, applique ce protocole, proportionné à l'enjeu :

1. **Vise le résultat derrière la demande.** « Une sidebar » veut dire : la
   place disponible est utilisée, deux ou trois zones se lisent à la fois, et
   les commandes sont atteignables. Une barre latérale posée sur une colonne de
   720 px au milieu d'un écran de 1440 px ne répond pas à la demande.
2. **Travaille avec les moyens d'un expert.** Lis le code réel avant de
   dessiner (`grep`, pas un résumé), mesure les contrastes au lieu de les
   estimer, écris un fil de fer avant le composant, vérifie par une commande.
3. **Ne mobilise une autre discipline que si elle améliore le résultat.**
   Typographie, colorimétrie et accessibilité en font partie ; le reste est du
   bruit.
4. **Fixe un critère de réussite observable** et vérifie-le par une preuve
   indépendante (sortie de commande, test qui lit la feuille de style, calcul de
   ratio). Un « c'est fait » sans sortie de commande ne vaut rien.
5. **Distingue faits, hypothèses, incertitudes.** N'invente jamais une source,
   un chiffre, un test ni une capacité. Si une donnée manque (une police, une
   image, un accès), dis-le et avance avec ce que tu as.
6. **Préserve les contraintes du produit.** Ce qui est listé au § 8 est un
   contrat, pas une préférence.
7. **Cherche plus profond, pas plus grand.** Une couche d'abstraction qui
   supprime trois duplications vaut mieux que trois écrans de plus.

Tout ce qui est visible est **en français**. Le produit s'appelle **Einnote**.
Aucun vocabulaire de genre dans les libellés (« Atelier », « Nuit douce »,
« Papier calme » — jamais « féminin »/« masculin »).

---

## 1. Le point de départ

### 1.1 Le produit

Einnote est une application de notes qui servent à **apprendre** : méthodes
d'écriture (Cornell, plan, zettelkasten, tableau blanc), questions ancrées dans
le texte, cartes de révision, graphes. L'identité visuelle est celle d'un
**papier calme** : un fond chaud (jamais blanc pur), une encre douce, un accent
unique, deux familles de caractères, des formes tenues, aucun effet décoratif.

### 1.2 La stack (versions réelles du dépôt)

| Paquet | Version | Rôle |
| --- | --- | --- |
| React | 19 | interface |
| TypeScript | 5.8, `strict` | tout |
| Vite | 8 | build (`vite.config.ts` porte `port: 8080` — la prévisualisation exige `--port` explicite) |
| Tailwind | 3.4.17 | utilitaires, **jetons mappés** (voir § 3) |
| zustand | 5.0 | état sérialisable, `persist` |
| Quill | 2.0.3 | éditeur de texte (sans sa barre d'outils) |
| `@xyflow/react` | 12.12 | canevas, graphes |
| `@phosphor-icons/react` | 2.1 | **toutes** les icônes |
| `@fontsource/literata`, `@fontsource-variable/inter` | 5.3 | contenu / mobilier |
| `ts-fsrs` | 5.4 | révision espacée |
| Vitest + Testing Library + jsdom | — | tests |

Gestionnaire de paquets : **pnpm** (`pnpm-lock.yaml`). `npm install` casse le
dépôt.

### 1.3 Les fichiers de référence (à lire avant d'écrire une ligne)

| Fichier | Ce qu'il porte |
| --- | --- |
| `DESIGN.md` (racine) | le contrat déclaré : jetons, typographie, rayons, ombres, mise en page, interdits |
| `docs/DESIGN.md` | comment le thème est construit : presets, accent libre, règles de contraste |
| `docs/PRESENTATION.md` | les **cinq couches** d'apparence et l'accent tiré de l'image |
| `docs/WALLS.md` | les 34 fonds, les signatures, le moteur du verre |
| `docs/DESKTOP.md` | la mise en page de bureau déjà arbitrée (rail, feuilles, colonnes) |
| `docs/EDITOR-LAYOUT.md` | la page de texte : une seule barre, le côté des questions |
| `src/index.css` | **la seule source des couleurs** (`@layer base`) et du verre |
| `src/lib/themes.ts` | 23 palettes + dérivation des 16 jetons, avec corrections AA |
| `src/lib/composition.ts` | les cinq couches, décrites une fois pour toutes |

---

## 2. La loi des jetons — aucune couleur en dur, jamais

Tout composant lit une variable. Les valeurs vivent dans `src/index.css`
(`@layer base`). Une couleur écrite en dur dans un `.tsx` est un défaut de
livraison.

| Jeton | Clair | Sombre | Rôle |
| --- | --- | --- | --- |
| `--bg` | `#f6f1e7` | `#1e1c19` | le papier, jamais blanc pur |
| `--bg-outside` | `#ece4d4` | `#15130f` | derrière les fenêtres flottantes |
| `--surface` | `#fffdf8` | `#27241f` | cartes, feuilles, fenêtres |
| `--surface-2` | `#efe8d8` | `#312d26` | surface seconde, champ au repos |
| `--line` | `#e4dccb` | `#3a352c` | séparateurs |
| `--line-strong` | `#c9bfa8` | `#4c463a` | survol, contour de champ |
| `--ink` | `#2b2a27` | `#f1ece1` | texte |
| `--muted` | `#6b6659` | `#a8a193` | texte secondaire |
| `--accent` | `#0f766e` | calculé | action, focus, lien, badge |
| `--accent-soft` | `#d9eeea` | calculé | fond teinté, sélection |
| `--accent-ink` | `#0b5c56` | calculé | texte sur fond teinté |
| `--on-accent` | `#ffffff` | calculé | texte posé sur l'accent |
| `--danger` | `#b3261e` | `#f2b8b5` | erreur, suppression |
| `--highlight` | `#f6e3a1` | `#e0af68` | surlignage |

**Exigence : ≥ 4,5:1 pour tout texte, ≥ 3:1 pour un élément d'interface non
textuel.** Ce n'est pas une intention, c'est un calcul (WCAG, luminance
relative) — et il est vérifié par un test qui recalcule tous les ratios.

### 2.1 Le fondu de 0,8 s (et pourquoi `@property`)

Une variable CSS ordinaire ne s'anime pas : le navigateur la traite comme du
texte. Déclarée avec un type, elle s'interpole, donc changer de thème devient un
fondu au lieu d'un saut.

```css
@property --accent {
  syntax: "<color>";
  inherits: true;
  initial-value: #0f766e;
}

:root {
  transition:
    --primary 800ms cubic-bezier(0.22, 0.61, 0.36, 1),
    --ring 800ms cubic-bezier(0.22, 0.61, 0.36, 1),
    --accent 800ms cubic-bezier(0.22, 0.61, 0.36, 1),
    --on-accent 800ms cubic-bezier(0.22, 0.61, 0.36, 1),
    --tint 800ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

:root[data-motion="reduced"] {
  transition: none;
}
```

Sept variables exactement : `--primary`, `--primary-foreground`, `--ring`,
`--accent`, `--accent-2`, `--on-accent`, `--tint`. **On n'anime pas `--bg` ni
`--ink`** : animer le fond ferait clignoter toute la page à chaque frappe dans
les réglages.

Conséquence de format : les jetons sont de **vraies couleurs** (`#0F766E`), pas
des triplets HSL. C'est ce qui les rend animables, mélangeables
(`color-mix`) et testables.

### 2.2 L'opacité Tailwind sur une variable — le piège

`bg-accent/20` **ne fait rien** sur `var(--accent)` : Tailwind ne sait pas
décomposer une variable. Il faut lui donner la fonction qui fabrique l'alpha :

```ts
// tailwind.config.ts
const alpha = (token: string) =>
  `color-mix(in srgb, ${token} calc(<alpha-value> * 100%), transparent)`;

colors: {
  bg: "var(--bg)",
  surface: "var(--surface)",
  "surface-2": "var(--surface-2)",
  line: "var(--line)",
  ink: "var(--ink)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  "accent-soft": "var(--accent-soft)",
  "accent-ink": "var(--accent-ink)",
  "on-accent": "var(--on-accent)",
  danger: "var(--danger)",
  highlight: "var(--highlight)",
  card: { DEFAULT: alpha("var(--card)"), foreground: alpha("var(--card-foreground)") },
  // …
}
```

Sans cela, `bg-card/40` disparaît **silencieusement** du CSS produit — vérifié :
aucune règle générée. C'est le genre de défaut qu'on ne voit pas en relisant le
code, seulement en inspectant le fichier construit.

### 2.3 Échelle : rayons, ombres, typographie, espace

| Rayon | Valeur | Usage |
| --- | --- | --- |
| `--r-rect` | 12 px | bouton d'outil, bouton de barre |
| `--r-field` | 14 px | champ, pastille |
| `--r-card` | 18 px | carte, fenêtre |
| `--r-sheet` | 24 px | feuille, palette, fiche |

Trois ombres, pas quatre : `--shadow-card` (posé), `--shadow-float` (au-dessus
du papier), `--shadow-lift` (feuille, barre contextuelle). Aucune ombre colorée,
aucun halo.

Deux faces, deux rôles, écrites nulle part ailleurs que dans les jetons :
`--font-ui` = **Inter** (mobilier : barres, listes, formulaires), `--font-note`
= **Literata** (contenu : notes, titres, citations). Corps de note
`17 px / 28 px`, réglable de 14 à 22. Échelle d'interface : 11 · 12 · 13 · 14 ·
15 · 16 · 17 · 18 · 22 · 26 · 30 ; interlignes appariés 18/13.5 · 21/14 · 24/16 ·
28/17 · 32/26 · 36/30. Chiffres alignés (`tabular-nums`) sur **tout** compteur.

Pas d'espace : 4 px. Gouttière : 20 px (téléphone), 32 px (bureau).

---

## 3. Le cœur : cinq couches — et pourquoi changer une palette change tout

C'est le point que la plupart des implémentations ratent. Un thème n'est pas
**la** décision : c'est la **première** couche d'une pile de cinq. Les quatre
autres s'appliquent après, et peuvent encore tout déplacer — y compris le fond.

| # | Couche | Action sur la précédente | Jetons qu'elle écrit | Choix |
| --- | --- | --- | --- | --- |
| 1 | **Palette** | socle | `--bg` `--surface` `--surface-2` `--ink` `--muted` `--line` `--accent` | 23 |
| 2 | **Fond** | se superpose | `--tint` `--wall-blur` `--wall-dim` | 34 |
| 3 | **Accent** | **écrase** l'accent du socle | `--accent` `--primary` `--ring` `--on-accent` `--accent-soft` `--accent-ink` | 8 presets + libre + tiré du fond |
| 4 | **Formes** | géométrie seule, aucune couleur | `--r-card` `--pad-screen` `--line` `--elev-card` | 4 × 3 |
| 5 | **Texte** | typographie seule | `--font-note` `--note-size` `--note-leading` `--reading-width` | 4 |

Deux invariants, exécutables :

- **rien n'est définitif** — chaque couche reste modifiable après coup ;
- **les couches ne se contredisent pas** — les formes ne touchent jamais aux
  couleurs, la typographie jamais aux formes. Un test change une couche et
  vérifie que les quatre autres résumés n'ont pas bougé.

### 3.1 L'ordre exact du calcul

Tout se calcule **en JavaScript**, une fois, et s'écrit en **style en ligne** sur
`<html>`. Pas de règle CSS `[data-paper="ivory"] { --bg: … }` : le style en
ligne gagnerait de toute façon, et le réglage deviendrait silencieusement
inopérant. Un réglage qui ne change rien est pire qu'un réglage absent.

```
palette (23)  →  buildTheme()  →  16 jetons + corrections AA
              →  tintTokens()      (teinte de papier : fonds seulement)
              →  borderTokens()    (contraste des traits)
              →  accent          : image > couleur libre > preset > palette
              →  <html style="--bg: …"> + data-theme / data-palette / data-wall
```

Extrait condensé du vrai code (`src/stores/useAppStore.ts`) :

```ts
export function applySettingsToDom(settings: AppSettings) {
  const root = document.documentElement;
  const palette = paletteByKey(settings.paletteKey);
  const resolved = effectiveMode(settings);          // une palette EST claire ou sombre
  root.dataset.theme = resolved;
  root.dataset.palette = palette.key;

  /* 1. la palette pose les jetons neutres, la présentation les déplace */
  const ui = settings.personalization ?? DEFAULT_PERSONALIZATION;
  const tokens = presentTokens(tokensFor(palette.key), ui);
  for (const [name, value] of Object.entries(themeVars(tokens))) {
    root.style.setProperty(name, value);
  }

  /* 2. le fond réel sous le texte : papier du thème, ou verre */
  const wall = wallById(settings.wallpaper);
  const wallTone = wall ? toRgb(wall.tone) : null;
  const veil = wallTone ? effectiveVeil(settings.wallDim, tokens, wallTone) : settings.wallDim;
  const reference = wallTone ? glassColor(...) : tokens.bg;   // l'accent se mesure sur le verre réel

  /* 3. l'accent, par ordre de priorité */
  const wallColors = settings.dynamicAccent && wall ? useWallColors.getState().colors : null;
  if (wallColors) applyWallColors(root, wallColors, resolved);
  else if (mode === "custom") root.style.setProperty("--accent", deriveAccent(...).accent);
  else if (mode === "preset") /* preset clair ou sombre */;

  root.dataset.wall = settings.wallpaper ?? "none";
  root.style.setProperty("--wall-dim", String(veil / 100));
}
```

Trois conséquences à ne pas perdre :

1. **Une palette choisie change aussi le fond visible.** Elle change `--bg`,
   donc la couleur de la couche « écran » ; si un fond image est actif, elle
   change la **teinte du verre** et le voile calculé. Ce n'est pas un effet : le
   verre est un mélange de `--bg` et de la couleur moyenne de l'image.
2. **Changer de palette change le mode.** Une palette est intrinsèquement claire
   ou sombre ; elle gagne sur le mode global. Sinon « Latte » deviendrait sombre
   sur un système en sombre, ce qui est un mensonge à l'écran.
3. **L'accent ne dépend pas que du thème.** Il se mesure contre le fond réel
   (verre compris) et se décale jusqu'à passer AA. C'est ce qui permet de poser
   une image sombre sous un thème clair sans perdre un seul libellé.

### 3.2 La dérivation des 16 jetons (palette → produit)

Chaque palette ne déclare que six à neuf valeurs (`bg`, `surface`, `ink`,
`muted`, `accent`, `red`, `gold`, `line`, `surface2`). Le reste est **dérivé**,
puis corrigé :

- encre visée 7:1 (AAA), minimum 4,5:1 sur le fond **et** sur la surface ;
- texte secondaire 4,5:1 sur les deux ;
- accent 4,5:1 sur les deux, sans perdre la teinte d'origine (décalage par pas
  de luminosité, jamais par rotation de teinte) ;
- `--accent-soft` : teinte de l'accent, saturation bridée (≤ 48 % clair,
  ≤ 34 % sombre), luminosité poussée vers le papier — puis `--accent-ink`
  recalculé contre ce fond-là ;
- `--on-accent` : noir ou blanc, au ratio (le pire cas des deux atteint ~4,58) ;
- `--highlight` : éclairci vers le blanc (clair) ou vers le papier (sombre)
  jusqu'à 4,5:1 avec l'encre, et **jamais au-delà** — la couleur reste
  reconnaissable ;
- `--line` : jamais décoratif seul, il doit se voir (≈ 1,2:1).

Chaque correction est **enregistrée** (`adjustments: { token, from, to, ratio }`)
pour qu'on puisse expliquer un écart au lieu de le cacher. Exemple réel : un
vert `#15803D` tombait à 4,45:1 sur le papier — sous le seuil. Il est servi
`#14753A`. Une teinte officielle illisible n'est jamais servie telle quelle.

---

## 4. Les thèmes : palettes, dégradés, images

### 4.1 23 palettes, chacune avec sa source et sa licence

Familles : **Einnote** (papier, papier nuit), **Atelier** (lilas, pêche, sauge,
menthe, argile, acier…), **Catppuccin**, **Nord**, **Gruvbox**, **Solarized**,
**Rose Pine**, **Tokyo Night**, **Everforest**, **Material**, **Radix**. Chaque
entrée porte `source: { url, license }` — les couleurs viennent du dépôt de
l'auteur, pas d'une capture ni d'un souvenir. Une palette peut déclarer sa
**jumelle** (`sibling`) pour que le bouton clair↔sombre reste dans le même
univers.

### 4.2 Dégradés : cinq arrêts, explicites

Un dégradé de fond n'est pas une rampe à deux couleurs (elle vire au gris au
milieu) : ce sont **cinq arrêts** (0/25/50/75/100 %) interpolés entre des teintes
choisies à la main, sans vignette — une vignette fausserait la couleur moyenne
dont dépend le calcul de lisibilité. Trois clairs (Aube, Lagune, Miel), trois
sombres (Crépuscule, Braise de nuit, Velours).

### 4.3 Images : le `tone` se mesure, la palette se prouve

Dix photographies (PNG 1280 px, livrées avec le dépôt) et vingt-quatre fonds
SVG générés (`scripts/make-walls.py`, régénérables à l'identique, zéro dette de
licence photo). Chaque fond porte :

- `mode` — clair ou sombre, et il le dit (poser un fond sombre sur un thème
  clair exige un voile si épais que l'image disparaît : mesuré à 89 %) ;
- `tone` — la couleur **moyenne réelle**, mesurée sur les pixels par
  `scripts/normalize-walls.mjs`, jamais estimée à l'œil ;
- `palette` — la palette qui **garde AA sur ce verre**. Pour les photos, ce
  n'est pas un goût : c'est la seule qui passe le test.

Cliquer une vignette applique **le fond et sa palette**. C'est la règle qui rend
le réglage utilisable : sans elle, l'utilisateur pose une image et hérite d'un
voile qui l'efface.

### 4.4 L'accent tiré de l'image (le geste qui fait « tout change »)

Un canvas **48 × 48** (2 304 échantillons, une lecture instantanée), un
algorithme écrit sur place — pas `colorthief` (il exige une `<img>` **et** un
`<canvas>` : il refait ce qu'on fait, en ajoutant une dépendance et en privant du
test), pas `node-vibrant` (il traîne des paquets Node côté navigateur et impose
sa notion de « Vibrant » au lieu de l'exigence WCAG).

Il rend **toujours trois couleurs** : un accent, un second ton (décalé d'au
moins 60° quand l'image le permet), une teinte sombre qui colore le voile. Puis
`deriveAccent` corrige l'accent **contre le verre réel**, et `onAccent` choisit
noir ou blanc au ratio. Mêmes pixels, mêmes couleurs : un fond ne scintille pas
d'un rendu à l'autre.

### 4.5 La recette du verre (chiffres exacts)

```css
/* l'écran laisse passer l'image : 40 % de fond seulement */
:root[data-wall]:not([data-wall="none"]) .screen {
  background: color-mix(in srgb, var(--bg) 40%, transparent);
  backdrop-filter: blur(8px) saturate(1.06);
}

/* une carte : la recette demandée, écrite une seule fois */
:root[data-wall]:not([data-wall="none"]) .bg-surface {
  @apply bg-card/40 backdrop-blur-2xl;   /* 40 px de flou */
  background-image: linear-gradient(
    color-mix(in srgb, var(--tint) 22%, transparent),
    color-mix(in srgb, var(--tint) 22%, transparent)
  );
}

/* la feuille et le champ restent franchement lisibles */
:root[data-wall]:not([data-wall="none"]) .sheet,
:root[data-wall]:not([data-wall="none"]) .field {
  background-color: color-mix(in srgb, var(--surface) 92%, transparent);
  background-image: linear-gradient(
    color-mix(in srgb, var(--tint) 12%, transparent),
    color-mix(in srgb, var(--tint) 12%, transparent)
  );
}
```

Détail qui compte : le voile est posé en `background-image`, pas en
`background-color` — sinon il écrase la couleur de la carte. Trois couches sous
l'interface, aucune n'intercepte le clic : `wall-image` (floutée, `inset: -10 %`,
`scale(1.06)` pour que le flou ne laisse pas de bord), `wall-veil`
(`color-mix(--bg, --wall-dim)`), `wall-grain` (bruit à 3,5 % d'opacité, qui
supprime l'aspect « dégradé numérique »).

Réglages : **flou 2–18 px** (défaut 8) et **voile 0–90 %** (défaut 28). Le voile
n'est pas libre : `effectiveVeil` calcule la **bande** où le texte reste AA
(plancher) **et** où l'image reste perceptible (plafond), puis borne le choix.
Si la bande est étroite, l'écran le dit et propose de changer de palette.

Accessibilité : `[data-transparency="reduced"]` remet du solide partout,
`[data-contrast="high"]` aussi. Le verre est un confort, jamais une condition de
lisibilité.

### 4.6 Les signatures — un clic, un goût complet

Six compositions toutes faites (palette + fond + rayons + densité + bordures) :
**Atelier**, **Verre clair**, **Nuit douce**, **Encre**, **Pierre**, **Sable**.
C'est ce qui manque aux applications « personnalisables » : trente réglages et
personne pour les composer. Une signature est un point de départ, pas une cage —
tout reste modifiable après.

---

## 5. L'iconographie — Phosphor, quatre graisses, un sens par graisse

**Une seule bibliothèque** : `@phosphor-icons/react`. Aucune icône SVG écrite à
la main, aucun jeu mélangé, aucun emoji.

### 5.1 Le poids porte un sens, pas un goût

| Poids | Sens | Où |
| --- | --- | --- |
| `regular` | l'action, au repos | barre d'outils, navigation inactive |
| `fill` | l'état **actif** | entrée de rail courante, onglet sélectionné |
| `duotone` | l'**identité** d'une chose | en-têtes de page, tuiles de carte, bascules de mode, états vides |
| `bold` | le **micro-contrôle** | chevrons, poignées, « ⋯ », pastilles à 13–19 px |

Conséquence : **un état ne se signale jamais seulement par la couleur.** Il se
signale par le poids **et** `aria-pressed` / `aria-current`, avec la couleur en
renfort.

### 5.2 Le style duotone — ce que c'est, et où il a le droit d'aller

Le duotone de Phosphor est un **dessin à deux tons** construit à partir de
`currentColor` : le trait à pleine opacité, la masse à ~20 %. Il ne demande
aucune configuration, ne casse aucun contraste, et suit le jeton de couleur du
parent (donc le thème, donc l'accent).

Règles d'usage, telles qu'appliquées dans le produit :

1. **Identité, jamais action.** On ne met pas une graisse duotone sur un bouton
   de barre d'outils : à 18 px, dans une rangée dense, la masse brouille le
   glyphe et le geste devient ambigu.
2. **Taille d'identité = 20–28 px.** Tuile de carte : 22. En-tête de page : 26–28
   dans un état vide, 16–18 à côté d'un libellé. Bascule de mode : 17 (bureau),
   21 (téléphone).
3. **Un seul duotone par groupe visible.** Deux masses côte à côte redeviennent
   du bruit ; c'est le contraste avec les icônes `regular` voisines qui fait lire
   l'identité.
4. **Couleur** : `text-accent` pour une tuile d'identité active, `text-ink` pour
   une tuile neutre, `text-muted` pour une icône secondaire. Jamais une couleur
   littérale.
5. **Accessibilité** : `aria-hidden` quand le libellé est visible ; sinon
   `aria-label` sur le bouton, jamais sur l'icône seule.

### 5.3 Tailles (échelle réelle)

| Contexte | Taille |
| --- | --- |
| micro-contrôle (chevron, poignée, « ⋯ ») | 13–15 |
| action en ligne, en-tête de section | 16–18 |
| bouton de barre d'outils | 18 |
| entrée de navigation, tuile | 20–22 |
| état vide, illustration d'écran | 26–28 |

### 5.4 Une icône par geste — les doublons interdits

Un signe = un verbe. Les confusions déjà tranchées :

| Signe | Verbe | Ne partage son signe avec rien |
| --- | --- | --- |
| `CopySimple` | dupliquer le bloc | `Copy` = copier |
| `SlidersHorizontal` | plus d'options | `DotsThree` = menu de la fiche |
| `Eraser` | effacer la mise en forme | la croix du surligneur = retirer le surlignage |
| `Columns` / `Rows` | colonne / ligne | `Table` = le tableau entier |
| `Sun` / `Moon` | thème clair / sombre | jamais deux icônes pour un même basculement |

---

## 6. La mise en page web — sidebar, colonnes, feuilles

### 6.1 Les seuils (ils commandent tout le reste)

| Contexte | Largeur | Navigation | Contenu |
| --- | --- | --- | --- |
| Téléphone | < 768 px | barre d'onglets basse, `+` flottant | 440 px |
| Tablette | 768–1023 px | **rail compact 88 px**, icônes seules | 720 px |
| Bureau | ≥ 1024 px | **rail 264 px**, fenêtres flottantes | 720 px lecture · 1060 px listes |
| Large | ≥ 1180 px | idem | un **côté** de 340 px peut s'ajouter au texte |

Règle : **`useIsDesktop()` pour monter, le CSS pour styliser.** Un panneau caché
en CSS reste lu par les lecteurs d'écran et capte le focus.

### 6.2 Le rail (la « sidebar »)

```
┌──────────────┬──────────────────────────────────────────────┐
│ ▣ Einnote    │  en-tête collant, verre, 56 px                │
│ ＋ Nouvelle  │                                              │
│ ─────────────│  contenu : colonne 720 / 1060, centrée        │
│ ⌂ Biblioth.  │                                              │
│ ▤ Espaces    │                                              │
│ ⌸ Cartes     │                                              │
│ ◷ Révisions  │                                              │
│ ─────────────│                                              │
│ ⚙ Réglages   │                                              │
│ ⌨ Raccourcis │                                              │
└──────────────┴──────────────────────────────────────────────┘
     264 px           1fr  (app-main: margin-left: var(--rail))
```

- Largeur pilotée par **une seule variable** : `--rail` (0 / 88 / 264 px), et
  `app-main { margin-left: var(--rail) }`. Rien d'autre ne connaît la largeur.
- **Trois états mémorisés** : `auto` (suit la place), `collapsed`, `expanded` —
  posés sur `<html data-rail="…">`, lus par le CSS.
- Repli : un **seul** contrôle (l'icône `SidebarSimple`). Pas de second bouton
  « fermer ».
- Une entrée = une **icône 20 px** + un libellé ; replié, le libellé passe en
  `sr-only` et l'icône garde un `aria-label`. Jamais deux navigations.
- Réorganisation des pages : **poignée de six points** (`DotsSixVertical`,
  13 px `bold`) à gauche de chaque entrée, au clavier comme à la souris.
- Aucune sous-navigation de réglages dans le rail : Réglages est **une** entrée.
- Le badge de compte (révisions dues) : pastille `--accent` + `--on-accent`,
  jamais une couleur d'alerte pour un simple compteur.

### 6.3 Ce qui change quand on passe au web

| Sur téléphone | Sur le web |
| --- | --- |
| feuille qui monte du bas | **boîte centrée** 680 px (900 px galerie), voile cliquable, sans poignée |
| filtres derrière un bouton | **colonne de filtres collante** de 268 px |
| questions en tiroir | **colonne latérale** ≥ 1180 px, repliable à 0 px |
| une seule zone | deux ou trois zones lisibles à la fois |
| gestes | **clavier** : `/` chercher, `n` créer, `g p` aller à un espace, `?` raccourcis, `⌘K` palette, `Échap` sortir |

Le clavier **ne prend jamais la main pendant la frappe** : sinon `n` devient
impossible à écrire. C'est un test, pas une intention.

Règles de largeur, apprises en corrigeant l'existant :

- **trois surfaces, une mesure** — le titre, la barre d'action et le corps de
  texte partagent `max-width: calc(var(--reading-width) + 114px)` et
  `margin-inline: auto`. Une barre plus large que le paragraphe qu'elle commande
  fait « formulaire », pas « feuille » ;
- **un côté n'apparaît que s'il reste de la place pour le texte** — 340 px de
  panneau à 840 px laissent 300 px de texte : ce n'est plus une page. En dessous
  de 1180 px, le côté redevient un tiroir, fermé d'abord ;
- **trois colonnes ne tiennent pas** — en vue « texte + planche », le panneau des
  questions se retire : la planche **est** le côté ;
- **aucun cadre autour du texte** — un éditeur n'est pas un champ de formulaire.

### 6.4 Le protocole de mise en page

1. Écris un **fil de fer HTML** (`docs/wireframes/desktop-shell.html`) **avant**
   le code : zones, largeurs, ce qui est collant, ce qui défile.
2. Traduis-le en **variables** (`--rail`, `--reading-width`, `--pad-screen`), pas
   en pixels éparpillés.
3. Fais passer les règles par le **CSS** quand elles dépendent de la largeur, par
   **React** quand elles dépendent de ce qui existe (monter un panneau, pas le
   cacher).

---

## 7. La méthode — comment ce rendu a été obtenu

Ce qui suit n'est pas une théorie : c'est l'ordre de travail qui a produit
l'interface. Applique-le tel quel.

1. **Lire avant de dessiner.** `grep` exhaustif sur le dépôt (pas un résumé de
   fichier, pas une supposition sur une bibliothèque) : où sont les couleurs,
   quel paquet pose quelle bordure, quelle version est installée, quel test
   existe déjà. Deux erreurs coûteuses évitées ainsi : une règle de paquet qui
   gagne sur la nôtre, et un réglage qui ne fait rien parce qu'un style en ligne
   l'écrase.
2. **Chercher la cause, pas le symptôme.** Le cadre autour du texte venait de
   `quill.snow.css` (`border: 1px solid #ccc` sur `.ql-container.ql-snow`), pas
   d'un composant. On corrige à la source, avec une règle assez spécifique
   (`.note-prose.ql-container.ql-snow`), jamais par un `!important` ni par un
   conteneur supplémentaire.
3. **Mesurer, ne pas estimer.** Un contraste est un calcul. Une couleur moyenne
   d'image se lit sur les pixels. Une largeur de colonne se vérifie par la
   contrainte du texte (≈ 68 signes), pas au feeling.
4. **Poser les jetons d'abord, les composants ensuite.** Un composant qui
   introduit une valeur nouvelle est un composant à revoir.
5. **Une seule source par valeur, et un test qui compare les deux copies.** Les
   presets d'accent sont écrits en TypeScript **et** en CSS : un test lit
   `index.css` et échoue si les deux divergent, ou si un accent tombe sous
   4,5:1. Sans ce test, la divergence arrive au troisième ajout.
6. **Un réglage doit produire un effet mesurable.** Chaque contrôle est décrit
   dans un registre (`PRESENTATION`) et un test vérifie qu'il produit soit un
   attribut, soit une variable. Un contrôle décoratif ne compile pas.
7. **Écrire le fil de fer avant le code**, et le garder dans `docs/` : c'est ce
   qui permet de dire « voilà l'écart assumé » au lieu de « c'est comme ça ».
8. **Vérifier ce qui est vérifiable, dire ce qui ne l'est pas.** jsdom ne calcule
   aucune mise en page : les largeurs se vérifient en **lisant la feuille de
   style** dans un test ; la position réelle à l'écran se vérifie à l'œil, et il
   faut le dire au lieu de prétendre l'avoir testée.
9. **Documenter les refus.** Chaque décision non évidente laisse une trace avec
   son chiffre et sa raison (pourquoi pas `colorthief`, pourquoi 1180 px, pourquoi
   sept variables animées et pas neuf). Un refus documenté ne se re-discute pas
   tous les trois tours.
10. **Finir par les commandes, et ne rien affirmer sans leur sortie.**
    `tsc --noEmit`, `eslint`, `vitest run`, `vite build`. Un « c'est vert » sans
    la sortie n'existe pas.

---

## 8. Les interdits (contrat, pas préférence)

- Une couleur en dur, une famille de caractères en dur, une taille d'ombre
  inventée.
- Une barre d'accent colorée sur le côté d'une carte ou d'une citation.
- Du texte en dégradé, des ombres colorées, des halos radiaux.
- Des cartes dans des cartes.
- Un état signalé par la seule couleur.
- Deux icônes pour un même geste, deux barres pour les mêmes commandes.
- Un panneau modal pour un contenu qui doit rester **à côté** (les questions).
- Des pointillés derrière du texte de note (le motif est réservé au canevas).
- Une navigation en bas de l'écran au-delà de 768 px.
- Deux copies d'un même panneau dans le DOM (doublons de focus et de lecture).
- Un `!important`, un `style={{ color: "#..." }}`, un `interpolate`-maison pour
  remplacer `@property`.

---

## 9. Définition de fini (observable, pas déclarative)

Livre les sorties de commande, pas des affirmations :

| Preuve | Comment |
| --- | --- |
| TypeScript | `npx tsc -p tsconfig.app.json --noEmit` → 0 erreur |
| Lint | `npx eslint src` → 0 erreur |
| Tests | `npx vitest run` → tout vert, et le nombre de fichiers/tests cité |
| Build | `npx vite build` → ✓ |
| Contrastes | un test recalcule les ratios de **toutes** les palettes et de tous les presets |
| Une palette change le fond | un test applique une palette et vérifie `--bg`, `--tint` **et** `data-wall` |
| Un réglage agit | un test par contrôle : attribut ou variable produit |
| Le côté n'écrase pas le texte | un test vérifie le seuil et l'état « replié d'abord » |
| Pas de cadre autour du texte | un test lit `index.css` et exige `border: 0` sur le conteneur d'édition |
| Icônes | aucune icône hors `@phosphor-icons/react` ; chaque bouton a un libellé |
| Français | aucun libellé anglais dans l'interface livrée |

Et, à l'écran, trois vérifications qu'aucun test ne remplace : 1440 px, 1024 px,
390 px. À chaque largeur : rien ne déborde horizontalement, la navigation est
unique, le texte garde une mesure lisible.

---

## 10. Ordre de travail attendu

1. **Audit** (lecture seule) : jetons existants, palettes, fonds, icônes,
   largeurs, tests. Rends une liste de constats **chiffrés** — pas d'impressions.
2. **Fil de fer** de la coquille web (rail + contenu + en-tête + quoi est
   collant), écrit dans `docs/wireframes/`.
3. **Jetons et couches** : si le système de thèmes n'existe pas encore, pose-le
   en premier (§ 3), avec ses tests de contraste et ses 16 jetons dérivés.
4. **Coquille** : rail, en-tête, colonnes, feuilles → boîtes centrées.
5. **Écrans, un par un**, en réutilisant les composants ; aucun écran ne réécrit
   une couleur.
6. **Fonds et verre** : image, voile borné, accent tiré de l'image, repli solide
   en contraste élevé.
7. **Iconographie** : passe toutes les icônes en Phosphor, applique la table des
   poids et la règle « une icône par geste ».
8. **Preuves** : les commandes du § 9, puis un compte rendu qui sépare ce qui est
   prouvé, ce qui est supposé, et ce que tu n'as pas pu vérifier.

À chaque étape : commit court, message qui dit **pourquoi**, pas seulement quoi.

---

## Annexe A — extraits réels à recopier plutôt qu'à réinventer

### A.1 Palette → jetons

```ts
export function themeVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--bg": tokens.bg,
    "--bg-outside": tokens.bgOutside,
    "--surface": tokens.surface,
    "--surface-2": tokens.surface2,
    "--line": tokens.line,
    "--line-strong": tokens.lineStrong,
    "--ink": tokens.ink,
    "--muted": tokens.muted,
    "--accent": tokens.accent,
    "--accent-soft": tokens.accentSoft,
    "--accent-ink": tokens.accentInk,
    "--on-accent": tokens.onAccent,
    "--danger": tokens.danger,
    "--danger-soft": tokens.dangerSoft,
    "--highlight": tokens.highlight,
    "--canvas-dot": tokens.canvasDot,
  };
}
```

### A.2 Teinte de papier — ne déplace que les fonds

```ts
export function tintTokens(tokens: ThemeTokens, paper: PaperTint): ThemeTokens {
  const tint = TINT[paper] ?? TINT.sand;
  if (tint.weight === 0) return tokens;
  const anchor = tokens.mode === "dark" ? tint.dark : tint.light;
  const weight = tokens.mode === "dark" ? tint.weight * 0.75 : tint.weight;
  return {
    ...tokens,
    bg: mixHex(tokens.bg, anchor, weight),
    bgOutside: mixHex(tokens.bgOutside, anchor, weight * 0.9),
    surface: mixHex(tokens.surface, anchor, weight * 0.5),
    surface2: mixHex(tokens.surface2, anchor, weight * 0.6),
    line: mixHex(tokens.line, anchor, weight * 0.25),
    canvasDot: mixHex(tokens.canvasDot, anchor, weight * 0.35),
  };
}
```

L'encre et l'accent ne bougent **pas** : la lisibilité a été calculée pour la
palette, on ne la rejoue pas pour un déplacement de teinte.

### A.3 Le seuil du côté, côté CSS

```css
/* le panneau n'entre dans la colonne que s'il reste de la place pour le texte */
@media (min-width: 1180px) {
  .editor-aside {
    position: sticky;
    top: 56px;
    width: 340px;
    flex: none;
    transform: none;
  }
  .editor-aside[data-open="false"] {
    width: 0;
    padding-inline: 0;
    border-left: 0;
    opacity: 0;
    overflow: hidden;
  }
}
```

### A.4 Un test de mise en page sans navigateur

jsdom ne calcule pas les largeurs — on lit la feuille, et on teste l'intention :

```ts
const css = readFileSync(join(process.cwd(), "src", "index.css"), "utf8");
const rule = (selector: string) => { /* extrait le corps de la règle */ };

it("aligne la barre d’outils sur la colonne du texte", () => {
  expect(rule(".note-sheet")).toMatch(/max-width:\s*calc\(var\(--reading-width\) \+ 114px\)/);
  expect(rule(".editor-bar")).toMatch(/margin-inline:\s*auto/);
});
```

---

## Annexe B — ce que ce prompt ne prétend pas

- **Aucune capture, aucune promesse visuelle.** Sans navigateur dans
  l'environnement, la position réelle d'un panneau ne se prouve pas par un test :
  elle se vérifie à l'écran, aux trois largeurs du § 9. Dis-le, ne le maquille
  pas.
- **Les valeurs citées viennent du dépôt Einnote** (versions, hex, seuils,
  nombres de palettes et de fonds). Si le dépôt que tu modifies en diffère,
  **le dépôt gagne** — relis avant d'appliquer.
- **Les licences des palettes et des images** sont déclarées par entrée. Ne
  remplace pas une valeur officielle par une approximation trouvée en ligne : si
  la source manque, garde la valeur existante et signale-le.
- **Rien n'est « vérifié » sans sortie de commande.** Une phrase du type « les
  contrastes sont bons » doit être accompagnée du test qui les calcule.

▲ FIN DU PROMPT
