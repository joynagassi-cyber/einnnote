import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Monitor } from "@phosphor-icons/react";
import { useAppStore } from "@/stores/useAppStore";

/**
 * Afficher la **vraie** mise en page bureau, même dans une fenêtre étroite.
 *
 * Pourquoi une iframe et pas un simple `transform: scale` : les media queries
 * CSS et les variantes `lg:` de Tailwind se calculent sur la largeur de la
 * fenêtre, jamais sur celle d’un conteneur. Réduire visuellement une page large
 * ne la rend donc pas « bureau » — elle reste en une colonne, simplement plus
 * petite. La seule façon d’obtenir le rendu bureau est de lui donner une
 * fenêtre de 1440 px : l’iframe est cette fenêtre, et la mise à l’échelle se
 * fait par-dessus.
 *
 * Deux façons de l’activer : le réglage « Mise en page · Bureau » (Apparence),
 * ou l’adresse `?bureau=1` — pratique pour montrer un écran précis sans
 * toucher aux réglages. Le cadre ajoute `?bureau=frame` pour ne pas se
 * reproduire lui-même à l’infini.
 */

export const DESKTOP_FRAME_WIDTH = 1440;
export const DESKTOP_FRAME_HEIGHT = 900;

export function DesktopFrame({ children }: { children: React.ReactNode }) {
  const { search } = useLocation();
  const layout = useAppStore((s) => s.settings.layout ?? "auto");
  const [size, setSize] = useState(() => ({
    width: typeof window === "undefined" ? DESKTOP_FRAME_WIDTH : window.innerWidth,
    height: typeof window === "undefined" ? DESKTOP_FRAME_HEIGHT : window.innerHeight,
  }));

  useEffect(() => {
    const update = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const params = new URLSearchParams(search);
  const inner = params.get("bureau") === "frame";
  const forced =
    layout === "desktop" || params.get("bureau") === "1" || params.get("desktop") === "1";
  const narrow = size.width < DESKTOP_FRAME_WIDTH - 40;

  if (inner || !forced || !narrow) return <>{children}</>;

  const scale = Math.min(
    1,
    (size.width - 16) / DESKTOP_FRAME_WIDTH,
    (size.height - 56) / DESKTOP_FRAME_HEIGHT,
  );
  const src = `${window.location.pathname}${window.location.hash}?bureau=frame`;

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-bg-outside">
      <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-1.5 text-[12px] text-muted">
        <span className="flex items-center gap-1.5 font-semibold">
          <Monitor size={14} aria-hidden />
          Vue bureau · 1440 × 900
        </span>
        <span>
          {Math.round(scale * 100)} % ·{" "}
          <a href={src.replace("?bureau=frame", "?bureau=frame&plein=1")} className="underline">
            plein écran
          </a>
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <iframe
          title="Engram — vue bureau"
          src={src}
          width={DESKTOP_FRAME_WIDTH}
          height={DESKTOP_FRAME_HEIGHT}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: 0,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
      </div>
    </div>
  );
}
