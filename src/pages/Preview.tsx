import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Desktop, DeviceMobile, MonitorPlay } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Aperçu « production » : deux cadres réels, côte à côte.
 *
 * Ce ne sont pas des captures : chaque cadre est une iframe sur la même
 * application. La bascule mobile/bureau est donc celle du vrai code
 * (`@media (min-width: 1024px)`), pas une maquette.
 */

type View = "both" | "mobile" | "desktop";

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

export default function Preview() {
  const [view, setView] = useState<View>("both");
  const [desktopScale, setDesktopScale] = useState(0.6);
  const [reloadKey, setReloadKey] = useState(0);
  const desktopBox = useRef<HTMLDivElement>(null);

  /* Le bureau est mis à l’échelle pour tenir dans la largeur disponible,
     sans jamais déformer les proportions. */
  useEffect(() => {
    const element = desktopBox.current;
    if (!element) return;

    const measure = () => {
      const available = element.clientWidth;
      if (!available) return;
      setDesktopScale(Math.min(1, (available - 2) / DESKTOP.width));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [view]);

  return (
    <div className="min-h-[100dvh] bg-[#14161a] text-[#e9ecf1]">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 lg:px-6">
        <Link
          to="/"
          className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13.5px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={16} weight="bold" aria-hidden />
          Retour
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-[15px] font-semibold">
            <MonitorPlay size={18} weight="duotone" aria-hidden />
            Aperçu — la même application, deux tailles
          </h1>
          <p className="truncate text-[12.5px] text-white/50">
            Bascule réelle à 1024 px · aucune capture, deux iframes vivantes
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
          {(
            [
              { value: "both", label: "Côte à côte" },
              { value: "mobile", label: "Mobile" },
              { value: "desktop", label: "Bureau" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value)}
              aria-pressed={view === option.value}
              className={cn(
                "h-8 rounded-md px-3 text-[12.5px] font-semibold transition-colors",
                view === option.value
                  ? "bg-white text-[#14161a]"
                  : "text-white/70 hover:text-white",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="h-8 rounded-md border border-white/20 px-3 text-[12.5px] font-semibold text-white/80 hover:bg-white/10"
        >
          Recharger
        </button>
      </header>

      <main className="flex flex-col items-stretch gap-6 px-4 py-5 lg:flex-row lg:items-start lg:px-6">
        {view !== "desktop" && (
          <section className="flex flex-col items-center gap-2" aria-label="Aperçu mobile">
            <FrameLabel icon={<DeviceMobile size={15} weight="duotone" />}>
              Mobile · {MOBILE.width} × {MOBILE.height}
            </FrameLabel>
            <div
              className="relative rounded-[38px] border border-white/15 bg-black p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
              style={{ width: MOBILE.width + 22 }}
            >
              <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
              <iframe
                key={`m-${reloadKey}`}
                title="Application en 390 px"
                src="/"
                width={MOBILE.width}
                height={MOBILE.height}
                className="rounded-[28px] border-0 bg-white"
              />
            </div>
            <p className="max-w-[300px] text-center text-[12px] leading-[17px] text-white/45">
              Barre d’éditeur collée au-dessus du clavier, navigation par
              onglets.
            </p>
          </section>
        )}

        {view !== "mobile" && (
          <section
            className={cn(
              "flex min-w-0 flex-col gap-2",
              view === "desktop" ? "w-full" : "flex-1",
            )}
            aria-label="Aperçu bureau"
          >
            <FrameLabel icon={<Desktop size={15} weight="duotone" />}>
              Bureau · {DESKTOP.width} × {DESKTOP.height} · échelle{" "}
              {Math.round(desktopScale * 100)} %
            </FrameLabel>
            <div
              ref={desktopBox}
              className="w-full overflow-hidden rounded-xl border border-white/15 bg-black p-0.5 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
              style={{ height: Math.round(DESKTOP.height * desktopScale) + 4 }}
            >
              <iframe
                key={`d-${reloadKey}`}
                title="Application en 1280 px"
                src="/"
                width={DESKTOP.width}
                height={DESKTOP.height}
                loading="lazy"
                className="origin-top-left rounded-lg border-0 bg-white"
                style={{ transform: `scale(${desktopScale})` }}
              />
            </div>
            <p className="text-[12px] leading-[17px] text-white/45">
              Rail de navigation, colonne de lecture élargie, compositeur
              d’édition en haut.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function FrameLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-white/50">
      {icon}
      {children}
    </div>
  );
}
