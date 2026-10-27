import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CaretRight, Graph, PencilSimple, Plus } from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { cn } from "@/lib/utils";
import { DisplayMenu } from "@/components/DisplayMenu";
import {
  columnsFor,
  gridStyle,
  groupItems,
  sortItems,
  type DisplayFields,
} from "@/lib/display";
import { useSurfacePrefs } from "@/stores/useDisplayStore";
import { useIsDesktop } from "@/lib/useMediaQuery";
import type { ZettelCard } from "@/types";

export default function Zettelkasten() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vault = useContentStore((s) => s.vaults.find((v) => v.id === id));
  const allCards = useContentStore((s) => s.zettel);

  const cards = useMemo(
    () =>
      allCards
        .filter((c) => c.vaultId === id)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [allCards, id],
  );

  /* Affichage : la pile reste la vue par défaut (c’est le geste), mais on
     peut basculer en grille ou en liste pour relire un coffre de 200 cartes. */
  const { prefs: display, set: setDisplay } = useSurfacePrefs("vault", {
    view: "stack",
    sortBy: "created",
  });
  const desktop = useIsDesktop();
  const fields: DisplayFields<ZettelCard> = useMemo(
    () => ({
      code: { label: "Code", value: (card) => card.code },
      title: { label: "Titre", value: (card) => card.title },
      created: { label: "Créée", value: (card) => card.createdAt, type: "date" },
      updated: { label: "Modifiée", value: (card) => card.updatedAt, type: "date" },
      source: { label: "Source", value: (card) => card.source || "Sans source" },
      refs: { label: "Références", value: (card) => card.refs.length, type: "number" },
      month: {
        label: "Mois",
        value: (card) =>
          new Date(card.createdAt).toLocaleDateString("fr", {
            month: "long",
            year: "numeric",
          }),
      },
    }),
    [],
  );
  const ordered = useMemo(
    () => sortItems(cards, fields, [display.sortBy, display.thenBy]),
    [cards, fields, display.sortBy, display.thenBy],
  );
  const groups = useMemo(
    () => groupItems(ordered, fields, display.groupBy),
    [ordered, fields, display.groupBy],
  );

  const startCode = params.get("card");
  const startIndex = Math.max(
    0,
    cards.findIndex((c) => c.code === startCode),
  );
  const [index, setIndex] = useState(startIndex);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState(false);
  const [query, setQuery] = useState("");
  const start = useRef({ x: 0, y: 0 });

  const card = cards[Math.min(index, Math.max(cards.length - 1, 0))];

  if (!vault || cards.length === 0) {
    return (
      <Screen className="px-5">
        <AppBar back title="" />
        <EmptyState
          icon={Graph}
          title="Ce coffre est vide"
          description="Une carte par idée, écrite avec vos mots, avec sa source. Commencez par la première."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate(`/vault/${id}/new`)}
            >
              <Plus size={18} weight="bold" /> Nouvelle carte
            </button>
          }
        />
      </Screen>
    );
  }


  /* ----------------------------- BUREAU ----------------------------- */
  /* Deux panneaux, comme un fichier de fiches posé à plat : la liste à
     gauche, la carte ouverte à droite. Le feuilletage au doigt n’a aucun sens
     à la souris — il n’existe donc plus sur cette taille d’écran. */
  if (desktop) {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? cards.filter(
          (entry) =>
            entry.code.toLowerCase().includes(needle) ||
            entry.title.toLowerCase().includes(needle) ||
            entry.body.toLowerCase().includes(needle),
        )
      : cards;
    const current = matching.includes(card) ? card : matching[0];

    return (
      <div className="paper screen screen-wide px-6" data-canvas="dots">
        <div className="sticky top-0 z-20 glass">
          <AppBar
            back
            onBack={() => navigate("/vaults")}
            center={false}
            title={`Coffre · ${vault.name}`}
            action={
              <div className="flex items-center gap-1.5">
                <DisplayMenu surface="vault" defaults={{ view: "stack", sortBy: "created" }}
                  views={[
                    { value: "stack", label: "Pile", hint: "Feuilleter" },
                    { value: "grid", label: "Grille", hint: "Vignettes" },
                    { value: "list", label: "Liste", hint: "Titres" },
                  ]}
                  columns={{ min: 1, max: 3, fallback: 3, autoHint: "Vignettes par ligne." }}
                  groupOptions={[
                    { value: "source", label: "Source" },
                    { value: "month", label: "Mois de création" },
                    { value: "refs", label: "Nombre de références" },
                  ]}
                  sortOptions={[
                    { value: "created", label: "Création" },
                    { value: "updated", label: "Modification" },
                    { value: "code", label: "Code" },
                    { value: "title", label: "Titre A → Z" },
                    { value: "refs", label: "Références" },
                    { value: "source", label: "Source" },
                  ]}
                />
                <button type="button" className="pill h-10 px-3 text-[13.5px]" onClick={() => navigate(`/vault/${id}/graph`)}>
                  <Graph size={16} aria-hidden /> Graphe
                </button>
                <button type="button" className="btn-primary h-10 px-3.5 text-[13.5px]" onClick={() => navigate(`/vault/${id}/new`)}>
                  <Plus size={16} weight="bold" aria-hidden /> Nouvelle carte
                </button>
              </div>
            }
          />
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] gap-5 pb-6">
          <section className="flex min-h-0 flex-col">
            <label className="field flex h-10 items-center gap-2 px-3">
              <span className="sr-only">Chercher une fiche</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Chercher dans ${cards.length} fiches`}
                className="w-full bg-transparent text-[13.5px] outline-none"
              />
            </label>
            <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
              {matching.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => openCard(entry.code)}
                    aria-current={current?.id === entry.id}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-field border px-3 py-2 text-left transition-colors",
                      current?.id === entry.id
                        ? "border-accent bg-accent-soft"
                        : "border-transparent hover:border-line hover:bg-surface",
                    )}
                  >
                    <span className="mt-0.5 shrink-0 text-[11.5px] font-bold text-accent">{entry.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-[14.5px] font-semibold">{entry.title}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                        {entry.refs.length} renvoi{entry.refs.length > 1 ? "s" : ""} · {entry.source || "sans source"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {!matching.length && (
                <li className="px-3 py-6 text-center text-[13px] text-muted">Aucune fiche ne correspond.</li>
              )}
            </ul>
          </section>

          {current && (
            <article className="flex min-h-0 flex-col overflow-hidden rounded-sheet border border-line bg-surface shadow-lift">
              <header className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
                <div className="min-w-0">
                  <span className="text-[12.5px] font-bold tracking-wide text-accent">{current.code}</span>
                  <h1 className="mt-1 font-serif text-[25px] font-semibold leading-tight">{current.title}</h1>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    className="pill h-9 px-3 text-[13px]"
                    onClick={() => navigate(`/vault/${id}/new?edit=${current.id}`)}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="pill h-9 px-3 text-[13px]"
                    onClick={() => navigate(`/vault/${id}/graph?card=${encodeURIComponent(current.code)}`)}
                  >
                    Situer
                  </button>
                </div>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <p className="whitespace-pre-wrap font-serif text-[17px] leading-[30px]">{current.body}</p>
                {current.source && (
                  <p className="mt-4 inline-block rounded-rect bg-accent-soft px-2.5 py-1 text-[13.5px] font-medium text-accent-ink">
                    Source : {current.source}
                  </p>
                )}
                {current.refs.length > 0 && (
                  <div className="mt-5 border-t border-line pt-3">
                    <h2 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                      Renvois
                    </h2>
                    <ul className="flex flex-wrap gap-1.5">
                      {current.refs.map((ref) => {
                        const target = cards.find((entry) => entry.code === ref);
                        return (
                          <li key={ref}>
                            <button
                              type="button"
                              onClick={() => openCard(ref)}
                              className="pill h-8 px-2.5 text-[12.5px]"
                            >
                              {ref}
                              {target ? ` · ${target.title}` : " · absente"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          )}
        </div>
      </div>
    );
  }

  const go = (direction: 1 | -1) => {
    setFlying(true);
    setDrag({ x: direction * 460, y: 0 });
    window.setTimeout(() => {
      setIndex((current) => {
        const next = current + direction;
        if (next < 0) return cards.length - 1;
        if (next >= cards.length) return 0;
        return next;
      });
      setDrag({ x: 0, y: 0 });
      setFlying(false);
    }, 190);
  };

  const openCard = (code: string) => {
    const target = cards.findIndex((c) => c.code === code);
    if (target >= 0) setIndex(target);
  };

  const behind = [1, 2]
    .filter((offset) => cards.length > offset)
    .map((offset) => cards[(index + offset) % cards.length]);

  return (
    <Screen className="px-5">
      <AppBar
        back
        onBack={() => navigate("/")}
        title={undefined}
        action={
          <div className="flex items-center gap-1.5">
            <DisplayMenu
              surface="vault"
              defaults={{ view: "stack", sortBy: "created" }}
              views={[
                { value: "stack", label: "Pile", hint: "Feuilleter au doigt" },
                { value: "grid", label: "Grille", hint: "Vignettes" },
                { value: "list", label: "Liste", hint: "Titres" },
              ]}
              columns={{
                min: 1,
                max: 3,
                fallback: desktop ? 3 : 2,
                autoHint: "Automatique : 2 sur téléphone, 3 en bureau.",
              }}
              groupOptions={[
                { value: "source", label: "Source" },
                { value: "month", label: "Mois de création" },
                { value: "refs", label: "Nombre de références" },
              ]}
              sortOptions={[
                { value: "created", label: "Création" },
                { value: "updated", label: "Modification" },
                { value: "code", label: "Code" },
                { value: "title", label: "Titre A → Z" },
                { value: "refs", label: "Références" },
                { value: "source", label: "Source" },
              ]}
            />
            <button
              type="button"
              className="pill h-10 px-3 text-[13.5px]"
              onClick={() => navigate(`/vault/${id}/graph`)}
            >
              Graphe
            </button>
          </div>
        }
      />

      <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight">
        {vault.name}
      </h1>
      <p className="mt-0.5 text-[15px] text-muted">
        Coffre · {cards.length} carte{cards.length > 1 ? "s" : ""}
      </p>

      {display.view !== "stack" ? (
        <div className="mt-5 pb-28">
          {groups.map((group) => {
            const columns = columnsFor(display, {
              fallback: desktop ? 3 : 2,
              min: 1,
              max: 3,
            });
            return (
              <section key={group.key} className="mt-4">
                {group.label && (
                  <h2 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                    {group.label}
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                      {group.items.length}
                    </span>
                  </h2>
                )}
                <ul
                  className={cn(
                    display.view === "grid"
                      ? "grid gap-2.5"
                      : "flex flex-col gap-2",
                  )}
                  style={display.view === "grid" ? gridStyle(columns) : undefined}
                >
                  {group.items.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => {
                          openCard(entry.code);
                          setDisplay({ view: "stack" });
                        }}
                        className={cn(
                          "w-full rounded-card border border-line bg-surface text-left hover:border-line-strong",
                          display.view === "grid" ? "flex h-full flex-col p-3" : "flex items-center gap-3 p-3",
                        )}
                      >
                        <span className="text-[12.5px] font-semibold text-accent">
                          {entry.code}
                        </span>
                        <span
                          className={cn(
                            "font-serif font-semibold",
                            display.view === "grid"
                              ? "mt-1 line-clamp-2 text-[15px] leading-[20px]"
                              : "min-w-0 flex-1 truncate text-[15px]",
                          )}
                        >
                          {entry.title}
                        </span>
                        {display.view === "grid" ? (
                          <span className="mt-1 line-clamp-3 text-[12.5px] leading-[18px] text-muted">
                            {entry.body}
                          </span>
                        ) : (
                          <span className="hidden shrink-0 text-[12px] text-muted sm:block">
                            {entry.source || "sans source"}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="mt-4 text-center text-[12.5px] text-muted">
            Touchez une carte pour revenir à la pile, à cet endroit.
          </p>
        </div>
      ) : (
      <>
      <div className="relative mx-auto mt-6 h-[480px] w-full max-w-[540px] select-none">
        {/* cartes derrière */}
        {behind
          .map((cardBehind, position) => ({ cardBehind, position }))
          .reverse()
          .map(({ cardBehind, position }) =>
            cardBehind ? (
              <div
                key={`${cardBehind.id}-${position}`}
                aria-hidden="true"
                className="absolute rounded-sheet border border-line"
                style={{
                  left: position === 1 ? 30 : 18,
                  right: position === 1 ? 30 : 18,
                  top: position === 1 ? 0 : 20,
                  height: 400,
                  background: position === 1 ? "var(--surface-2)" : "var(--surface)",
                  transform: `rotate(${position === 1 ? -3 : 2}deg)`,
                }}
              />
            ) : null,
          )}

        {/* carte du dessus */}
        <article
          key={card.id}
          onPointerDown={(event) => {
            if (flying) return;
            /* Un appui sur un bouton de la carte doit rester un appui : sans ce
               test, la capture du pointeur avalait tous les clics (impossible
               de modifier ou d’ouvrir un renvoi au doigt). */
            if ((event.target as HTMLElement).closest("button, a, input, textarea")) return;
            start.current = { x: event.clientX, y: event.clientY };
            setDragging(true);
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragging) return;
            setDrag({
              x: event.clientX - start.current.x,
              y: 0,
            });
          }}
          onPointerUp={(event) => {
            if (!dragging) return;
            setDragging(false);
            const dx = event.clientX - start.current.x;
            if (Math.abs(dx) > 80) {
              go(dx < 0 ? 1 : -1);
            } else {
              setDrag({ x: 0, y: 0 });
            }
          }}
          onPointerCancel={() => {
            setDragging(false);
            setDrag({ x: 0, y: 0 });
          }}
          style={{
            transform: `translate(${drag.x}px, 0) rotate(${drag.x / 40}deg)`,
            transition:
              dragging || flying ? "none" : "transform .24s cubic-bezier(.2,.8,.3,1)",
            touchAction: "pan-y",
          }}
          className="absolute inset-x-0 top-11 min-h-[410px] cursor-grab rounded-sheet border border-line px-[22px] py-[22px] shadow-lift active:cursor-grabbing"
          aria-label={`Carte ${card.code}, ${card.title}`}
        >
          <div
            className="absolute inset-0 rounded-sheet"
            style={{
              backgroundImage:
                "repeating-linear-gradient(transparent 0 35px, var(--surface-2) 35px 36px)",
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-semibold text-accent">
                {card.code}
              </span>
              <span className="text-[14px] font-medium text-muted">
                {index + 1} / {cards.length}
              </span>
            </div>

            <h2 className="mt-2.5 font-serif text-[23px] font-semibold leading-[32px]">
              {card.title}
            </h2>

            <p className="mt-2 font-serif text-[17px] leading-[36px]">
              {card.body}
            </p>

            {card.source && (
              <div className="mt-3.5 inline-block rounded-rect bg-accent-soft px-2.5 py-1 text-[14px] font-medium text-accent-ink">
                Source : {card.source}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate(`/vault/${id}/new?edit=${card.id}`)}
              className="btn-secondary mt-4 h-11 w-full gap-2 rounded-field text-[14.5px]"
            >
              <PencilSimple size={17} aria-hidden />
              Modifier cette fiche
            </button>

            {card.refs.length > 0 && (
              <div className="mt-3.5 flex flex-col items-start gap-1">
                {card.refs.map((ref) => {
                  const target = cards.find((c) => c.code === ref);
                  return (
                    <button
                      key={ref}
                      type="button"
                      onClick={() => openCard(ref)}
                      className="flex items-center gap-1 text-left text-[14px] font-medium text-accent"
                    >
                      Voir {ref}
                      {target ? ` · ${target.title}` : ""}
                      <CaretRight size={14} weight="bold" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="mt-1 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Carte précédente"
          onClick={() => go(-1)}
          className="icon-btn h-9 w-9 text-muted"
        >
          <CaretRight size={16} weight="bold" className="rotate-180" />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {cards.slice(0, Math.min(cards.length, 7)).map((c, i) => (
            <span
              key={c.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index % 7 ? "w-4 bg-accent" : "w-1.5 bg-line-strong",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Carte suivante"
          onClick={() => go(1)}
          className="icon-btn h-9 w-9 text-muted"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>
      <p className="mt-1 text-center text-[14px] text-muted">
        Glissez pour feuilleter
      </p>
      </>
      )}

      <div className="h-28" />

      <div className="dock pointer-events-none fixed inset-x-0 bottom-[calc(20px+var(--safe-bottom))] z-20 mx-auto px-5">
        <button
          type="button"
          onClick={() => navigate(`/vault/${id}/new`)}
          className="btn-primary pointer-events-auto h-14 w-full rounded-big text-[16px]"
        >
          <Plus size={20} weight="bold" /> Nouvelle carte
        </button>
      </div>
    </Screen>
  );
}
