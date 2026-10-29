import type { ComponentType } from "react";
import {
  Cards,
  ListBullets,
  Notebook,
  SquaresFour,
  TreeStructure,
} from "@phosphor-icons/react";
import type { Method } from "@/types";

export type PhosphorIcon = ComponentType<{
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
  "aria-hidden"?: boolean;
}>;

export interface MethodMeta {
  id: Method;
  label: string;
  tagline: string;
  effort: 1 | 2 | 3 | 4;
  effortLabel: string;
  icon: PhosphorIcon;
  recommended?: string;
}

export const METHODS: Record<Method, MethodMeta> = {
  outline: {
    id: "outline",
    label: "Outline",
    tagline: "Documentation structurée",
    effort: 1,
    effortLabel: "Effort faible",
    icon: ListBullets,
  },
  cornell: {
    id: "cornell",
    label: "Cornell",
    tagline: "Conférences et manuels denses",
    effort: 2,
    effortLabel: "Effort moyen",
    icon: Notebook,
    recommended: "Conseillé pour un cours",
  },
  mindmap: {
    id: "mindmap",
    label: "Carte mentale",
    tagline: "Brainstorming et systèmes complexes",
    effort: 3,
    effortLabel: "Effort élevé",
    icon: TreeStructure,
  },
  zettelkasten: {
    id: "zettelkasten",
    label: "Zettelkasten",
    tagline: "Thèse et recherche à long terme",
    effort: 4,
    effortLabel: "Effort très élevé",
    icon: Cards,
  },
  whiteboard: {
    id: "whiteboard",
    label: "Tableau blanc",
    tagline: "Texte et planche, sur la même feuille",
    effort: 3,
    effortLabel: "Effort élevé",
    icon: SquaresFour,
    recommended: "Quand la pensée passe du texte au schéma",
  },
};

export const METHOD_ORDER: Method[] = [
  "outline",
  "cornell",
  "mindmap",
  "whiteboard",
  "zettelkasten",
];

export const EFFORT_DOTS = (effort: number) =>
  [0, 1, 2, 3].map((i) => i < effort);

export function methodLabel(method: Method): string {
  return METHODS[method].label;
}
