import { useReducedMotion as useSystemReducedMotion } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";

/**
 * Le mouvement est-il coupé ?
 *
 * Deux sources, et une seule décision : le réglage de l’application
 * (`data-motion="reduced"` sur `<html>`) ou la préférence système. Les
 * animations en CSS sont déjà neutralisées par la feuille de style ; celles
 * pilotées en JavaScript (GSAP, Framer Motion) doivent poser la question
 * elles-mêmes — un réglage qui ne s’applique pas est un mensonge.
 */
export function prefersReducedMotion(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.dataset.motion === "reduced") return true;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Version React du même réglage, pour les composants qui doivent se redessiner
 * quand l’utilisateur change d’avis (une inclinaison active ne se coupe pas
 * toute seule).
 */
export function useMotionReduced(): boolean {
  const setting = useAppStore((s) => s.settings.motion);
  const system = useSystemReducedMotion();
  if (setting === "reduced") return true;
  return system;
}
