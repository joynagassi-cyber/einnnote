# Présentation — six réglages qui agissent, aucun qui décore

> « La personnalisation est mauvaise et ne marche pas. » Les deux reproches
> étaient justes, mais pas pour la même raison. 28 octobre 2026.

## 1. Le bug était dans l'ordre des styles, pas dans l'écran

Les teintes de papier et le contraste des traits étaient peints en CSS :

```css
:root[data-paper="ivory"] { --bg: #FBF8F0; }
```

Or la palette du thème pose les mêmes variables en **style en ligne** sur
`<html>`. Le style en ligne gagne. Les deux réglages ne changeaient donc rien
du tout — un défaut qu'aucune lecture de l'écran ne révèle, puisqu'on voyait
les bons boutons, le bon aperçu, et un document qui ne bougeait pas.

**Correction, une règle :** les jetons de couleur se calculent en JavaScript,
une seule fois, à partir de la palette **et** des réglages ; le CSS ne peint que
ce qu'on lui donne. `src/lib/presentation.ts` est désormais la seule source de
vérité, `applySettingsToDom` l'appelle avant de poser la palette.

Conséquence heureuse : une teinte n'est pas une palette de plus, c'est un
**déplacement de teinte** appliqué à la palette choisie. Sable, ivoire, gris et
brume fonctionnent avec les vingt-trois thèmes, en clair comme en sombre, et
ne touchent jamais `--ink` ni `--accent` — le texte et l'accent restent lisibles.

## 2. Ce que font les applications de ce genre

Relevé sur trois modèles, une seule leçon par modèle :

| Application | Ce qu'elle expose | Ce qu'on en a pris |
|---|---|---|
| **Bear** | Typographie : police du texte, des titres, du code, **taille, interligne, largeur de ligne, espacement des paragraphes**, plus « rétablir les réglages de l'éditeur » | la **Mesure** (interligne + largeur de lecture) et un **rétablir** par écran |
| **Obsidian** | Apparence : thème, couleur d'accent, taille de base, police d'**interface** distincte de la police de **texte** | séparer ce qui règle la coquille de ce qui règle la note |
| **Notion** | fond chaud, canvas de note plus clair que la coquille, texte presque noir, **un seul accent** réservé aux liens et à l'état actif | un accent unique, jamais réutilisé pour décorer |

Trois principes retenus : **un seul accent**, **des valeurs continues exprimées
en variables** (donc surchargeables sans JavaScript), **un rétablir visible**.

## 3. Les six réglages, et ce qu'ils déplacent réellement

Trois sections, dans l'ordre où un choix se prend — la forme d'abord, parce que
c'est ce qui change le plus la lecture ; la mesure ensuite, parce qu'elle décide
du confort.

### Formes

| Réglage | Valeurs | Effet réel |
|---|---|---|
| **Densité** | Compacte · Standard · Aérée | `--pad`, marges des cartes et des écrans |
| **Angles** | Nets · Doux · Très ronds | `--r-card`, `--r-field`, `--r-sheet` |
| **Traits** | Discrets · Normaux · Marqués | contraste de `--line`, calculé depuis `--ink` |
| **Relief** | Plat · Standard · Surélevé | `--shadow-1/2/3` |

### Papier

| Teinte | Pastille | Direction |
|---|---|---|
| Sable | `#F6F1E7` | référence, aucun mélange |
| Ivoire | `#FBF8F0` | plus clair, plus chaud |
| Gris | `#F2F2F0` | neutre |
| Brume | `#EFF2F1` | froid |

Le mélange est **plus doux en thème sombre** (0,75 × la force) : à faible
luminosité, un déplacement trop fort casse le contraste du texte.

### Mesure

| Réglage | Plage | Pourquoi cette plage |
|---|---|---|
| **Interligne des notes** | 20 – 38 px | en dessous, les descendantes se touchent ; au-delà, la ligne se lit comme un paragraphe |
| **Largeur de lecture** | 520 – 980 px | au-delà de ~80 caractères par ligne, l'œil perd le début de la ligne suivante |
| **Force du canevas** | 0 – 100 % | l'opacité du pointillé et du quadrillage ; 0 = aucune trame |

## 4. Ce qui empêche d'ajouter un réglage décoratif

`PRESENTATION` décrit chaque contrôle (identifiant, libellé, valeurs, plage,
unité). L'écran ne connaît **aucune** liste : il boucle sur les sections. Un
réglage qui ne figure pas dans le registre n'existe pas.

`effectOf(id, réglages)` renvoie la trace écrite de ce que le contrôle déplace,
et `src/lib/presentation.test.ts` vérifie trois choses :

1. les clés du registre sont **exactement** celles de `DEFAULT_PERSONALIZATION`
   — ni un contrôle sans état, ni un état sans contrôle ;
2. **chaque contrôle a un effet réel** — c'est le test qui aurait attrapé le
   bug d'origine ;
3. les quatre teintes produisent quatre fonds distincts, sans jamais toucher
   `ink` ni `accent`.

## 5. Contrat DOM

