/**
 * Arêtes « flottantes » — géométrie pure, sans React.
 *
 * Repris de l’exemple React Flow `FloatingEdges/utils.ts`, mais réécrit pour
 * deux raisons :
 *
 * 1. **L’exemple réutilise la largeur du nœud source pour le nœud cible**
 *    (`x1 = targetPosition.x + w`). Cela ne se voit pas sur des nœuds de même
 *    taille — c’est le cas de la démo — et produit des courbes qui passent
 *    sous une carte dès que les nœuds diffèrent. Ici chaque boîte utilise SES
 *    propres dimensions.
 * 2. **L’exemple dépend d’un `InternalNode`.** Le calcul ci-dessous ne prend
 *    que des rectangles : il est testable sans monter React Flow, et il sert
 *    aussi aux vignettes de la galerie de styles.
 *
 * Convention : une arête part du **bord** d’une boîte et arrive au **bord** de
 * l’autre, sur la droite qui joint leurs centres. Donc jamais de trait qui
 * traverse une carte, et jamais de poignée visible.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Side = "left" | "right" | "top" | "bottom";

export interface Point {
  x: number;
  y: number;
}

export interface FloatingParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourceSide: Side;
  targetSide: Side;
}

const EPSILON = 1e-6;

const round = (value: number) => Math.round(value * 100) / 100;

export function centerOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Point où la droite (centre de `from` → centre de `to`) sort de `from`.
 *
 * On avance depuis le centre jusqu’à la première frontière touchée : la
 * largeur si le déplacement est plus horizontal que vertical, la hauteur sinon.
 */
export function borderPoint(from: Box, to: Box): { point: Point; side: Side } {
  const a = centerOf(from);
  const b = centerOf(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) {
    // boîtes confondues : on sort par la droite, la courbe reste dégénérée mais
    // finie (aucun NaN ne doit atteindre le SVG)
    return { point: { x: a.x + from.width / 2, y: a.y }, side: "right" };
  }

  const halfW = from.width / 2;
  const halfH = from.height / 2;
  const tx = Math.abs(dx) < EPSILON ? Infinity : halfW / Math.abs(dx);
  const ty = Math.abs(dy) < EPSILON ? Infinity : halfH / Math.abs(dy);
  const t = Math.min(tx, ty);

  if (tx <= ty) {
    return {
      point: { x: a.x + dx * t, y: a.y + dy * t },
      side: dx >= 0 ? "right" : "left",
    };
  }
  return {
    point: { x: a.x + dx * t, y: a.y + dy * t },
    side: dy >= 0 ? "bottom" : "top",
  };
}

/** Paramètres d’une arête flottante entre deux boîtes. */
export function floatingParams(source: Box, target: Box): FloatingParams {
  const from = borderPoint(source, target);
  const to = borderPoint(target, source);
  return {
    sx: from.point.x,
    sy: from.point.y,
    tx: to.point.x,
    ty: to.point.y,
    sourceSide: from.side,
    targetSide: to.side,
  };
}

/**
 * Courbe de Bézier cubique dont les tangentes partent perpendiculairement au
 * côté touché : c’est ce qui donne l’allure « organique » de l’exemple, sans
 * poignées ni réglage manuel.
 */
export function floatingCurve(params: FloatingParams, curvature = 0.42): string {
  const { sx, sy, tx, ty, sourceSide, targetSide } = params;
  const handle = (point: Point, side: Side, towards: Point) => {
    const distance =
      Math.hypot(towards.x - point.x, towards.y - point.y) * curvature;
    switch (side) {
      case "left":
        return { x: point.x - distance, y: point.y };
      case "right":
        return { x: point.x + distance, y: point.y };
      case "top":
        return { x: point.x, y: point.y - distance };
      default:
        return { x: point.x, y: point.y + distance };
    }
  };
  const c1 = handle({ x: sx, y: sy }, sourceSide, { x: tx, y: ty });
  const c2 = handle({ x: tx, y: ty }, targetSide, { x: sx, y: sy });
  return `M ${round(sx)} ${round(sy)} C ${round(c1.x)} ${round(c1.y)}, ${round(
    c2.x,
  )} ${round(c2.y)}, ${round(tx)} ${round(ty)}`;
}

