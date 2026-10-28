import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowClockwise,
  ArrowDown,
  ArrowUp,
  Check,
  DeviceMobile,
  Info,
  Monitor,
  Plus,
  X,
} from "@phosphor-icons/react";
import { AppBar, Screen } from "@/components/Layout";
import { useRail } from "@/lib/useMediaQuery";
import { useNavStore } from "@/stores/useNavStore";
import { useToast } from "@/stores/useToast";
import {
  MOBILE_SLOTS,
  SURFACE_SLOTS,
  availableItems,
  fillItems,
  needsPicker,
  resolveItems,
  splitMobile,
  type NavSurface,
} from "@/lib/navigation";

/**
 * Navigation — **l’appareil que vous utilisez**, et lui seul.
 *
 * Ce qui a été retiré, et pourquoi. L’écran portait un sélecteur
 * « Téléphone / Bureau » : depuis un téléphone on pouvait réécrire la barre du
 * bureau, et inversement. C’est une erreur de conception, pas un détail : on
 * réglait un appareil qu’on ne voyait pas, sans pouvoir vérifier l’effet, et
 * une manipulation faite « pour essayer » cassait la navigation d’une autre
 * machine. La surface est donc **déduite de la place réelle** (rail visible ou
 * barre basse), jamais choisie à la main.
 *
 * Deuxième règle : on ne propose d’afficher ou masquer des pages que là où il y
 * a un arbitrage à faire. Huit pages dans cinq places, oui (téléphone) ; huit
 * pages dans un rail qui en tient douze, non (bureau). Là où le masquage est
 * retiré, la liste est complétée automatiquement : aucune page ne peut rester
 * invisible sans moyen de la faire revenir. Le réordonnancement, lui, reste
 * partout — c’est un goût, pas un arbitrage de place.
 */
