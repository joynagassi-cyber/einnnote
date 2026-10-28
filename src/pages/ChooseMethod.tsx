import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FilePlus, Sparkle } from "@phosphor-icons/react";
import { AppBar, Screen, Sheet } from "@/components/Layout";
import {
  MindmapTemplateGallery,
  NoteTemplateGallery,
  ZettelTemplateGallery,
} from "@/components/TemplateGallery";
import { EFFORT_DOTS, METHODS, METHOD_ORDER } from "@/lib/methods";
import { useContentStore } from "@/stores/useContentStore";
import { useToast } from "@/stores/useToast";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import type { Method } from "@/types";
import { MINDMAP_TEMPLATES, type MindmapTemplate } from "@/lib/templates/mindmaps";
import {
  ZETTEL_TEMPLATES,
  noteTemplatesFor,
  type NoteTemplate,
  type ZettelTemplate,
} from "@/lib/templates/notes";
import {
  mindmapFromTemplate,
  noteFromTemplate,
  zettelFromTemplate,
} from "@/lib/templates/apply";

/**
 * Choix de la méthode, puis du modèle.
 *
 * Une page blanche est le pire point de départ : elle demande de connaître la
 * méthode avant de l’avoir pratiquée. On propose donc 6 modèles par méthode
 * (14 pour la carte mentale), chacun rattaché à un cas d’usage réel, et une
 * sortie « page blanche » pour ceux qui savent déjà ce qu’ils font.
 *
 * Un modèle se choisit **avant** la création : il remplit le contenu, il ne le
 * remplace pas plus tard. Tout reste éditable ensuite — c’est le principe du
 * remix.
 */
