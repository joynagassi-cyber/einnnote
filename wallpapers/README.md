# Atelier de fonds

Dix photographies de fond, générées pour Engram, livrées avec le code et sans
licence à acheter.

| Dossier | Contenu |
|---|---|
| `sources/` | les PNG d’origine (1312 × 816), **jamais modifiés** |
| `../public/walls/*.png` | les fichiers servis : 1280 px, 224 teintes, ~0,5 Mo |
| `../scripts/optimize-walls.sh` | `sources/` → `public/walls/` |
| `../scripts/normalize-walls.mjs` | mesure la couleur moyenne et corrige un fond trop clair |

Régénérer :

```bash
./scripts/optimize-walls.sh
node scripts/normalize-walls.mjs --check
```

Les identifiants, les ambiances, les prompts exacts et les mesures sont dans
**`docs/WALLPAPERS.md`**. La règle de conception qui décide de tout : *un fond
ne combat jamais le texte* — chaque image est normalisée pour que le verre
garde un contraste AA, et les tests le vérifient sur les pixels réels.

Aucune image ne contient de texte, de personne ni de logo.
