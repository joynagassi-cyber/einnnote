#!/usr/bin/env bash
# Recadre et quantifie les photos de fond pour le web.
#   wallpapers/sources/*.png  →  public/walls/<id>.png  (1280 px de large)
# Une image de fond est toujours floutée par l’interface : on garde donc de la
# couleur (224 teintes) plutôt que du détail, ce qui divise le poids par ~4
# sans différence visible. Aucune retouche de teinte : la palette du fond est
# extraite de l’image telle quelle (voir src/lib/palette.ts).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/walls
for src in wallpapers/sources/*.png; do
  id="$(basename "$src" .png)"
  convert "$src" -strip -resize 1280x \
    -dither FloydSteinberg -colors 224 \
    -define png:compression-level=9 \
    "public/walls/${id}.png"
done
