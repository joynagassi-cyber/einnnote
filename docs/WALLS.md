# Fonds « verre » — galerie, moteur, et règles

**Vingt-quatre** fonds posés derrière l’interface, en deux familles : des
**halos** (image douce, profondeur) et des **dégradés** (cinq arrêts, couleur
franche). Le même fond s’applique au téléphone **et** au bureau.

Règle revue : *le fond se voit, le verre floute juste ce qu’il faut*. L’écran
est opaque à **40 %** seulement ; ce sont les **surfaces** (cartes à 88 %,
feuilles et champs à 92 %) qui portent la lisibilité du texte. Un voile épais
sur toute la page rendait le fond décoratif — c’est exactement ce qui a été
corrigé.

## 1. Ce qui est livré

| Mode | Fonds |
| --- | --- |
| Sombre · halos (8) | Aurore · Braise · Onyx · Océan · Forêt · Cuivre · Grenat · Nuit d’encre |
| Clair · halos (10) | Glacier · Brume · Quartz rose · Lilas · Pêche · Sauge · Menthe · Argile · Sable · Ciel |
| Clair · dégradés (3) | Aube · Lagune · Miel |
| Sombre · dégradés (3) | Crépuscule · Braise de nuit · Velours |

Les dégradés ont cinq arrêts explicites (0 / 25 / 50 / 75 / 100 %), interpolés
entre des teintes choisies à la main : pas de rampe à deux couleurs qui vire au
gris au milieu. Ils n’ont **pas** de vignette — elle fausserait la couleur
moyenne dont dépend le calcul de lisibilité.

Chaque fond a trois mots d’ambiance (`mood`) et une palette recommandée.
Cliquer une vignette applique **le fond et sa palette** : sans cela, poser un
fond sombre sur un thème clair obligeait un voile si épais que l’image
disparaissait (mesuré : voile 89 %). Avec la palette du même mode, le voile
minimal suffit et l’image reste visible. Cliquer une signature règle tout
d’un coup.

### Signatures (un clic, un goût complet)

| Signature | Palette | Fond | Rayons | Densité | Bordures |
| --- | --- | --- | --- | --- | --- |
| Atelier | Papier | aucun | doux | confort | fines |
| Verre clair | Rose poudré | Quartz rose | doux | aéré | fines |
| Nuit douce | Lilas nuit | Aurore | régulier | confort | fines |
| Encre | Noir absolu | Nuit d’encre | net | compact | marquées |
| Pierre | Acier | Océan | régulier | compact | régulières |
| Sable | Sauge | Sable | doux | aéré | fines |

Les signatures n’emploient aucun vocabulaire de genre : elles décrivent une
matière, une lumière, un atelier.

## 2. Le moteur

```
réglage                     DOM                        CSS
wallpaper             →     data-wall="aurore"    →    .wall-image (url /walls/aurore.svg)
wallBlur (18–48)      →     --wall-blur: 26px     →    filter: blur(var(--wall-blur))
wallDim (bande)       →     --wall-dim: 0.55      →    voile = color-mix(bg dim%, transparent)
accent                →     --accent (recalculé)  →    AA garanti sur le verre
```

Le voile écrit n’est pas toujours le voile réglé : il est **ramené dans la
bande utile** du couple (thème, fond). Voir § 2 bis.

- `src/lib/walls.ts` — `WALLS`, `wallById`, `wallUrl`, `SIGNATURES`.
- `WallLayer` (dans `src/components/DesktopRail.tsx`) est monté **une seule fois**
  dans `AppShell`, en `position: fixed`, `z-index: 0`, `aria-hidden`.
- Les surfaces deviennent des verres (`.screen`, `.bg-surface`, `.rail`) :
  `background: color-mix(surface 78%, transparent)` + `backdrop-filter: blur(20px) saturate(1.2)`.
- `data-transparency="reduced"` (réglage système « Réduire la transparence »)
  supprime le verre et remet les surfaces opaques : la lisibilité passe avant
  l’effet.

### 2 bis. La bande de voile, calculée pour chaque couple

`src/lib/glass.ts` calcule, pour chaque (palette, fond), deux bornes :

| Borne | Calcul | Ce qu’elle protège |
| --- | --- | --- |
| Plancher | plus petit voile où `--ink` **et** `--muted` atteignent 4,5:1 sur le verre | le texte |
| Plafond | plus grand voile où le verre s’écarte encore de ≥ 3/255 du fond du thème | l’utilité du fond |

Entre les deux, on fait ce qu’on veut ; dehors, l’application ramène le réglage
(`effectiveVeil`). Les curseurs de l’écran Apparence prennent **directement**
ces bornes : on ne peut donc pas produire un réglage illisible ou décoratif, et
la phrase sous les curseurs affiche les deux nombres réels.

Cas particulier, dit à l’écran : quand les deux bornes se touchent (fond très
proche du papier), la bande est étroite — changer de palette l’élargit.

