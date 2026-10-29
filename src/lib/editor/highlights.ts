/**
 * Les cinq surligneurs de la note.
 *
 * Cinq, pas un sélecteur de couleur libre : c’est une **doctrine de couleur**,
 * la même que celle de l’apparence — trois teintes qui portent un sens. Un
 * surligneur qui accepte seize millions de couleurs ne veut plus rien dire
 * quand on relit ; cinq teintes restent mémorisables (« le jaune, c’est la
 * définition »).
 */
export const HIGHLIGHTS = [
  { label: "Jaune", color: "#F6E3A1" },
  { label: "Vert", color: "#CBE7C4" },
  { label: "Bleu", color: "#C9DFF2" },
  { label: "Rose", color: "#F3D2DA" },
  { label: "Violet", color: "#E0D3F3" },
] as const;

export type HighlightColor = (typeof HIGHLIGHTS)[number]["color"];
