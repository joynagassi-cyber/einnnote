# L’atelier d’images — photographies et illustrations

> Vingt-cinq images HD (douze photographies, treize illustrations éditoriales),
> générées pour ce projet, sans licence à acheter ni dépendance à un CDN.
> 28 octobre 2026.

## 1. Pourquoi un atelier dans le dépôt

Les vingt-quatre fonds historiques sont des **SVG dessinés** (`scripts/make-walls.py`) :
parfaits pour une ambiance abstraite, incapables de donner une photographie.
Or un accent « tiré du fond » n’a de sens que si le fond contient de vraies
couleurs — une forêt, une eau, un ciel. D’où dix photographies, livrées avec le
code, régénérables, et dont la provenance est écrite ici plutôt que devinée.

```
wallpapers/
├── README.md              ce que contient l’atelier, et les prompts exacts
└── sources/               les PNG d’origine (1312 × 816), jamais modifiés
public/walls/*.png         les fichiers servis : 1280 px, 224 teintes, ~0,5 Mo
```

## 2. Les vingt-cinq images

| Identifiant | Nom | Ambiance | Moyenne mesurée | Palette recommandée |
|---|---|---|---|---|
| `aube-glacee` | Aube glacée | lac · givre | `#606973` | Nord |
| `foret-brume` | Forêt de brume | sapin · brouillard | `#404e4a` | Papier nuit |
| `dunes-ambre` | Dunes d’ambre | sable · or | `#8e684b` | Material sombre |
| `canyon-argile` | Canyon d’argile | roche · rouille | `#81604c` | Rosé Pine Lune |
| `falaises-ocean` | Falaises d’océan | écume · large | `#5f7376` | Material sombre |
| `aurore-boreale` | Aurore boréale | aurore · étoiles | `#2c5165` | Lilas nuit |
| `ville-nuit` | Ville la nuit | néon · bitume | `#23253a` | Tokyo Night |
| `volcan-noir` | Volcan noir | basalte · cendre | `#3d4850` | Noir absolu |
| `jardin-fleurs` | Jardin en fleurs | pétales · printemps | `#afa58a` | Material |
| `sel-pastel` | Sel pastel | miroir · pastel | `#c8c5c3` | Lilas |
| `feuillage` | Feuillage | monstera · jungle | `#266341` | Mocha |
| `architecture` | Architecture | béton · lignes | `#716e67` | Material sombre |
| `printemps` | Printemps | cerisiers · prairie | `#c4cbb7` | Rosé poudre |
| `ete` | Été | lagon · sel | `#a1ccc0` | Nord Neige |
| `automne` | Automne | ambre · lac | `#bd9c73` | Material |
| `hiver` | Hiver | glace · sapin | `#b8c7ca` | Nord Neige |
| `tokyo` | Tokyo | indigo · cerisier | `#586282` | Lilas nuit |
| `new-york` | New York | heure dorée · tours | `#7f6c58` | Material sombre |
| `marrakech` | Marrakech | terre · minaret | `#956350` | Material sombre |
| `sydney` | Sydney | port · voiles | `#879ba2` | Material |
| `aube-mer` | Aube sur mer | mer · première lumière | `#796e6f` | Material sombre |
| `desert` | Désert | dune · ochre | `#dfb088` | Nord Neige |
| `montagne` | Montagne | arête · heure bleue | `#334d6a` | Nord |
| `brume-lac` | Brume de lac | jetée · ouate | `#7d8b8d` | Material |
| `noir-blanc` | Noir et blanc | béton · ombre | `#484848` | Papier nuit |

Les moyennes ne sont pas écrites à la main : elles sont **mesurées sur les
pixels** du fichier livré (`scripts/normalize-walls.mjs`), et
`src/lib/glass.test.ts` échoue si le `tone` déclaré dérive de plus de 6 niveaux.
Les palettes non plus : ce sont les seules qui gardent AA sur le verre de cette
image (même test, même raison).

## 3. Le pipeline, en trois étapes

```bash
./scripts/optimize-walls.sh            # sources → public/walls (1280 px, 224 teintes)
node scripts/normalize-walls.mjs --check   # état : moyenne, luminance, poids
node scripts/normalize-walls.mjs dunes-ambre  # corrige un fond précis
```

