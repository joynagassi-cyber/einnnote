import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ImageSquare, LinkSimple, Sparkle, X } from "@phosphor-icons/react";
import { Screen, Sheet } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { useToast } from "@/stores/useToast";
import { cn } from "@/lib/utils";
import { ZETTEL_TEMPLATES } from "@/lib/templates/notes";
import { titleFromTemplate } from "@/lib/templates/apply";

export default function ZettelForm() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const navigate = useNavigate();
  const toast = useToast((s) => s.show);

  const vault = useContentStore((s) => s.vaults.find((v) => v.id === id));
  const allCards = useContentStore((s) => s.zettel);
  const addZettelCard = useContentStore((s) => s.addZettelCard);
  const updateZettelCard = useContentStore((s) => s.updateZettelCard);

  const vaultCards = useMemo(
    () => allCards.filter((c) => c.vaultId === id),
    [allCards, id],
  );
  const editing = editId ? allCards.find((c) => c.id === editId) : undefined;

  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [source, setSource] = useState(editing?.source ?? "");
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [image, setImage] = useState(editing?.image ?? false);
  const [refs, setRefs] = useState<string[]>(editing?.refs ?? []);
  const [refsOpen, setRefsOpen] = useState(false);

  const nextCode = useMemo(() => {
    if (editing) return editing.code;
    const nextIndex = vaultCards.length + 1;
    const letter = String.fromCharCode(65 + Math.min(25, Math.ceil(nextIndex / 9) - 1));
    const number = nextIndex % 9 === 0 ? 9 : nextIndex % 9;
    return `#1${letter}${nextIndex <= 9 ? "" : number}`;
  }, [editing, vaultCards.length]);

  const canSave = title.trim().length > 0 && body.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const finalSource = [source.trim(), link.trim()].filter(Boolean).join(" — ");
    const finalRefs = refs;

    if (editing) {
      updateZettelCard(editing.id, {
        title: title.trim(),
        body: body.trim(),
        source: finalSource,
        refs: finalRefs,
        image,
      });
      toast("Carte mise à jour", "accent");
      navigate(`/vault/${id}/fiches?card=${encodeURIComponent(editing.code)}`, { replace: true });
      return;
    } else {
      const created = addZettelCard({
        vaultId: id,
        title: title.trim(),
        body: body.trim(),
        source: finalSource,
        refs: finalRefs,
      });
      toast("Carte ajoutée au vault", "accent");
      navigate(`/vault/${id}/fiches?card=${encodeURIComponent(created.code)}`, { replace: true });
      return;
    }
    navigate(`/vault/${id}/fiches`, { replace: true });
  };

  if (!vault) {
    return (
      <Screen className="px-5">
        <p className="mt-10 text-center text-muted">Vault introuvable.</p>
      </Screen>
    );
  }

  return (
    <Screen className="px-5">
      <header className="flex h-14 items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(`/vault/${id}/fiches`)}
          className="-ml-0 h-11 text-[16px] font-medium"
        >
          Annuler
        </button>
        <h1 className="font-serif text-[17px] font-semibold">
          {editing ? "Modifier la carte" : "Nouvelle carte"}
        </h1>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="h-10 rounded-[20px] bg-accent px-4 text-[15px] font-semibold text-on-accent disabled:opacity-40"
        >
          Enregistrer
        </button>
      </header>

      {/* Un modèle ne crée pas la carte : il en pose la charpente, que
          l’utilisateur réécrit. Les six fiches couvrent lecture, idée,
          question, concept, méthode, argument. */}
      {!editing && (
        <div className="mt-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <Sparkle size={14} weight="fill" className="text-accent" aria-hidden />
            Partir d’un modèle
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ZETTEL_TEMPLATES.map((template) => {
              const active = title === titleFromTemplate(template.title);
              return (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={active}
                  title={template.intent}
                  onClick={() => {
                    setTitle(titleFromTemplate(template.title));
                    setBody(template.body);
                    if (template.source) setSource(template.source);
                    setRefs(template.refs);
                    toast(`Modèle « ${template.name} » chargé`);
                  }}
                  className={cn(
                    "h-9 rounded-[18px] border px-3 text-[12.5px] font-medium",
                    active
                      ? "border-accent bg-accent-soft text-accent-ink"
                      : "border-line bg-surface text-ink",
                  )}
                >
                  {template.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 rounded-sheet border border-line bg-surface p-[22px] shadow-lift">
        <div className="text-[14px] font-semibold text-accent">
          {nextCode} · Vault {vault.name}
        </div>

        <label
          htmlFor="zettel-title"
          className="mt-4 block text-[14px] text-muted"
        >
          Titre de l’idée
        </label>
        <input
          id="zettel-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Une idée, en quelques mots"
          className="field-line font-serif text-[22px] font-semibold"
          style={{ lineHeight: 1.35 }}
        />

        <label
          htmlFor="zettel-body"
          className="mt-4 block text-[14px] text-muted"
        >
          Dans vos propres mots
        </label>
        <textarea
          id="zettel-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          placeholder="Reformulez l’idée sans copier la source."
          className="field-line resize-none text-[16px] leading-[28px]"
          style={{ fontFamily: "Literata, Georgia, serif" }}
        />

        <label
          htmlFor="zettel-source"
          className="mt-4 block text-[14px] text-muted"
        >
          Source ou référence
        </label>
        <input
          id="zettel-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="Auteur, ouvrage, page"
          className="field-line text-[16px]"
        />

        {showLink && (
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://…"
            inputMode="url"
            aria-label="Lien"
            className="field-line mt-3 text-[15px]"
          />
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImage((value) => !value)}
            aria-pressed={image}
            className={cn(
              "flex h-11 items-center gap-1.5 rounded-[22px] border px-3.5 text-[14px] font-medium",
              image
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line bg-surface",
            )}
          >
            <ImageSquare size={18} /> Image
          </button>
          <button
            type="button"
            onClick={() => setShowLink((value) => !value)}
            aria-pressed={showLink}
            className={cn(
              "flex h-11 items-center gap-1.5 rounded-[22px] border px-3.5 text-[14px] font-medium",
              showLink
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line bg-surface",
            )}
          >
            <LinkSimple size={18} /> Lien
          </button>
          <button
            type="button"
            onClick={() => setRefsOpen(true)}
            className="flex h-11 items-center gap-1.5 rounded-[22px] border border-line bg-surface px-3.5 text-[14px] font-medium"
          >
            <LinkSimple size={18} /> Référence
          </button>
        </div>

        {image && (
          <div className="mt-3 flex h-24 items-center justify-center rounded-card border border-dashed border-line-strong text-[14px] text-muted">
            Image jointe (prototype)
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {refs.map((ref) => {
            const target = vaultCards.find((c) => c.code === ref);
            return (
              <span
                key={ref}
                className="inline-flex items-center gap-1.5 rounded-rect bg-accent-soft px-2.5 py-1 text-[14px] font-medium text-accent-ink"
              >
                Voir {ref}
                {target ? ` · ${target.title}` : ""}
                <button
                  type="button"
                  aria-label={`Retirer la référence ${ref}`}
                  onClick={() => setRefs((list) => list.filter((r) => r !== ref))}
                >
                  <X size={14} weight="bold" />
                </button>
              </span>
            );
          })}
        </div>
      </div>

      <p className="mx-1 mt-4 text-[14px] leading-[21px] text-muted">
        Une carte, une seule idée, écrite avec vos mots. Notez toujours la
        source : sans elle, la carte n’est qu’une rumeur.
      </p>

      <Sheet
        open={refsOpen}
        onClose={() => setRefsOpen(false)}
        title="Relier à une carte"
      >
        <p className="mb-3 text-[14px] leading-[21px] text-muted">
          Les références sont manuelles, comme chez Luhmann. Choisissez la carte
          que cette idée éclaire.
        </p>
        <div className="flex flex-col gap-2">
          {vaultCards
            .filter((card) => card.id !== editing?.id)
            .map((card) => {
              const active = refs.includes(card.code);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() =>
                    setRefs((list) =>
                      active
                        ? list.filter((r) => r !== card.code)
                        : [...list, card.code],
                    )
                  }
                  className={cn(
                    "row",
                    active && "border-accent bg-accent-soft",
                  )}
                >
                  <span className="w-12 shrink-0 text-[13px] font-semibold text-accent">
                    {card.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-serif text-[16px] font-semibold">
                    {card.title}
                  </span>
                  {active && (
                    <span className="text-[13px] font-semibold text-accent-ink">
                      Liée
                    </span>
                  )}
                </button>
              );
            })}
        </div>
        <button
          type="button"
          className="btn-primary mt-4 w-full"
          onClick={() => setRefsOpen(false)}
        >
          Terminé
        </button>
      </Sheet>
    </Screen>
  );
}