**L’accent n’est pas contraint par le voile** : il est recalculé sur la couleur
réelle du verre (`deriveAccent(…, reference)`), donc il reste AA à tous les
voiles. C’est ce qui évite de brider le réglage à cause d’une couleur d’action.

### Bornes de lisibilité (non négociables)

| Garde-fou | Valeur | Pourquoi |
| --- | --- | --- |
| Flou minimal | 18 px | aucune arête d’image ne doit passer sous un paragraphe |
| Flou maximal | 48 px | au-delà, le fond devient une simple tache de couleur |
| Flou par défaut | 26 px | l’image se lit comme une lumière, pas comme une photo |
| Voile par défaut | 55 % | compromis lisibilité / présence, ramené dans la bande si besoin |
| Voile | bande calculée (≈ 0–85 %) | voir § 2 bis |
| Opacité de `.screen` | 66 % | assez transparent pour voir le fond, assez opaque pour lire |
| Opacité des cartes | 76 % | le texte des cartes reste sur un sol stable (AA vérifié) |

Aucun de ces nombres n’est décoratif : `src/lib/glass.test.ts` les vérifie sur
les 18 fonds, à huit voiles différents, en refaisant le calcul de composition
du CSS. Modifier une constante sans vérifier fait échouer la suite.

## 3. Régénérer les images

```bash
python3 scripts/make-walls.py
```

Le script écrit `public/walls/<id>.svg` (8 sombres + 10 clairs, ~76 Ko au
total). Chaque fichier contient :

1. un fond plein (la couleur dominante du mode) ;
2. deux à trois halos radiaux (`radialGradient` + `feGaussianBlur`) ;
3. un grain (`feTurbulence`, très faible opacité) qui casse les bandes de
   dégradé sur les dalles OLED ;
4. un vignettage (`radialGradient` sombre sur les bords) qui recentre l’œil.

Les images sont **générées**, pas photographiées : aucune licence à payer,
aucune photo reconnaissable, et le rendu est reproductible octet pour octet.

## 4. Ce que les tests garantissent

`src/lib/glass.test.ts` recalcule la couleur moyenne de chaque SVG et échoue si
la valeur déclarée dans `WALLS` (`tone`) dérive de plus de 6/255 — c’est ce qui
empêche la bande de voile de mentir quand on retouche une image.

`src/lib/walls.test.ts` échoue si :

- la galerie descend sous 18 fonds, ou deux fonds partagent un identifiant ou un nom ;
- un fond annoncé n’a pas de fichier SVG, ou un SVG n’a pas d’entrée (la
  galerie ne doit jamais mentir) ;
- un SVG ne contient pas de flou, ou dépasse 12 Ko (poids de la page) ;
- l’équilibre clair/sombre casse (≥ 6 sombres, ≥ 8 clairs) ;
- une palette recommandée n’existe pas dans `PALETTES` ;
- une signature pointe vers une palette ou un fond inconnu.

`src/test/smoke.test.tsx` vérifie le comportement réel : appliquer un fond écrit
`data-wall` sur `<html>` et monte la couche ; « Aucun » écrit `data-wall="none"` ;
une signature écrit palette + fond + rayons d’un seul clic.

## 5. Lire le fond sans perdre le texte : la formule

Trois couches, trois rôles — et c’est l’écran, pas le voile, qui décide de la
visibilité de l’image :

```
image (floue 2–18 px, saturée 1.14)
  └─ voile de lisibilité : color-mix(bg X %, transparent)      X réglable
      └─ écran             : color-mix(bg 40 %, transparent)    fixe
          └─ surfaces      : cartes 88 %, feuilles et champs 92 %
```

Contrôle chiffré (voir `src/lib/glass.test.ts`) : sur les **24** fonds et leur
palette recommandée, l’encre et le texte secondaire gardent **AA (≥ 4,5:1)** à
tous les voiles ; la bande utile `veilBand()` donne le minimum lisible et le
maximum où le fond reste perceptible, et les curseurs de l’écran Apparence s’y
accrochent — il est donc impossible de régler un voile qui rende le texte
illisible ou l’image invisible.

## 6. Ajouter un fond

1. Ouvrir `scripts/make-walls.py`, ajouter une entrée `(id, mode, couleurs…)`.
2. Lancer le script, vérifier le SVG dans `public/walls/`.
3. Ajouter la ligne dans `WALLS` (`src/lib/walls.ts`) avec `label`, `mood`,
   `mode`, `palette` (une clé réelle de `PALETTES`).
4. Renseigner `tone` : lancer `node scripts/wall-tones.mjs` (ou lire l’échec de
   `glass.test.ts`, qui donne la valeur attendue au canal près).
5. `vitest run src/lib/walls.test.ts src/lib/glass.test.ts` — les contrôles
   ci-dessus passent ou indiquent précisément ce qui manque.