**Pourquoi 224 teintes et pas un JPEG ?** Le fond est toujours flouté (2–18 px)
et voilé : la teinte compte, le détail non. Une quantification à 224 couleurs
divise le poids par ~5 sans différence visible après flou. Le PNG garde le bord
net des dégradés là où un JPEG à fort taux créerait des blocs.

**Pourquoi une étape de normalisation ?** Une photographie claire derrière un
écran translucide fait remonter le verre vers le gris moyen — et c’est
exactement là que le texte secondaire tombe sous AA (mesuré : 3,77:1 pour
« Dunes d’ambre » avant correction). Aucun voile ne peut le sauver, puisqu’un
voile ne fait que déplacer vers le papier. On corrige donc l’image, jamais le
texte : `dunes-ambre` est assombrie de 8 % en lumière linéaire (teinte
préservée, lumière seule). Les deux images pastel, elles, restent claires :
elles appellent une palette claire, et c’est un test qui le garantit.

## 4. Les séries de la galerie

L’écran d’Apparence ne liste plus quarante-neuf vignettes d’affilée : il les
range en **séries**, comme un choix de couvertures, et la série **Horizons**
ouvre la marche — cinq images neuves sur cinq lumières différentes (aube, dune,
arête, ouate, ombre). L’ordre va du plus photographié au plus abstrait : c’est
l’ordre dans lequel on cherche.

| Série | Fond | Contenu |
|---|---|---|
| **Horizons** | 5 | Aube sur mer · Désert · Montagne · Brume de lac · Noir et blanc |
| **Matières** | 2 | Feuillage · Architecture |
| **Saisons** | 4 | Printemps · Été · Automne · Hiver |
| **Villes** | 4 | Tokyo · New York · Marrakech · Sydney |
| **Photographies** | 10 | voir §2 |
| **Halos** | 18 | les fonds dessinés d’origine |
| **Dégradés** | 6 | cinq arrêts, couleur franche |

Ce découpage est une donnée (`WALL_SERIES` dans `src/lib/walls.ts`), pas une
suite de titres écrits dans la page : un test vérifie que les sept séries
existent, qu’aucune n’est vide et que chacune contient bien les fonds attendus.

## 5. Les prompts

Générées par modèle d’image, cadrage 16:10, sans texte, sans filigrane, sans
personne, sans logo. Les prompts sont volontairement descriptifs sur **la
lumière** et **la palette** : c’est ce qui rend la couleur moyenne prévisible.

| Image | Prompt |
|---|---|
| `aube-glacee` | Landscape photograph, 16:10. Snow-covered peaks reflected in a still alpine lake at first light, thin mist, teal water, warm peach sky. Natural light, HDR, sharp detail, subtle grain. |
| `dunes-ambre` | Landscape photograph, 16:10. Vast desert dunes at golden hour, curved ridges, warm amber and terracotta, clean empty sky. Sharp sand grain, natural sunlight. |
| `foret-brume` | Landscape photograph, 16:10. Dense pine forest in cold morning fog, layered silhouettes, deep green and desaturated sage, faint golden shaft. |
| `falaises-ocean` | Aerial coastal photograph, 16:10. Ocean cliffs, white foam, turquoise shallows fading to navy, bright overcast sky. |
| `aurore-boreale` | Night photograph, 16:10. Green and violet aurora over snowy mountains and a frozen lake, starry sky, deep navy. Long exposure. |
| `ville-nuit` | Night city photograph, 16:10. Skyline from a rooftop, wet streets, blue and magenta neon, bokeh, black sky. Long exposure. |
| `canyon-argile` | Landscape photograph, 16:10. Layered red rock canyon, terracotta and rust strata, narrow river below, warm reflected glow. |
| `jardin-fleurs` | Garden photograph, 16:10. Pink and white blossom in shallow depth of field, creamy pale background, pastel palette. |
| `sel-pastel` | Landscape photograph, 16:10. Salt flats with a thin film of water mirroring a pastel sky, lavender and mint reflections, minimal horizon. |
| `aube-mer` | Flat vector illustration, 16:10. Sunrise over a calm sea, wide horizontal bands of coral, apricot and dusty rose reflected in the water, thin dark horizon line, no land. Minimal editorial poster, soft grain. |
| `desert` | Flat vector illustration, 16:10. Rolling desert dunes at low sun, long smooth ridges, warm ochre and sand gradients, a single curved shadow, empty sky. Minimal editorial poster. |
| `montagne` | Landscape photograph, 16:10. Sharp mountain ridge line at blue hour, snow on the summits, layered valleys fading to haze, cold blue and steel grey, no foreground. |
| `brume-lac` | Landscape photograph, 16:10. Wooden jetty disappearing into a still lake wrapped in thick morning fog, soft grey water, no visible horizon, muted sage and pewter. |
| `noir-blanc` | Black and white photograph, 16:10. Abstract concrete architecture, hard diagonal shadows on a blank wall, strong grain, high contrast, no people, no text. |
| `volcan-noir` | Landscape photograph, 16:10. Black volcanic sand, basalt columns, cold grey Atlantic, overcast sky with a thin amber band. |

