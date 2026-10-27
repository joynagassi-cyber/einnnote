import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowsDownUp,
  CaretDown,
  Check,
  Faders,
  ListBullets,
  SquaresFour,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { columnsLabel, type DisplayView } from "@/lib/display";
import { useSurfacePrefs, type SurfaceKey } from "@/stores/useDisplayStore";

/**
 * Menu « Affichage et tri » — un inspecteur, pas une feuille de réglages.
 *
 * Il est volontairement sombre dans tous les thèmes : c’est une surface
 * d’inspection posée sur le contenu, comme le panneau d’un logiciel de
 * fichiers. Le contraste reste AAA, indépendamment du papier choisi.
 */

export interface DisplayOption {
  value: string;
  label: string;
}

export interface DisplayMenuProps {
  surface: SurfaceKey;
  /** vue autorisée pour cet écran */
  views?: { value: DisplayView; label: string; hint?: string }[];
  /** colonnes : null = sans objet (liste de texte) */
  columns?: { min: number; max: number; autoHint: string; fallback: number } | null;
  groupOptions: DisplayOption[];
  sortOptions: DisplayOption[];
  /** libellé du bouton */
  label?: string;
  /** champs désactivés avec explication, plutôt que cachés */
  disabledSortKeys?: Record<string, string>;
  /** valeurs de départ de cet écran (avant tout réglage utilisateur) */
  defaults?: Partial<import("@/lib/display").DisplayPrefs>;
}

const DEFAULT_VIEWS = [
  { value: "list" as DisplayView, label: "Liste", hint: "Une ligne par élément" },
  { value: "grid" as DisplayView, label: "Grille", hint: "Vignettes côte à côte" },
];