export default function ChooseMethod() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const createNote = useContentStore((s) => s.createNote);
  const addZettelCard = useContentStore((s) => s.addZettelCard);
  const activeProjectId = useAppStore((s) => s.activeProjectId) ?? undefined;
  const toast = useToast((s) => s.show);
  const [method, setMethod] = useState<Method | null>(null);

  /* On peut créer une note **dans une catégorie** : la note naît alors rangée,
     au lieu de naître libre puis d’être déplacée à la main. */
  const vaultId = params.get("vault") ?? undefined;
  const vault = useContentStore((s) => s.vaults.find((v) => v.id === vaultId));
  const projectId =
    vault?.projectId ?? params.get("project") ?? activeProjectId;

  const openWith = (note: { id: string; method: Method; mindmapId?: string; vaultId?: string }) => {
    if (note.mindmapId) navigate(`/mindmap/${note.mindmapId}`, { replace: true });
    else if (note.method === "zettelkasten" && note.vaultId)
      navigate(`/vault/${note.vaultId}/fiches`, { replace: true });
    else navigate(`/note/${note.id}`, { replace: true });
  };

  const blank = (target: Method) => {
    const note = createNote(target, {
      projectId,
      vaultId,

      title:
        target === "cornell"
          ? "Nouvelle note Cornell"
          : target === "mindmap"
            ? "Nouvelle carte mentale"
            : "Note sans titre",
    });
    setMethod(null);
    if (target === "zettelkasten") toast("Vault ouvert : ajoutez une carte", "accent");
    openWith(note);
  };

  const fromNoteTemplate = (template: NoteTemplate) => {
    const seed = noteFromTemplate(template);
    const note = createNote(template.method, {
      projectId,
      vaultId,
      title: seed.title,
      collection: seed.collection,
      blocks: seed.blocks,
    });
    setMethod(null);
    toast(`Modèle « ${template.name} » prêt`, "accent");
    openWith(note);
  };

  const fromMindmapTemplate = (template: MindmapTemplate) => {
    const note = createNote("mindmap", {
      projectId,
      vaultId,
      title: template.name,
      mindmap: mindmapFromTemplate(template),
    });
    setMethod(null);
    toast(`Modèle « ${template.name} » prêt`, "accent");
    openWith(note);
  };

  const fromZettelTemplate = (template: ZettelTemplate) => {
    const note = createNote("zettelkasten", {
      projectId,
      vaultId,
      title: template.name,
    });
    if (note.vaultId) {
      const seed = zettelFromTemplate(template);
      addZettelCard({ vaultId: note.vaultId, ...seed });
    }
    setMethod(null);
    toast("Première fiche créée", "accent");
    openWith(note);
  };

  const noteTemplates =
    method === "outline" || method === "cornell" ? noteTemplatesFor(method) : [];

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar close onBack={() => navigate(vaultId ? `/vault/${vaultId}` : "/")} />

      {vault ? (
        <header className="mt-1">
          <p className="text-[12.5px] font-medium text-muted">
            Nouvelle note dans le vault{" "}
            <span className="text-ink">« {vault.name} »</span>
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight">
            Comment voulez-vous l’écrire ?
          </h1>
          <p className="mt-1.5 text-[15px] leading-[22px] text-muted">
            La note sera rangée dans cette catégorie, sans autre geste. La
            méthode se change plus tard.
          </p>
        </header>
      ) : (
        <>
          <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight">
            Que voulez-vous faire ?
          </h1>
          <p className="mt-1.5 text-[15px] leading-[22px] text-muted">
            Choisissez selon votre besoin. Vous pourrez changer de méthode plus
            tard.
          </p>
        </>
      )}

      <div className="mt-5 flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
        {METHOD_ORDER.map((id) => {
          const meta = METHODS[id];
          const Icon = meta.icon;
          const selected = id === "cornell";
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              className={cn(
                "flex w-full items-start gap-3.5 rounded-card bg-surface text-left transition-colors active:bg-surface-2",
                selected
                  ? "border-2 border-accent p-[13px]"
                  : "border border-line p-3.5",
              )}
            >
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-rect",
                  selected ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink",
                )}
                aria-hidden="true"
              >
                <Icon size={24} weight="regular" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-serif text-[19px] font-semibold">
                    {meta.label}
                  </span>
                  {meta.recommended && (
                    <span className="rounded-[10px] bg-accent-soft px-2 py-0.5 text-[13px] font-semibold text-accent-ink">
                      {meta.recommended}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[15px] text-muted">
                  {meta.tagline}
                </span>
                <span className="mt-1.5 flex items-center gap-2 text-[14px] font-medium">
                  {meta.effortLabel}
                  <span className="flex items-center gap-1" aria-hidden="true">
                    {EFFORT_DOTS(meta.effort).map((filled, index) => (
                      <span
                        key={index}
                        className={cn(
                          "h-[7px] w-[7px] rounded-full",
                          filled ? "bg-accent" : "bg-line-strong",
                        )}
                      />
                    ))}
                  </span>
                  <span className="sr-only">effort {meta.effort} sur 4</span>
                </span>
                <span className="mt-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-accent">
                  <Sparkle size={13} weight="fill" aria-hidden />
                  {id === "mindmap"
                    ? `${MINDMAP_TEMPLATES.length} modèles de carte`
                    : id === "zettelkasten"
                      ? `${ZETTEL_TEMPLATES.length} modèles de fiche`
                      : "6 modèles prêts à l’emploi"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => blank("outline")}
        className="mt-5 h-[52px] w-full rounded-field border border-line bg-transparent text-[15px] font-medium text-ink active:bg-surface-2"
      >
        Je lis simplement, sans prendre de note
      </button>

      <p className="mt-3.5 pb-8 text-center text-[15px]">
        <button
          type="button"
          onClick={() => navigate("/learn/c-2")}
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Comment choisir ? Voir le cours
        </button>
      </p>

      <Sheet
        open={method !== null}
        onClose={() => setMethod(null)}
        size="wide"
        title={
          method
            ? `${METHODS[method].label} — ${noteTemplates.length || (method === "mindmap" ? MINDMAP_TEMPLATES.length : ZETTEL_TEMPLATES.length)} modèles`
            : "Modèles"
        }
      >
        <p className="mb-3 text-[14px] leading-[21px] text-muted">
          Chaque modèle vient d’une méthode qui existe. Choisissez par usage, pas
          par style : tout se réécrit ensuite.
        </p>

        {method === "mindmap" && (
          <MindmapTemplateGallery
            templates={MINDMAP_TEMPLATES}
            onPick={fromMindmapTemplate}
          />
        )}

        {method === "zettelkasten" && (
          <ZettelTemplateGallery
            templates={ZETTEL_TEMPLATES}
            onPick={fromZettelTemplate}
          />
        )}

        {(method === "outline" || method === "cornell") && (
          <NoteTemplateGallery templates={noteTemplates} onPick={fromNoteTemplate} />
        )}

        <button
          type="button"
          onClick={() => method && blank(method)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-field border border-line py-3 text-[14px] font-medium text-muted"
        >
          <FilePlus size={16} aria-hidden />
          Partir d’une page blanche
        </button>
      </Sheet>
    </Screen>
  );
}
