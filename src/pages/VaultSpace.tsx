import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowsClockwise,
  ArrowRight,
  Cards,
  Graph,
  NotePencil,
  PencilSimple,
  Plus,
  Stack,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen } from "@/components/Layout";
import { VaultSheet } from "@/components/spaces/VaultSheet";
import { useContentStore } from "@/stores/useContentStore";
import { METHODS } from "@/lib/methods";
import { timeAgo } from "@/lib/time";
import type { Note } from "@/types";

/**
 * Un vault ouvert — **une catégorie du projet, et ses notes**.
 *
 * Avant, cette adresse montrait la pile Zettelkasten, avec des codes (#1A),
 * des renvois et un bouton « Graphe » : la page racontait une méthode de
 * graphe, pas une catégorie. Or un vault, c’est « Superposition quantique »
 * dans le projet « Ordinateur quantique » : un titre, une intention, et
 * dedans les notes écrites sur cette partie du sujet.
 *
 * L’ordre de la page suit cet usage : les notes d’abord, ce qu’on vient lire
 * et écrire ; les fiches de révision ensuite, parce qu’elles servent à
 * réviser, pas à ranger ; le graphe enfin, en action secondaire.
 */
export default function VaultSpace() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const vault = useContentStore((s) => s.vaults.find((v) => v.id === id));
  const project = useContentStore((s) =>
    s.projects.find((p) => p.id === vault?.projectId),
  );
  const allNotes = useContentStore((s) => s.notes);
  const allCards = useContentStore((s) => s.zettel);

  const notes = useMemo(
    () =>
      allNotes
        .filter((note) => note.vaultId === id && !note.deletedAt)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allNotes, id],
  );
  const fiches = useMemo(
    () =>
      allCards
        .filter((card) => card.vaultId === id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allCards, id],
  );

  /* Date de naissance : celle du vault, sinon la plus ancienne trace écrite
     dans la catégorie (les vaults créés avant l’ajout du champ n’en ont pas). */
  const created = useMemo(() => {
    const stamps = [
      vault?.createdAt,
      ...notes.map((note) => note.createdAt),
      ...fiches.map((card) => card.createdAt),
    ].filter(Boolean) as string[];
    return stamps.sort()[0];
  }, [vault?.createdAt, notes, fiches]);

  const methods = useMemo(() => {
    const seen = new Map<string, string>();
    for (const note of notes) seen.set(note.method, METHODS[note.method].label);
    return [...seen.values()];
  }, [notes]);

  if (!vault) {
    return (
      <Screen className="px-5">
        <AppBar back onBack={() => navigate("/spaces")} title="Vault" />
        <EmptyState
          icon={Stack}
          title="Vault introuvable"
          description="Cette catégorie a peut-être été supprimée. Les projets restent accessibles."
          action={
            <button type="button" className="btn-primary" onClick={() => navigate("/spaces")}>
              Voir les projets
            </button>
          }
        />
      </Screen>
    );
  }

  const openNote = (note: Note) => {
    if (note.method === "mindmap" && note.mindmapId) {
      navigate(`/mindmap/${note.mindmapId}`);
      return;
    }
    /* Une note Zettelkasten n’a pas de corps à elle : sa matière, ce sont les
       fiches du vault. On l’ouvre donc là où elle s’écrit. */
    if (note.method === "zettelkasten") {
      navigate(`/vault/${id}/fiches`);
      return;
    }
    navigate(`/note/${note.id}`);
  };

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <AppBar
        back
        onBack={() => navigate(project ? `/spaces/${project.id}` : "/spaces")}
        title="Vault"
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label={`Renommer le vault ${vault.name}`}
              className="icon-btn h-9 w-9 text-muted"
            >
              <PencilSimple size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/vault/${id}/graph`)}
              aria-label={`Graphe du vault ${vault.name}`}
              className="pill h-9 px-3 text-[13px]"
            >
              <Graph size={15} weight="duotone" aria-hidden />
              Graphe
            </button>
          </div>
        }
      />

      {/* ------------------------------------------------ en-tête */}
      <header className="mt-1">
        {project && (
          <button
            type="button"
            onClick={() => navigate(`/spaces/${project.id}`)}
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink"
          >
            <span className="truncate">{project.name}</span>
            <ArrowRight size={12} aria-hidden />
            <span className="text-ink">Catégorie</span>
          </button>
        )}
        <h1 className="mt-1 font-serif text-[30px] font-semibold leading-tight">{vault.name}</h1>
        <p className="mt-1 text-[13.5px] leading-[20px] text-muted">
          {vault.note || "Aucune description — dites à quoi sert cette catégorie."}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
          {created && <span>Créée le {formatDate(created)}</span>}
          <span aria-hidden>·</span>
          <span>
            {notes.length} note{notes.length > 1 ? "s" : ""}
          </span>
          <span aria-hidden>·</span>
          <span>
            {fiches.length} fiche{fiches.length > 1 ? "s" : ""}
          </span>
          {methods.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{methods.join(" · ")}</span>
            </>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary h-11 px-4"
            onClick={() => navigate(`/new?vault=${id}`)}
          >
            <Plus size={17} weight="bold" aria-hidden />
            Nouvelle note
          </button>
          <button
            type="button"
            className="pill h-11 gap-1.5 px-3.5 text-[13.5px]"
            onClick={() => navigate(`/vault/${id}/fiches`)}
          >
            <Cards size={16} weight="duotone" aria-hidden />
            Fiches
            <span className="text-muted">{fiches.length}</span>
          </button>
          <button
            type="button"
            className="pill h-11 gap-1.5 px-3.5 text-[13.5px]"
            onClick={() => navigate(`/review/session?scope=vault&id=${id}&mode=all`)}
          >
            <ArrowsClockwise size={16} weight="duotone" aria-hidden />
            Réviser
          </button>
        </div>
      </header>

      {/* ------------------------------------------------ notes */}
      <section className="mt-6">
        <h2 className="flex items-baseline gap-2 font-serif text-[19px] font-semibold">
          <NotePencil size={18} weight="duotone" className="text-accent" aria-hidden />
          Notes
          <span className="text-[13px] font-normal text-muted">{notes.length}</span>
        </h2>
        <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
          Chaque note traite un concept de cette catégorie. Elle garde sa méthode —
          plan, Cornell, carte mentale — et reste révisable.
        </p>

        {notes.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={NotePencil}
              title="Aucune note dans cette catégorie"
              description="Écrivez la première note de ce vault."
              action={
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate(`/new?vault=${id}`)}
                >
                  <Plus size={18} weight="bold" /> Écrire la première note
                </button>
              }
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {notes.map((note) => {
              const meta = METHODS[note.method];
              const Icon = meta.icon;
              return (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => openNote(note)}
                    className="flex w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3 text-left transition-colors hover:border-line-strong"
                  >
                    <span className="tile h-9 w-9" aria-hidden>
                      <Icon size={17} weight="duotone" className="text-accent" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-[15.5px] font-semibold">
                        {note.title}
                      </span>
                      <span className="block truncate text-[11.5px] text-muted">
                        {meta.label} · modifiée {timeAgo(note.updatedAt)}
                      </span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-muted" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------ fiches */}
      <section className="mt-6 rounded-card border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-baseline gap-2 font-serif text-[19px] font-semibold">
              <Cards size={18} weight="duotone" className="text-accent" aria-hidden />
              Fiches de révision
              <span className="text-[13px] font-normal text-muted">{fiches.length}</span>
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
              Une idée par fiche, avec sa source : c’est ce qui part en révision et
              ce que le graphe relie.
            </p>
          </div>
          <button
            type="button"
            className="pill h-9 shrink-0 px-3 text-[13px]"
            onClick={() => navigate(`/vault/${id}/fiches`)}
          >
            Ouvrir
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>

        {fiches.length === 0 ? (
          <p className="mt-2 text-[12.5px] leading-[18px] text-muted">
            Aucune fiche. Elles se créent depuis la page Fiches, ou en écrivant une
            note Zettelkasten dans cette catégorie.
          </p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-1">
            {fiches.slice(0, 4).map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/vault/${id}/fiches?card=${encodeURIComponent(card.code)}`)}
                  className="flex w-full items-center gap-2.5 rounded-field px-2 py-2 text-left hover:bg-surface-2"
                >
                  <span className="shrink-0 text-[12px] font-semibold text-accent">
                    {card.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{card.title}</span>
                  <span className="hidden shrink-0 text-[11.5px] text-muted sm:block">
                    {card.refs.length} renvoi{card.refs.length > 1 ? "s" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {fiches.length > 4 && (
          <button
            type="button"
            onClick={() => navigate(`/vault/${id}/fiches`)}
            className="mt-2 text-[12.5px] font-semibold text-accent"
          >
            Voir les {fiches.length} fiches
          </button>
        )}
      </section>

      <div className="h-24" />

      <VaultSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={vault.projectId ?? ""}
        vaultId={vault.id}
      />
    </Screen>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr", { day: "numeric", month: "long", year: "numeric" });
}