### La série « Horizons »
Générée en dernier, sur cinq **thèmes** distincts pour que la galerie ne répète
pas deux fois la même lumière : aube, dune, arête, brume, ombre. Deux sont
vectorielles, trois photographiques — la série mélange volontairement les deux
familles pour montrer qu’elles cohabitent.

`aube.png` a été renommé `aube-mer` : l’identifiant `aube` appartient déjà à un
SVG historique, et `wallFile()` choisit l’extension d’après le `kind`. Un fond
`monochrome` comme `noir-blanc` déclare l’exception : son accent est neutre, et
le test de teinte le sait au lieu d’être assoupli pour tout le monde.

### Les dix illustrations

Vectoriel éditorial, cadrage 16:10, formes nettes, dégradés subtils, sans
contour, sans texte ni logo — la famille visuelle des couvertures de magazines.

| Image | Prompt |
|---|---|
| `feuillage` | Flat vector illustration, 16:10. Dense tropical foliage, overlapping monstera and palm leaves, deep green layers with a few sunlit leaves. Limited palette of forest green, jade, lime, dark teal. |
| `architecture` | Flat vector illustration, 16:10. Looking up at a concrete brutalist facade, repeating geometric balconies, strong diagonals, small square sky. Warm grey, charcoal, bone. |
| `printemps` | Flat vector illustration, 16:10. Spring meadow, stylised cherry trees in blossom, winding path, layered soft hills, a few birds. Sage, soft pink, cream sky. |
| `ete` | Flat vector illustration, 16:10. Summer lagoon from above, turquoise water, pale beach, two striped parasols and a boat, crisp shadows. Aqua, coral, sand. |
| `automne` | Flat vector illustration, 16:10. Autumn forest edge, stylised trees in amber, rust and olive, calm lake reflecting them, low sun disc. |
| `hiver` | Flat vector illustration, 16:10. Winter mountains and frozen lake, stylised snowy pines, pale blue haze layers, small cabin. Glacier blue, slate, off-white. |
| `tokyo` | Flat vector travel illustration, 16:10. Tokyo at dusk, Mount Fuji, torii, layered rooftops and lanterns, cherry branches in the foreground. Indigo, white, coral pink, teal. |
| `new-york` | Flat vector travel illustration, 16:10. Manhattan skyline at golden hour across the water, staggered towers, a bridge, warm sky bands. Amber, navy, off-white. |
| `marrakech` | Flat vector travel illustration, 16:10. Marrakech rooftops and a square minaret at sunset, palm silhouettes, ochre walls, zellige patterns hinted. Terracotta, rose, sand, deep teal shadow. |
| `sydney` | Flat vector travel illustration, 16:10. Sydney harbour, opera house shells, arch bridge, calm water, sailboats. Sea blue, white, sandstone, soft grey. |

## 6. Ce que ça change dans le produit

1. La galerie d’Apparence gagne **vingt-cinq vignettes**, rangées en sept séries
   (Horizons en tête).
2. Choisir un fond photographique applique sa palette recommandée et le voile
   minimal qui garde le texte lisible — comme pour les SVG.
3. Surtout : l’interface lit l’image (`canvas 48 × 48`) et en tire son accent,
   sa seconde couleur et la teinte de son voile. Détail :
   `docs/PRESENTATION.md` et `src/lib/palette.ts`.

## 7. Ce qui n’a pas été vérifié

- **Aucune capture d’écran** : Chromium ne démarre pas dans cet environnement.
  Le rendu des vingt-cinq images derrière le verre n’a donc pas été vu à l’œil ;
  il est vérifié par la mesure (moyenne, luminance, contrastes) et par les
  tests, pas par la vue.
- Les fichiers `sources/` sont conservés tels quels pour permettre de refaire
  les vignettes à une autre taille ; ils ne sont pas servis par l’application.
