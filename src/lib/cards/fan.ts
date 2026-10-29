/**
 * Géométrie de l’éventail — **pure**, sans React ni GSAP.
 *
 * Extraite du composant pour deux raisons : elle se teste sans navigateur
 * (c’est la partie qui casse en silence : cartes hors cadre, ordre inversé,
 * centre perdu), et le composant ne contient plus que du rendu.
 */

export interface FanSlotGeometry {
  /** rotation en degrés */
  rotation: number;
  /** décalage horizontal, en rem, avant multiplicateur d’écran */
  x: number;
  /** décalage vertical, en rem */
  y: number;
  scale: number;
  zIndex: number;
}

export interface FanPlacement {
  index: number;
  slot: number;
  offset: number;
  geometry: FanSlotGeometry;
}

/**
 * Position d’une carte dans l’arc, à partir de son décalage au centre.
 *
 * `offset` est en « pas » : −1 = carte la plus à gauche, 0 = centre, +1 = la
 * plus à droite. `spread` est le nombre de pas disponibles de chaque côté.
 * Les mêmes constantes que le composant d’origine (21°, 30 rem, 0,2244) : la
 * courbe est éprouvée, inutile d’en inventer une autre.
 */
export function slotGeometry(offset: number, spread: number): FanSlotGeometry {
  /* Tout est borné à l’arc, y compris l’empilement : une carte envoyée très
     loin ne doit pas se retrouver derrière le fond. */
  const clamped = spread <= 0 ? 0 : Math.max(-spread, Math.min(spread, offset));
  const d = spread <= 0 ? 0 : clamped / spread;
  const absolute = Math.abs(d);
  return {
    rotation: d * 21,
    x: d * 30,
    y: absolute * absolute * 7.3,
    scale: 1 - 0.2244 * absolute * absolute,
    zIndex: Math.max(1, 10 - Math.round(Math.abs(clamped))),
  };
}

/** Quelles cartes sont visibles, et à quelle place. */
export function fanLayout(
  total: number,
  center: number,
  perSide: number,
): FanPlacement[] {
  if (total <= 0) return [];
  const slots = perSide * 2 + 1;

  /* Peu de cartes : on les répartit sur tout l’arc plutôt que de laisser un
     côté vide. Trois fiches doivent occuper l’éventail, pas s’entasser. */
  if (total <= slots) {
    const spread = Math.max((total - 1) / 2, 1);
    return Array.from({ length: total }, (_, index) => {
      const offset = index - (total - 1) / 2;
      return { index, slot: index, offset, geometry: slotGeometry(offset, spread) };
    });
  }

  return Array.from({ length: slots }, (_, slot) => {
    const index = (((center + slot - perSide) % total) + total) % total;
    const offset = slot - perSide;
    return { index, slot, offset, geometry: slotGeometry(offset, perSide) };
  });
}

/** Amplitude horizontale : un éventail large sur un écran étroit sort du cadre. */
export function fanMultiplier(width: number): number {
  if (width < 480) return 0.3;
  if (width < 640) return 0.4;
  if (width < 768) return 0.52;
  if (width < 1024) return 0.76;
  return 1;
}

/** Nombre de cartes de chaque côté : 2 sur téléphone, 3 au-delà. */
export function fanPerSide(width: number): number {
  return width < 768 ? 2 : 3;
}
