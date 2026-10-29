import { BackgroundVariant } from "@xyflow/react";
import type { CanvasBg } from "@/types";

/**
 * Le fond d’un canevas, **une fois**.
 *
 * La règle est simple et vaut pour toutes les surfaces : un canevas dessine sa
 * grille avec `<Background>` de React Flow, jamais avec une image CSS posée sur
 * la page. Une image CSS ne bouge pas quand on déplace le canevas ; le canevas,
 * si. Superposer les deux donnait deux réseaux de pointillés qui glissaient à
 * des vitesses différentes — le « double fond » visible dès qu’on faisait un
 * geste.
 *
 * `blank` et une préférence inconnue rendent `null` : pas de couche du tout.
 */
export function canvasVariant(kind: CanvasBg | string | undefined): BackgroundVariant | null {
  switch (kind) {
    case "dots":
      return BackgroundVariant.Dots;
    case "ruled":
      return BackgroundVariant.Lines;
    case "grid":
      return BackgroundVariant.Cross;
    default:
      return null;
  }
}

/** L’écart entre deux traits de la grille, selon le motif. */
export function canvasGap(variant: BackgroundVariant | null): number {
  if (variant === BackgroundVariant.Cross) return 56;
  return 24;
}

/** L’épaisseur d’un point / d’un trait. */
export function canvasSize(variant: BackgroundVariant | null): number {
  return variant === BackgroundVariant.Dots ? 1.4 : 1;
}