```html
<html data-density="regular" data-radius="soft" data-borders="subtle"
      data-elevation="regular" data-paper="mist"
      style="--note-leading: 28px; --reading-width: 720px; --canvas-strength: .5">
```

Rien d'autre. Pas de classe calculée, pas de style par composant : n'importe
quel bloc peut réagir en CSS pur, et `docs/DESIGN.md` reste la référence des
jetons.

## 6. Vérification

| Contrôle | Résultat |
|---|---|
| Tests purs du registre | 10/10 — dont « donne à chaque contrôle un effet réel » |
| Tests d'écran | attributs et variables écrits à chaque clic ; `--bg` déplacé par la teinte ; curseur → `--note-leading` **et** état persisté |
| `tsc` / `vite build` | propres |
| Suite complète | 440 tests / 39 fichiers |

**Non vérifié :** le rendu visuel réel des quatre teintes sur l'écran d'un
téléphone — Chromium n'est pas disponible ici, donc la pastille est vérifiée en
hexadécimal, pas à l'œil.

## 7. Accent tiré de l’image de fond

Quand un fond est posé, le thème ne peut plus être choisi à l’aveugle : un accent
bleu sur une forêt brune se voit à chaque bouton. L’interface **lit donc
l’image** et en tire trois couleurs.

| Étape | Ce qui se passe | Pourquoi |
|---|---|---|
| Lecture | `<img>` → canvas **48 × 48** → 2 304 pixels, **RVBA converti en RVB** | 1 ms ; le canvas renvoie 4 canaux, lire des triplets sur ce flux produisait des accents rouges (voir §7 bis) |
| Famille | moyenne circulaire des teintes pondérée par la surface → **famille de ± 60°** | la couleur de l’image, pas son détail : un soleil jaune dans un décor bleu ne doit pas gagner |
| Vote | histogramme de **24 cases** (15°), score `surface^0.8 × saturation^0.9`, dans la famille seulement | la surface décide, la saturation nuance |
| Accent | case gagnante → couleur moyenne → `deriveAccent` corrige jusqu’à AA | l’accent est mesuré contre le **verre réel**, pas contre du blanc théorique |
| Second ton | case la plus éloignée d’au moins 60°, cherchée **hors** de la famille ; à défaut, rotation de 42° | c’est le principe même d’un second ton |
| Signature | saturation et luminosité relevées dans une bande tenable, teinte conservée | une moyenne de ciel et d’eau est délavée : posée telle quelle, l’accent est terne |
| Voile | moyenne pondérée des 35 % de pixels les plus sombres, ramenée sous 4,5 % de luminance | un voile plus clair laisse flotter le texte, un voile noir tue l’image |
| Texte des boutons | noir ou blanc, au meilleur ratio ; **4,5:1 garanti** | pour toute couleur, l’un des deux atteint au moins 4,58:1 — le pire cas est le gris de luminance 0,18 |

### Ce que ça écrit dans le document

```css
--primary: #2F6F5E;      /* accent */
--ring:    #2F6F5E;
--accent:  #2F6F5E;
--on-accent: #FFFFFF;    /* texte des boutons, choisi au ratio */
--accent-2: #C98A3A;     /* second ton */
--tint:    #12211C;      /* voile : sombre sur thème sombre, moyenne sur thème clair */
```

### Deux changements de format, assumés

1. **Les jetons shadcn sont des couleurs, plus des triplets HSL.** Un triplet
   (`174 82% 27%`) ne peut ni s’animer (`@property … <color>`), ni se mélanger
   (`color-mix`). L’opacité est désormais fabriquée par Tailwind :
   `bg-card/40` → `color-mix(in srgb, var(--card) calc(.4 * 100%), transparent)`.
   Sans ce `<alpha-value>`, `bg-card/40` **disparaissait silencieusement** du
   CSS produit — vérifié à la compilation.
2. **Le voile dépend du mode.** `--tint` vaut la teinte sombre de l’image sur un
   thème sombre, et sa couleur moyenne sur un thème clair : un voile sombre sur
   du papier clair fait tomber le texte secondaire à 3,2:1.

### Le fondu de 0,8 s

```css
@property --primary { syntax: "<color>"; inherits: true; initial-value: #0f766e; }
:root { transition: --primary 800ms …, --accent 800ms …, --tint 800ms …; }
:root[data-motion="reduced"] { transition: none; }
```

Une variable CSS ordinaire ne s’anime pas : le navigateur la traite comme du
texte. Déclarée `<color>`, elle s’interpole — changer de fond, de thème ou
d’accent devient un fondu. On n’anime **que** ces sept variable : animer `--bg`
ferait clignoter la page à chaque frappe dans les réglages.

### Les cartes

```css
:root[data-wall]:not([data-wall="none"]) .bg-surface {
  @apply bg-card/40 backdrop-blur-2xl;
  background-image: linear-gradient(
    color-mix(in srgb, var(--tint) 22%, transparent),
    color-mix(in srgb, var(--tint) 22%, transparent)
  );
}
```

Le voile est en `background-image` pour ne pas écraser `background-color` : la
carte porte la transparence, la teinte porte la couleur. Vérifié par calcul sur
les trente-quatre fonds : encre et texte secondaire restent ≥ 4,5:1, à tous les
voiles (`glass.test.ts`, « cartes en verre »).

