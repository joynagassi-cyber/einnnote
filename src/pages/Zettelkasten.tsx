import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Cards, CaretRight, Graph, PencilSimple, Plus } from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen } from "@/components/Layout";
import { CardFan } from "@/components/ui/card-fan-carousel";
import { TiltCard } from "@/components/ui/3d-card";
import { ZettelLeaf } from "@/components/zettel/ZettelLeaf";
import { ZettelSheet } from "@/components/zettel/ZettelSheet";
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


  /* ----------------------------- ÉTAGÈRES ----------------------------- */
  /* Cinq étagères, une seule déclaration du menu : la copie d’un menu à deux
     endroits finit toujours par diverger. */
  const menu = (
    <DisplayMenu
      surface="vault"
      defaults={{ view: "stack", sortBy: "created" }}
      views={[
        { value: "stack", label: "Pile", hint: "Feuilleter au doigt" },
        { value: "fan", label: "Éventail", hint: "Relief · choisir" },
        { value: "relief", label: "Relief", hint: "S’incline au pointeur" },
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
  );

  const openCard = (code: string) => {
    const target = cards.findIndex((c) => c.code === code);
    if (target >= 0) setIndex(target);
  };

  /* Grille, liste et relief partagent une seule mare de rendu : seules la
     colonne et l’inclinaison changent. */
  const renderCollection = () => {
    const columns = columnsFor(display, {
      fallback: desktop ? 3 : 2,
      min: 1,
      max: 3,
    });
    const relief = display.view === "relief";
    const tiles = relief || display.view === "grid";

    return (
      <div className={cn("mt-5", desktop ? "pb-6" : "pb-28")}>
        {groups.map((group) => (
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
              className={cn(tiles ? "grid gap-2.5" : "flex flex-col gap-2")}
              style={tiles ? gridStyle(columns) : undefined}
            >
              {group.items.map((entry) => (
                <li key={entry.id}>
                  <TiltCard maxTilt={7} depth={10} disabled={!relief} className="h-full">
                    <button
                      type="button"
                      onClick={() => {
                        openCard(entry.code);
                        setDisplay({ view: "stack" });
                      }}
                      className={cn(
                        "w-full rounded-card border border-line bg-surface text-left transition-colors hover:border-line-strong",
                        tiles ? "flex h-full flex-col p-3" : "flex items-center gap-3 p-3",
                        relief && "min-h-[13rem] shadow-card",
                      )}
                    >
                      <span className="text-[12.5px] font-semibold text-accent">
                        {entry.code}
                      </span>
                      <span
                        className={cn(
                          "font-serif font-semibold",
                          tiles
                            ? "mt-1 line-clamp-2 text-[15px] leading-[20px]"
                            : "min-w-0 flex-1 truncate text-[15px]",
                        )}
                      >
                        {entry.title}
                      </span>
                      {tiles ? (
                        <span
                          className={cn(
                            "mt-1 text-[12.5px] leading-[18px] text-muted",
                            relief ? "line-clamp-5" : "line-clamp-3",
                          )}
                        >
                          {entry.body}
                        </span>
                      ) : (
                        <span className="hidden shrink-0 text-[12px] text-muted sm:block">
                          {entry.source || "sans source"}
                        </span>
                      )}
                    </button>
                  </TiltCard>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="mt-4 text-center text-[12.5px] text-muted">
          {relief
            ? "Approchez le pointeur — ou appuyez et glissez sur téléphone."
            : "Touchez une carte pour revenir à la pile, à cet endroit."}
        </p>
      </div>
    );
  };

  /* ----------------------------- ÉVENTAIL ----------------------------- */
  /* L’éventail ne remplace pas la pile : il sert à choisir. La carte du centre
     est lisible, les voisines annoncent. Un clic au centre ouvre la fiche dans
     la pile, au bon endroit. */
  if (display.view === "fan") {
    return (
      <Screen className={cn("px-5", desktop && "screen-wide")}>
        <AppBar
          back
          onBack={() => navigate("/vaults")}
          title={undefined}
          action={
            <div className="flex items-center gap-1.5">
              {menu}
              <button
                type="button"
                aria-label="Graphe du coffre"
                className="icon-btn h-10 w-10 border border-line"
                onClick={() => navigate(`/vault/${id}/graph`)}
              >
                <Graph size={17} weight="duotone" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Nouvelle carte"
                className="icon-btn h-10 w-10 border border-line"
                onClick={() => navigate(`/vault/${id}/new`)}
              >
                <Plus size={17} weight="bold" aria-hidden />
              </button>
            </div>
          }
        />

        <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight">
          {vault.name}
        </h1>
        <p className="mt-0.5 text-[15px] text-muted">
          Éventail · {cards.length} fiche{cards.length > 1 ? "s" : ""}
        </p>

        <CardFan
          className="mt-3"
          initialIndex={Math.max(
            0,
            ordered.findIndex((entry) => entry.id === card?.id),
          )}
          items={ordered.map((entry) => ({
            key: entry.id,
            label: `${entry.code} — ${entry.title}`,
            onOpen: () => {
              openCard(entry.code);
              setDisplay({ view: "stack" });
            },
            render: (active) => (
              <ZettelLeaf card={entry} active={active} refs={entry.refs} />
            ),
          }))}
        />

        <div className="h-24" />
      </Screen>
    );
  }

  /* ----------------------------- BUREAU ----------------------------- */
  /* Deux panneaux, comme un fichier de fiches posé à plat : la liste à
     gauche, la carte ouverte à droite. Le feuilletage au doigt n’a aucun sens
     à la souris — il n’existe donc plus sur cette taille d’écran. */
  if (desktop && display.view !== "stack") {
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
                {menu}
                <button
                  type="button"
                  className="pill h-10 px-3 text-[13.5px]"
                  onClick={() => navigate(`/vault/${id}/graph`)}
                >
                  <Graph size={16} aria-hidden /> Graphe
                </button>
                <button
                  type="button"
                  className="btn-primary h-10 px-3.5 text-[13.5px]"
                  onClick={() => navigate(`/vault/${id}/new`)}
                >
                  <Plus size={16} weight="bold" aria-hidden /> Nouvelle carte
                </button>
              </div>
            }
          />
        </div>
        {renderCollection()}
      </div>
    );
  }

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
                {menu}
                <button type="button" className="pill h-10 px-3 text-[13.5px]" onClick={() => navigate(`/vault/${id}/graph`)}>
                  <Graph size={16} aria-hidden /> Graphe
                </button>
                <button
                  type="button"
                  className="pill h-10 px-3 text-[13.5px]"
                  onClick={() => navigate(`/review/session?scope=vault&id=${id}&mode=all`)}
                >
                  <Cards size={16} aria-hidden /> Réviser
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
              <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
                <ZettelSheet
                  card={current}
                  cards={cards}
                  onOpenRef={openCard}
                  className="min-h-0 flex-1"
                  actions={
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
                        onClick={() =>
                          navigate(`/vault/${id}/graph?card=${encodeURIComponent(current.code)}`)
                        }
                      >
                        Situer
                      </button>
                    </div>
                  }
                />
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
            {menu}
            <button
              type="button"
              className="pill h-10 px-3 text-[13.5px]"
              onClick={() => navigate(`/vault/${id}/graph`)}
            >
              Graphe
            </button>
            <button
              type="button"
              aria-label="Réviser ce coffre"
              className="icon-btn h-10 w-10 border border-line"
              onClick={() => navigate(`/review/session?scope=vault&id=${id}&mode=all`)}
            >
              <Cards size={17} weight="duotone" aria-hidden />
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
        renderCollection()
      ) : (
      <>
      {/* La pile. La hauteur vient du CSS (`--stack-h`), pas du contenu : une
          fiche longue ne doit pas agrandir le cadre et laisser les cartes de
          derrière dépasser en dessous — c’était le défaut visible. */}
      <div className="zettel-stack relative mx-auto mt-4 w-full max-w-[520px] select-none">
        {behind
          .map((cardBehind, position) => ({ cardBehind, position }))
          .reverse()
          .map(({ cardBehind, position }) => {
            if (!cardBehind) return null;
            const pull = Math.min(1, Math.abs(drag.x) / 220);
            const depth = position + 1;
            return (
              <div
                key={`${cardBehind.id}-${depth}`}
                aria-hidden="true"
                className="zettel-card zettel-card-behind"
                style={{
                  zIndex: 1 + position,
                  transform: `translateY(${10 + depth * 8 - pull * 5}px) scale(${
                    0.968 - depth * 0.02 + pull * 0.004
                  }) rotate(${(position === 1 ? -1.1 : 0.9) + pull * 0.5}deg)`,
                  opacity: 1 - depth * 0.16,
                }}
              />
            );
          })}

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
            setDrag({ x: event.clientX - start.current.x, y: 0 });
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
            /* Trois axes, pas un : la carte glisse, s’incline dans le plan et
               pivote en profondeur. C’est ce qui donne l’épaisseur au geste —
               sans elle, on déplace un rectangle. */
            transform: `perspective(900px) translate(${drag.x}px, ${
              Math.abs(drag.x) * 0.04
            }px) rotate(${drag.x / 38}deg) rotateY(${-drag.x / 26}deg)`,
            transformStyle: "preserve-3d",
            transition:
              dragging || flying ? "none" : "transform .42s cubic-bezier(.18,.9,.22,1.02)",
            touchAction: "pan-y",
          }}
          className="zettel-card zettel-stack-card z-10 flex cursor-grab flex-col active:cursor-grabbing"
          aria-label={`Carte ${card.code}, ${card.title}`}
        >
          <ZettelSheet
            card={card}
            cards={cards}
            onOpenRef={openCard}
            className="min-h-0 flex-1"
            counter={
              <span className="tabnum shrink-0 pt-1 text-[12.5px] font-medium text-muted">
                {index + 1} / {cards.length}
              </span>
            }
            footer={
              <>
                <span className="min-w-0 truncate text-[11.5px] text-muted">
                  Glissez pour feuilleter
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/vault/${id}/new?edit=${card.id}`)}
                  className="pill h-9 shrink-0 gap-1.5 px-3 text-[13px]"
                >
                  <PencilSimple size={15} aria-hidden />
                  Modifier
                </button>
              </>
            }
          />
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
      <p className="mt-2 text-center text-[12.5px] text-muted">
        Glissez la carte, ou utilisez les flèches
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
