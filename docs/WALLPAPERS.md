# Fonds photographiques — l’atelier d’images

> Dix photographies HD, générées pour ce projet, sans licence à acheter ni
> dépendance à un CDN. 28 octobre 2026.

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

## 2. Les dix images

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

## 4. Les prompts

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
| `volcan-noir` | Landscape photograph, 16:10. Black volcanic sand, basalt columns, cold grey Atlantic, overcast sky with a thin amber band. |

## 5. Ce que ça change dans le produit

1. La galerie d’Apparence gagne **dix vignettes réelles**, groupées à part des
   fonds dessinés.
2. Choisir un fond photographique applique sa palette recommandée et le voile
   minimal qui garde le texte lisible — comme pour les SVG.
3. Surtout : l’interface lit l’image (`canvas 48 × 48`) et en tire son accent,
   sa seconde couleur et la teinte de son voile. Détail :
   `docs/PRESENTATION.md` et `src/lib/palette.ts`.

## 6. Ce qui n’a pas été vérifié

- **Aucune capture d’écran** : Chromium ne démarre pas dans cet environnement.
  Le rendu des dix photographies derrière le verre n’a donc pas été vu à l’œil ;
  il est vérifié par la mesure (moyenne, luminance, contrastes) et par les
  tests, pas par la vue.
- Les fichiers `sources/` sont conservés tels quels pour permettre de refaire
  les vignettes à une autre taille ; ils ne sont pas servis par l’application.
