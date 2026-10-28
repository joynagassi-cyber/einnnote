import { useState } from "react";
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
import { AppBar, Screen, Segmented } from "@/components/Layout";
import { useNavStore } from "@/stores/useNavStore";
import { useToast } from "@/stores/useToast";
import {
  MOBILE_SLOTS,
  availableItems,
  resolveItems,
  splitMobile,
  type NavSurface,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Navigation — **quelles pages, et dans quel ordre**, appareil par appareil.
 *
 * Le principe qui a guidé l’écran : une préférence n’est utile que si l’on voit
 * son effet *avant* de quitter la page. D’où l’aperçu vivant en haut, qui
 * reprend exactement le rendu de la barre basse et du rail — mêmes icônes,
 * mêmes libellés, même place pour le bouton « + ».
 *
 * Ce que l’écran ne fait pas : promettre de la place qui n’existe pas. Au-delà
 * de cinq entrées sur téléphone, la barre basse n’a plus de largeur : les
 * suivantes passent derrière « Plus », et c’est écrit en toutes lettres.
 */
export default function NavSettingsPage() {
  const navigate = useNavigate();
  const showToast = useToast((s) => s.show);
  const [surface, setSurface] = useState<NavSurface>("mobile");

  const mobile = useNavStore((s) => s.mobile);
  const desktop = useNavStore((s) => s.desktop);
  const toggle = useNavStore((s) => s.toggle);
  const move = useNavStore((s) => s.move);
  const reset = useNavStore((s) => s.reset);

  const items = surface === "mobile" ? mobile : desktop;
  const shown = resolveItems(items);
  const available = availableItems(items);
  const { overflow } = splitMobile(mobile);

  const add = (id: Parameters<typeof toggle>[1]) => {
    toggle(surface, id);
  };

  return (
    <Screen className="screen-narrow px-5">
      <AppBar back onBack={() => navigate("/settings")} title="Navigation" />

      <p className="mt-1 text-[13.5px] leading-[20px] text-muted">
        Choisissez les pages qui apparaissent dans la barre du bas (téléphone)
        et dans le rail (bureau). Chaque appareil garde sa propre liste : cinq
        entrées tiennent sous le pouce, quinze tiennent dans un rail.
      </p>

      <div className="mt-4">
        <Segmented
          value={surface}
          onChange={(value) => setSurface(value as NavSurface)}
          label="Appareil"
          options={[
            { value: "mobile", label: "Téléphone" },
            { value: "desktop", label: "Bureau" },
          ]}
        />
      </div>

      {/* ------------------------------------------------ aperçu vivant */}
      <section className="mt-4 rounded-big border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          {surface === "mobile" ? (
            <DeviceMobile size={17} weight="duotone" className="text-accent" aria-hidden />
          ) : (
            <Monitor size={17} weight="duotone" className="text-accent" aria-hidden />
          )}
          <h2 className="font-serif text-[17px] font-semibold">
            Aperçu — {surface === "mobile" ? "barre du bas" : "rail latéral"}
          </h2>
        </div>

        {surface === "mobile" ? (
          <MobilePreview items={mobile} />
        ) : (
          <DesktopPreview items={desktop} />
        )}

        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-[17px] text-muted">
          <Info size={13} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
          {surface === "mobile" ? (
            overflow.length > 0 ? (
              <>
                {overflow.length} page{overflow.length > 1 ? "s" : ""} en trop pour la
                barre : elle{overflow.length > 1 ? "s" : ""} passent derrière « Plus »,
                jamais hors de portée.
              </>
            ) : (
              <>
                {MOBILE_SLOTS} entrées maximum dans la barre. Le bouton « + » reste
                au centre et ne se déplace pas.
              </>
            )
          ) : (
            <>
              Le bouton « + » et la liste des projets restent fixes. Seules les
              pages ci-dessous se réordonnent — ici, ou directement dans le rail.
            </>
          )}
        </p>
      </section>

      {/* ------------------------------------------------ ordre */}
      <section className="mt-3 rounded-big border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-[18px] font-semibold">
            Pages affichées
            <span className="ml-1.5 text-[13px] font-normal text-muted">
              {shown.length}
            </span>
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
                  <span className="block truncate text-[14px] font-medium">
                    {item.label}
                  </span>
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
                  <button
                    type="button"
                    aria-label={`Retirer ${item.label}`}
                    disabled={locked}
                    onClick={() => toggle(surface, item.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-muted disabled:opacity-30"
                  >
                    <X size={13} weight="bold" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>

        {shown.length === 1 && (
          <p className="mt-2 text-[12px] leading-[17px] text-muted">
            Une seule page reste affichée : une barre vide ne serait pas une
            préférence, ce serait une impasse. Retirer la dernière est refusé.
          </p>
        )}
      </section>

      {/* ------------------------------------------------ disponibles */}
      {available.length > 0 && (
        <section className="mt-3 rounded-big border border-line bg-surface p-4">
          <h2 className="font-serif text-[18px] font-semibold">Pages masquées</h2>
          <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
            Toujours accessibles par leur adresse et depuis les réglages — elles
            n’occupent simplement pas la barre.
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
                    <span className="block truncate text-[14px] text-muted">
                      {item.label}
                    </span>
                    <span className="block truncate text-[11.5px] leading-[16px] text-muted">
                      {item.hint}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => add(item.id)}
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
        L’ordre se règle aussi depuis la barre elle-même : sur bureau, bouton
        « Ordre » dans le rail, puis touchez la page à déplacer et celle devant
        laquelle la poser.
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