### Réglage, et preuve

`/settings/appearance` ▸ **Accent du fond** : un interrupteur, les trois
couleurs lues, le texte choisi, et les ratios mesurés. Un réglage automatique
qui ne s’explique pas est un réglage suspect.

| Contrôle | Résultat |
|---|---|
| `src/lib/palette.test.ts` | 14 tests : teinte dominante, second ton réellement distinct, image grise ou corrompue, déterminisme, AA de l’accent sur 4 fonds × 6 couleurs, texte de bouton AA sur 52 gris, voile toujours sombre |
| `src/test/wall-accent.test.tsx` | 9 tests : jetons réellement écrits, voile selon le mode, repli avant lecture, retour au thème si l’interrupteur est coupé, écran Apparence, contrat CSS (`@property`, 800 ms, recette de carte, plus de triplet HSL) |
| `src/lib/glass.test.ts` | 8 tests, dont la recette de carte au calcul |

**Non vérifié :** le rendu visuel réel du fondu et du flou à 40 px — Chromium
n’est pas disponible ici. Le contrat est vérifié (CSS produit, valeurs écrites),
pas le pixel.

---

## 8. L’écran d’Apparence : cinq couches, pas une liste de réglages

L’écran précédent était honnête dans son contenu et faux dans son récit : il
alignait mode, vingt-trois palettes, signatures, fonds, accent, formes,
typographie. Tout y était, mais l’ordre laissait croire qu’on **choisit un
thème** puis qu’on « ajoute » des options. C’est l’inverse : un thème est la
première couche d’une pile de cinq, et les quatre autres s’appliquent **après**
lui, dans n’importe quel ordre.

### Le modèle

`src/lib/composition.ts` — pur, testé, sans DOM.

| # | Couche | Action | Jetons qu’elle écrit | Choix |
|---|---|---|---|---|
| 1 | Palette | **socle** | `--bg` `--surface` `--ink` `--muted` `--accent` | 23 |
| 2 | Fond | **se superpose** | `--tint` `--wall-blur` `--wall-dim` | 25 |
| 3 | Accent | **écrase** | `--accent` `--primary` `--ring` `--on-accent` | 10 + libre |
| 4 | Formes | **géométrie** seulement | `--r-card` `--pad-screen` `--line` `--elev-card` | 4 |
| 5 | Texte | **typographie** seulement | `--font-note` `--note-size` `--note-leading` `--reading-width` | 4 |

`composeAppearance(settings)` rend, pour chaque couche, sa valeur en clair, son
détail et son état actif ; `compositionLine()` en fait la **recette** d’une
phrase — « Nord · fond Montagne · accent tiré du fond · formes douces · Literata
17 px ». Une recette lisible vaut mieux qu’un aperçu muet : elle dit ce qui est
appliqué, et donc ce qu’il reste à changer.

### L’ordre des sections de la page

1. **Studio de composition** — aperçu vivant (une vraie carte de note, pas une
   capture), la pile des cinq couches numérotées avec leur action, et la recette.
2. **Palette** — mode, puis les vingt-trois palettes par famille.
3. **Fond** — signatures, galerie par séries (Horizons en tête), réglage du flou
   et du voile.
4. **Accent** — accent tiré du fond (couleurs lues et ratios mesurés), presets,
   couleur libre.
5. **Formes** — les quatre réglages de géométrie, avec le renvoi vers
   « Présentation avancée ».
6. **Texte** — police, taille, mesure du paragraphe, canevas.
7. **Confort** — contraste, animations, transparence, mise en page.

Un sommaire d’ancres suit le studio ; sur grand écran les sections respirent en
pleine largeur (`screen-wide`).

**Les sept sections sont repliées par défaut** (`SectionState` dans
`src/pages/Appearance.tsx`). L’écran s’ouvre donc sur l’aperçu, pas sur quatre
écrans de pastilles ; une bande de recette collante (`RecipeBar`) reprend
`compositionLine()` dès qu’on descend, avec « Tout replier ». L’en-tête replié
porte la valeur courante de la couche — replier ne cache jamais ce qui est
appliqué. Un lien direct (`#couche-accent`) ouvre la couche visée, sinon la
navigation par ancre montrerait un bloc fermé. Sept tests dédiés
(`src/test/appearance.test.tsx`) : rien n’est monté quand c’est replié, le
résumé reste lisible, une ouverture n’en ferme pas une autre, et le sommaire
comme le lien direct ouvrent bien la bonne couche.

### L’invariant

Le test qui compte n’est pas « la page s’affiche » mais **« une couche ne
dérange pas les autres »** (`src/lib/composition.test.ts`, 8 tests) : changer
les formes ne modifie ni la palette, ni le fond, ni l’accent ; changer le fond
ne touche pas aux formes ; un fond actif prend la main sur l’accent tant que
l’interrupteur « Accent du fond » est ouvert ; et un thème choisi laisse au
moins quatre couches actives. C’est la traduction exécutable de la phrase de
l’utilisateur : *un thème n’est pas la finalité*.