/**
 * Ruban d’épaisseur variable (« plume ») : une seule forme fermée, plus épaisse
 * au départ qu’à l’arrivée, ce qui donne une branche qui s’effile au lieu d’un
 * trait d’épaisseur constante.
 *
 * On échantillonne une quadratique, on décale chaque point le long de la
 * normale, puis on referme : aucune dépendance à un moteur de rendu, donc la
 * vignette de la galerie et le canevas dessinent exactement la même chose.
 */
export function ribbonPath(
  params: FloatingParams,
  options: { startWidth?: number; endWidth?: number; curve?: number; steps?: number } = {},
): string {
  const { startWidth = 6, endWidth = 1.6, curve = 0.18, steps = 16 } = options;
  const { sx, sy, tx, ty } = params;
  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.hypot(dx, dy) || 1;
  // normale à la corde, pour gonfler légèrement la courbe
  const nx = -dy / length;
  const ny = dx / length;
  const cx = (sx + tx) / 2 + nx * length * curve;
  const cy = (sy + ty) / 2 + ny * length * curve;

  const pointAt = (t: number): Point => {
    const u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * tx,
      y: u * u * sy + 2 * u * t * cy + t * t * ty,
    };
  };
  const tangentAt = (t: number): Point => {
    const u = 1 - t;
    return {
      x: 2 * u * (cx - sx) + 2 * t * (tx - cx),
      y: 2 * u * (cy - sy) + 2 * t * (ty - cy),
    };
  };

  const left: Point[] = [];
  const right: Point[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const point = pointAt(t);
    const tangent = tangentAt(t);
    const norm = Math.hypot(tangent.x, tangent.y) || 1;
    const ox = -tangent.y / norm;
    const oy = tangent.x / norm;
    const half = (startWidth + (endWidth - startWidth) * t) / 2;
    left.push({ x: point.x + ox * half, y: point.y + oy * half });
    right.push({ x: point.x - ox * half, y: point.y - oy * half });
  }

  const outline = [...left, ...right.reverse()];
  return `${outline
    .map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`)
    .join(" ")} Z`;
}

/** Chemin orthogonal (angles arrondis) entre deux bords. */
export function stepPath(params: FloatingParams, radius = 12): string {
  const { sx, sy, tx, ty, sourceSide } = params;
  const horizontal = sourceSide === "left" || sourceSide === "right";
  if (horizontal) {
    const midX = (sx + tx) / 2;
    const direction = tx >= sx ? 1 : -1;
    const r = Math.min(radius, Math.abs(midX - sx), Math.abs(tx - midX));
    return `M ${round(sx)} ${round(sy)} L ${round(midX - direction * r)} ${round(sy)} Q ${round(
      midX,
    )} ${round(sy)} ${round(midX)} ${round(sy + Math.sign(ty - sy) * r)} L ${round(midX)} ${round(
      ty - Math.sign(ty - sy) * r,
    )} Q ${round(midX)} ${round(ty)} ${round(midX + direction * r)} ${round(ty)} L ${round(
      tx,
    )} ${round(ty)}`;
  }
  const midY = (sy + ty) / 2;
  const direction = ty >= sy ? 1 : -1;
  const r = Math.min(radius, Math.abs(midY - sy), Math.abs(ty - midY));
  return `M ${round(sx)} ${round(sy)} L ${round(sx)} ${round(midY - direction * r)} Q ${round(
    sx,
  )} ${round(midY)} ${round(sx + Math.sign(tx - sx) * r)} ${round(midY)} L ${round(
    tx - Math.sign(tx - sx) * r,
  )} ${round(midY)} Q ${round(tx)} ${round(midY)} ${round(tx)} ${round(
    midY + direction * r,
  )} L ${round(tx)} ${round(ty)}`;
}