export function DisplayMenu({
  surface,
  views = DEFAULT_VIEWS,
  columns = null,
  groupOptions,
  sortOptions,
  label = "Affichage",
  disabledSortKeys = {},
  defaults,
}: DisplayMenuProps) {
  const desktop = useIsDesktop();
  const { prefs, set, reset } = useSurfacePrefs(surface, defaults);
  const [open, setOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const groupLabel = useMemo(() => {
    if (!prefs.groupBy) return "Aucun";
    return groupOptions.find((option) => option.value === prefs.groupBy)?.label ?? "Aucun";
  }, [groupOptions, prefs.groupBy]);

  const sortLabel = useMemo(
    () => sortOptions.find((option) => option.value === prefs.sortBy)?.label ?? "",
    [sortOptions, prefs.sortBy],
  );
  const thenLabel = useMemo(
    () =>
      prefs.thenBy
        ? (sortOptions.find((option) => option.value === prefs.thenBy)?.label ?? null)
        : null,
    [sortOptions, prefs.thenBy],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (panel.current?.contains(event.target as Node)) return;
      if (trigger.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    document.body.style.overflow = desktop ? "" : "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      document.body.style.overflow = "";
    };
  }, [open, desktop]);

  const groupChoices: DisplayOption[] = [{ value: "", label: "Aucun" }, ...groupOptions];

  const panelBody = (
    <>
      <header className="display-head">
        <div className="min-w-0">
          <h2 className="display-title">Affichage et tri</h2>
          <p className="display-sub">
            {sortLabel}
            {thenLabel ? ` · puis ${thenLabel}` : ""} · {groupLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={reset} className="display-ghost">
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu d’affichage"
            className="display-icon"
          >
            <X size={17} weight="bold" />
          </button>
        </div>
      </header>

      <div className="display-body">
        {/* ---------- Étagères ---------- */}
        <section aria-labelledby="display-views">
          <h3 id="display-views" className="display-section">
            Étagères
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {views.map((view) => {
              const active = prefs.view === view.value;
              const Icon = view.value === "grid" ? SquaresFour : ListBullets;
              return (
                <button
                  key={view.value}
                  type="button"
                  onClick={() => set({ view: view.value })}
                  aria-pressed={active}
                  className={cn("display-tile", active && "display-tile-active")}
                >
                  <Icon size={19} weight={active ? "fill" : "regular"} aria-hidden />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[13.5px] font-semibold">
                      {view.label}
                    </span>
                    {view.hint && (
                      <span className="block text-[11.5px] leading-[15px] text-white/55">
                        {view.hint}
                      </span>
                    )}
                  </span>
                  {active && <Check size={15} weight="bold" aria-hidden />}
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- Colonnes ---------- */}
        {columns && (
          <section aria-labelledby="display-columns">
            <h3 id="display-columns" className="display-section">
              Colonnes
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  set({
                    columns: prefs.columns === "auto" ? columns.fallback : "auto",
                  })
                }
                aria-pressed={prefs.columns === "auto"}
                className={cn(
                  "display-chip flex-1 justify-start",
                  prefs.columns === "auto" && "display-chip-active",
                )}
              >
                Automatique
                <span className="ml-auto text-[11.5px] text-white/50">
                  {columns.fallback}
                </span>
              </button>
              <div className="display-stepper">
                <button
                  type="button"
                  aria-label="Moins de colonnes"
                  disabled={
                    prefs.view === "list" ||
                    (typeof prefs.columns === "number" &&
                      prefs.columns <= columns.min)
                  }
                  onClick={() => {
                    const current =
                      typeof prefs.columns === "number"
                        ? prefs.columns
                        : columns.fallback;
                    set({
                      columns: Math.max(columns.min, current - 1),
                      view: "grid",
                    });
                  }}
                >
                  −
                </button>
                <output aria-live="polite" className="display-count">
                  {columnsLabel(prefs)}
                </output>
                <button
                  type="button"
                  aria-label="Plus de colonnes"
                  disabled={
                    prefs.view === "list" ||
                    (typeof prefs.columns === "number" &&
                      prefs.columns >= columns.max)
                  }
                  onClick={() => {
                    const current =
                      typeof prefs.columns === "number"
                        ? prefs.columns
                        : columns.fallback;
                    set({
                      columns: Math.min(columns.max, current + 1),
                      view: "grid",
                    });
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <p className="display-hint">
              {prefs.view === "list"
                ? "Sans effet en liste : la largeur décide."
                : columns.autoHint}
            </p>
          </section>
        )}

        {/* ---------- Grouper par ---------- */}
        <section aria-labelledby="display-group">
          <button
            type="button"
            className="display-accordion"
            aria-expanded={groupOpen}
            aria-controls="display-group-list"
            onClick={() => setGroupOpen((value) => !value)}
          >
            <span id="display-group">Grouper par…</span>
            <span className="flex items-center gap-1.5 text-[12px] text-white/55">
              {groupLabel}
              <CaretDown
                size={13}
                weight="bold"
                aria-hidden
                className={cn("transition-transform", groupOpen && "rotate-180")}
              />
            </span>
          </button>
          {groupOpen && (
            <ul id="display-group-list" className="mt-1.5 flex flex-col">
              {groupChoices.map((option) => {
                const active = (prefs.groupBy ?? "") === option.value;
                return (
                  <li key={option.value || "none"}>
                    <button
                      type="button"
                      onClick={() => set({ groupBy: option.value || null })}
                      aria-pressed={active}
                      className={cn("display-row", active && "display-row-active")}
                    >
                      <span className="display-radio" aria-hidden>
                        {active && <Check size={11} weight="bold" />}
                      </span>
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------- Trier ---------- */}
        <section aria-labelledby="display-sort">
          <h3 id="display-sort" className="display-section">
            Trier par…
          </h3>
          <label className="display-field">
            <ArrowsDownUp size={15} aria-hidden />
            <select
              value={prefs.sortBy}
              onChange={(event) => {
                const sortBy = event.target.value;
                set({
                  sortBy,
                  thenBy: prefs.thenBy === sortBy ? null : prefs.thenBy,
                });
              }}
              aria-label="Trier par"
            >
              {sortOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={Boolean(disabledSortKeys[option.value])}
                >
                  {option.label}
                  {disabledSortKeys[option.value]
                    ? ` — ${disabledSortKeys[option.value]}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="display-field mt-2">
            <span className="text-[11.5px] uppercase tracking-wide text-white/45">
              Puis
            </span>
            <select
              value={prefs.thenBy ?? ""}
              onChange={(event) => set({ thenBy: event.target.value || null })}
              aria-label="Puis trier par"
            >
              <option value="">Aucun</option>
              {sortOptions
                .filter((option) => option.value !== prefs.sortBy)
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </label>
        </section>
      </div>
    </>
  );

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="pill h-10 shrink-0 gap-1.5 pl-3 pr-2.5"
      >
        <Faders size={16} weight="bold" aria-hidden />
        {label}
        <span className="text-[11.5px] text-muted">{groupLabel === "Aucun" ? sortLabel : groupLabel}</span>
      </button>

      {open &&
        (desktop ? (
          <div
            ref={panel}
            role="dialog"
            aria-label="Affichage et tri"
            className="display-panel animate-sheet-up"
            style={{ right: 0, top: "calc(100% + 8px)" }}
          >
            {panelBody}
          </div>
        ) : (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/45"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label="Affichage et tri"
              className="display-sheet animate-sheet-up"
            >
              <div className="display-grabber" aria-hidden />
              {panelBody}
            </div>
          </>
        ))}
    </div>
  );
}

/** Petite étiquette utilisée par les écrans pour annoncer l’état courant. */
export function DisplayBadge({ children }: { children: ReactNode }) {
  return <span className="text-[12px] text-muted">{children}</span>;
}