export default function NavSettingsPage() {
  const navigate = useNavigate();
  const showToast = useToast((s) => s.show);

  /* La surface est celle de l’écran en cours : `useRail` répond exactement à
     « y a-t-il une navigation latérale ? ». Aucun état local, donc rien à
     synchroniser. */
  const surface: NavSurface = useRail() ? "desktop" : "mobile";
  const picker = needsPicker(surface);

  const stored = useNavStore((s) => s[surface]);
  const setItems = useNavStore((s) => s.setItems);
  const toggle = useNavStore((s) => s.toggle);
  const move = useNavStore((s) => s.move);
  const reset = useNavStore((s) => s.reset);

  const items = picker ? stored : fillItems(surface, stored);
  const shown = resolveItems(items);
  const available = picker ? availableItems(items) : [];
  const overflow = surface === "mobile" ? splitMobile(items).overflow : [];

  /* La liste complétée devient l’état : ce que l’écran montre doit être ce qui
     est enregistré. Sans effet si la liste est déjà complète (cas courant). */
  useEffect(() => {
    if (!picker && stored.length < items.length) setItems(surface, items);
  }, [picker, stored.length, items, setItems, surface]);

  return (
    <Screen className="screen-narrow px-5">
      <AppBar back onBack={() => navigate("/settings")} title="Navigation" />

      <div className="mt-1 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-field border border-line bg-surface text-accent">
          {surface === "mobile" ? (
            <DeviceMobile size={18} weight="duotone" aria-hidden />
          ) : (
            <Monitor size={18} weight="duotone" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] leading-[20px]">
            Réglages de{" "}
            <strong className="font-semibold">
              {surface === "mobile" ? "la barre du bas" : "du rail latéral"}
            </strong>
            {" "}— l’appareil que vous utilisez en ce moment.
          </p>
          <p className="mt-1 text-[12.5px] leading-[18px] text-muted">
            {surface === "mobile"
              ? "La barre du bas ne défile pas : ce qui ne tient pas passe derrière « Plus »."
              : "Le rail défile : toutes les pages y ont place. L’autre appareil garde ses propres réglages."}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ aperçu vivant */}
      <section className="mt-4 rounded-big border border-line bg-surface p-4">
        <h2 className="font-serif text-[17px] font-semibold">
          Aperçu — {surface === "mobile" ? "barre du bas" : "rail latéral"}
        </h2>

        {surface === "mobile" ? <MobilePreview items={items} /> : <DesktopPreview items={items} />}

        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-[17px] text-muted">
          <Info size={13} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
          {surface === "mobile" ? (
            overflow.length > 0 ? (
              <>
                {overflow.length} page{overflow.length > 1 ? "s" : ""} en trop pour la barre :
                elle{overflow.length > 1 ? "s" : ""} passe
                {overflow.length > 1 ? "nt" : ""} derrière « Plus », jamais hors de portée.
              </>
            ) : (
              <>
                {MOBILE_SLOTS} entrées maximum dans la barre. Le bouton « + » reste au centre
                et ne se déplace pas.
              </>
            )
          ) : (
            <>
              Le bouton « + » et la liste des projets restent fixes. Seules les pages
              ci-dessous se réordonnent — ici, ou directement dans le rail.
            </>
          )}
        </p>
      </section>

      {/* ------------------------------------------------ ordre */}
      <section className="mt-3 rounded-big border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-[18px] font-semibold">
            Pages affichées
            <span className="ml-1.5 text-[13px] font-normal text-muted">{shown.length}</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              reset(surface);
              showToast("Ordre par défaut rétabli.", "accent");
            }}
            className="flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-ink"
          >
            <ArrowClockwise size={14} weight="bold" aria-hidden />
            Rétablir
          </button>
        </div>

        <ol className="mt-2 flex flex-col gap-1">
          {shown.map((item, index) => {
            const Icon = item.icon;
            const locked = shown.length === 1;
            return (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-field border border-line bg-bg px-2.5 py-2"
              >
                <span className="tabnum w-4 shrink-0 text-center text-[11.5px] font-bold text-muted">
                  {index + 1}
                </span>
                <Icon size={18} weight="duotone" className="shrink-0 text-accent" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{item.label}</span>
                  <span className="block truncate text-[11.5px] leading-[16px] text-muted">
                    {item.hint}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Monter ${item.label}`}
                    disabled={index === 0}
                    onClick={() => move(surface, item.id, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-muted disabled:opacity-30"
                  >
                    <ArrowUp size={13} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Descendre ${item.label}`}
                    disabled={index === shown.length - 1}
                    onClick={() => move(surface, item.id, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-muted disabled:opacity-30"
                  >
                    <ArrowDown size={13} weight="bold" />
                  </button>
                  {picker && (
                    <button
                      type="button"
                      aria-label={`Retirer ${item.label}`}
                      disabled={locked}
                      onClick={() => toggle(surface, item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-muted disabled:opacity-30"
                    >
                      <X size={13} weight="bold" />
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        {picker ? (
          shown.length === 1 && (
            <p className="mt-2 text-[12px] leading-[17px] text-muted">
              Une seule page reste affichée : une barre vide ne serait pas une préférence, ce
              serait une impasse. Retirer la dernière est refusé.
            </p>
          )
        ) : (
          <p className="mt-2 text-[12px] leading-[17px] text-muted">
            {SURFACE_SLOTS.desktop} places dans le rail pour {shown.length} pages : tant qu’il
            reste de la place, il n’y a rien à masquer. Le choix d’afficher ou non apparaîtra
            de lui-même quand le catalogue dépassera la place disponible.
          </p>
        )}
      </section>

      {/* ------------------------------------------------ disponibles */}
      {available.length > 0 && (
        <section className="mt-3 rounded-big border border-line bg-surface p-4">
          <h2 className="font-serif text-[18px] font-semibold">Pages masquées</h2>
          <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
            Toujours accessibles par leur adresse et depuis les réglages — elles n’occupent
            simplement pas la barre.
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {available.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-field border border-dashed border-line-strong px-2.5 py-2"
                >
                  <Icon size={18} weight="duotone" className="shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-muted">{item.label}</span>
                    <span className="block truncate text-[11.5px] leading-[16px] text-muted">
                      {item.hint}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(surface, item.id)}
                    aria-label={`Afficher ${item.label}`}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-line bg-bg px-2 text-[12.5px] font-medium"
                  >
                    <Plus size={13} weight="bold" aria-hidden />
                    Afficher
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="mt-4 flex items-start gap-2 rounded-card bg-surface-2 px-3 py-2.5 text-[12px] leading-[18px] text-muted">
        <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-accent" aria-hidden />
        L’ordre se règle ici, et sur bureau aussi depuis le rail : bouton « Ordre », puis
        touchez la page à déplacer et celle devant laquelle la poser. Les deux gestes
        écrivent la même préférence.
      </p>

      <div className="h-16" />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Aperçus — le rendu réel, en miniature                               */
/* ------------------------------------------------------------------ */

function MobilePreview({ items }: { items: ReturnType<typeof useNavStore.getState>["mobile"] }) {
  const { bar, overflow } = splitMobile(items);
  const destinations = resolveItems(bar);
  const half = Math.ceil(destinations.length / 2);
  const parked = resolveItems(overflow);

  return (
    <div className="mt-3 overflow-hidden rounded-sheet border border-line-strong bg-bg">
      <div className="flex items-center justify-center gap-1 border-b border-line/60 py-1.5">
        <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden />
      </div>
      <div className="flex items-start justify-around px-1.5 pb-1 pt-2" data-count={destinations.length}>
        {destinations.slice(0, half).map((item) => (
          <PreviewItem key={item.id} icon={item.icon} label={item.short} />
        ))}
        <span className="flex h-11 w-11 shrink-0 -translate-y-2 items-center justify-center rounded-full bg-accent text-[18px] font-bold text-on-accent">
          +
        </span>
        {destinations.slice(half).map((item) => (
          <PreviewItem key={item.id} icon={item.icon} label={item.short} />
        ))}
        {parked.length > 0 && <PreviewItem label="Plus" />}
      </div>
    </div>
  );
}

function PreviewItem({
  icon: Icon,
  label,
}: {
  icon?: React.ComponentType<{ size?: number; weight?: "regular" | "fill"; className?: string }>;
  label: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-muted">
      {Icon ? (
        <Icon size={19} weight="regular" className="text-accent" />
      ) : (
        <span className="text-[17px] leading-[19px] font-bold">···</span>
      )}
      <span className="w-full truncate text-center text-[9.5px] font-medium leading-none">
        {label}
      </span>
    </span>
  );
}

function DesktopPreview({ items }: { items: ReturnType<typeof useNavStore.getState>["desktop"] }) {
  const destinations = resolveItems(items);
  return (
    <div className="mt-3 flex overflow-hidden rounded-sheet border border-line-strong bg-bg">
      <div className="w-[172px] shrink-0 border-r border-line p-2.5">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[12px] font-bold text-on-accent">
            É
          </span>
          <span className="font-serif text-[12.5px] font-semibold">Engram</span>
        </div>
        <div className="mb-2 flex h-7 items-center justify-center gap-1 rounded-md bg-accent text-[11px] font-semibold text-on-accent">
          + Nouvelle note
        </div>
        <ul className="flex flex-col gap-0.5">
          {destinations.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.id}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] text-ink"
              >
                <Icon size={13} weight="regular" className="shrink-0 text-muted" aria-hidden />
                <span className="truncate">{item.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center p-3">
        <div className="w-full max-w-[130px] rounded-md border border-dashed border-line-strong px-2 py-4 text-center text-[10.5px] leading-[14px] text-muted">
          Le contenu de la page
        </div>
      </div>
    </div>
  );
}
