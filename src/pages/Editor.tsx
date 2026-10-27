import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowFatLineRight,
  Check,
  Copy,
  DotsThree,
  DownloadSimple,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen, Sheet } from "@/components/Layout";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { DisplayMenu } from "@/components/DisplayMenu";
import { NoteTemplateGallery } from "@/components/TemplateGallery";
import { groupItems, sortItems, type DisplayFields } from "@/lib/display";
import { useSurfacePrefs } from "@/stores/useDisplayStore";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/stores/useToast";
import { METHODS } from "@/lib/methods";
import { blocksToMarkdown } from "@/lib/editor/blocks";
import { noteTemplatesFor, type NoteTemplate } from "@/lib/templates/notes";
import { blocksFromTemplate } from "@/lib/templates/apply";
import type { Block } from "@/types";

export default function Editor() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const note = useContentStore((s) => s.notes.find((n) => n.id === id));
  const allQuestions = useContentStore((s) => s.questions);
  const allLinks = useContentStore((s) => s.links);
  const updateNote = useContentStore((s) => s.updateNote);
  const replaceBlocks = useContentStore((s) => s.replaceBlocks);
  const addQuestion = useContentStore((s) => s.addQuestion);
  const deleteQuestion = useContentStore((s) => s.deleteQuestion);
  const trashNote = useContentStore((s) => s.trashNote);
  const canvas = useAppStore((s) => s.settings.canvas);
  const desktop = useIsDesktop();
  const toast = useToast((s) => s.show);

  const [sheet, setSheet] = useState<
    "none" | "ask" | "questions" | "menu" | "templates"
  >("none");
  const [draft, setDraft] = useState("");
  /* L’éditeur ne relit pas les blocs de l’extérieur : quand un modèle ajoute
     des sections, on le remonte explicitement (et seulement dans ce cas). */
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [pending, setPending] = useState<{ blockId: string; text: string } | null>(
    null,
  );

  const questions = useMemo(
    () =>
      allQuestions
        .filter((q) => q.noteId === id)
        .map((q) => {
          const link = allLinks.find((l) => l.questionId === q.id);
          return {
            ...q,
            blockId: link?.blockId ?? "",
            passage: link?.passage ?? "",
          };
        })
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .map((q, index) => ({ ...q, number: index + 1 })),
    [allQuestions, allLinks, id],
  );

  /* Affichage du panneau de questions : le même menu que la bibliothèque,
     adapté — ici on groupe par ancrage et on trie par numéro. */
  const { prefs: display } = useSurfacePrefs("questions");
  const questionFields: DisplayFields<(typeof questions)[number]> = useMemo(
    () => ({
      number: { label: "Numéro", value: (question) => question.number, type: "number" },
      text: { label: "Texte", value: (question) => question.text },
      created: {
        label: "Créée",
        value: (question) => question.createdAt,
        type: "date",
      },
      anchor: {
        label: "Ancrage",
        value: (question) => (question.blockId ? "Ancrée" : "Orpheline"),
      },
      length: {
        label: "Longueur du passage",
        value: (question) => question.passage.length,
        type: "number",
      },
    }),
    [],
  );
  const questionGroups = useMemo(() => {
    const ordered = sortItems(questions, questionFields, [
      display.sortBy,
      display.thenBy,
    ]);
    return groupItems(ordered, questionFields, display.groupBy);
  }, [questions, questionFields, display.sortBy, display.thenBy, display.groupBy]);

  const markers = useMemo(() => {
    const map = new Map<string, number[]>();
    questions.forEach((q) => {
      if (!q.blockId) return;
      map.set(q.blockId, [...(map.get(q.blockId) ?? []), q.number]);
    });
    return map;
  }, [questions]);

  const flashBlock = useCallback((blockId: string) => {
    const el = document.querySelector<HTMLElement>(
      `[data-block-id="${blockId}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("animate-mark-flash");
    window.setTimeout(() => el.classList.remove("animate-mark-flash"), 2600);
  }, []);

  /* Arrivée depuis la révision : ouvrir la question et montrer le passage */
  const targetQuestion = searchParams.get("q");
  useEffect(() => {
    if (!targetQuestion) return;
    const link = allLinks.find((l) => l.questionId === targetQuestion);
    if (!link) return;
    setSheet("questions");
    const timer = window.setTimeout(() => flashBlock(link.blockId), 340);
    return () => window.clearTimeout(timer);
  }, [targetQuestion, allLinks, flashBlock]);

  const jumpTo = (blockId: string) => {
    setSheet("none");
    flashBlock(blockId);
  };

  const createCard = () => {
    if (!note || !pending || !draft.trim()) return;
    addQuestion({
      noteId: note.id,
      text: draft.trim(),
      blockId: pending.blockId,
      passage: pending.text,
    });
    setSheet("none");
    setDraft("");
    setPending(null);
    toast("1 carte créée", "accent");
  };

  const exportMarkdown = () => {
    if (!note) return;
    const body = blocksToMarkdown(note.blocks);
    const qs = questions
      .map((q) => `Q${q.number}. ${q.text}\n> ${q.passage}`)
      .join("\n\n");
    const markdown = `# ${note.title}\n\n${body}\n\n## Questions\n\n${qs || "Aucune question."}\n`;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title.replace(/[^\p{L}\p{N} -]/gu, "").trim() || "note"}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setSheet("none");
    toast("Note exportée en Markdown", "accent");
  };

  const copyAll = async () => {
    if (!note) return;
    await navigator.clipboard.writeText(blocksToMarkdown(note.blocks));
    setSheet("none");
    toast("Texte copié", "accent");
  };

  /* Insérer les sections d’un modèle dans une note déjà commencée : on
     n’écrase rien, on ajoute seulement les titres absents. C’est le remix
     demandé — le modèle sert de charpente, pas de gabarit fermé. */
  const insertTemplate = (template: NoteTemplate) => {
    if (!note) return;
    const normalize = (html: string) => html.replace(/<[^>]+>/g, "").trim();
    const existing = new Set(note.blocks.map((block) => normalize(block.html)));
    const fresh = blocksFromTemplate(template.blocks).filter(
      (block) => !existing.has(normalize(block.html)),
    );
    if (fresh.length === 0) {
      setSheet("none");
      toast("Ce modèle est déjà en place");
      return;
    }
    replaceBlocks(note.id, [...note.blocks, ...fresh]);
    setEditorEpoch((value) => value + 1);
    setSheet("none");
    toast(`Sections « ${template.name} » ajoutées`, "accent");
  };

  if (!note) {
    return (
      <Screen className="screen-note">
        <AppBar back onBack={() => navigate("/")} title="" />
        <EmptyState
          title="Note introuvable"
          description="Cette note n’existe pas ou a été déplacée dans la corbeille."
          action={
            <button type="button" className="btn-primary" onClick={() => navigate("/")}>
              Retour à la bibliothèque
            </button>
          }
        />
      </Screen>
    );
  }

  const MethodIcon = METHODS[note.method].icon;

  return (
    <div className="paper screen screen-editor" data-canvas={canvas}>
      <div className="sticky top-0 z-20 glass">
        <AppBar
          back
          onBack={() => navigate("/")}
          action={
            desktop ? undefined : (
              <button
                type="button"
                onClick={() => setSheet("questions")}
                className="pill-accent h-10 px-3.5 text-[14px]"
              >
                Questions {questions.length}
              </button>
            )
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 items-start">
      <main className="min-w-0 flex-1 px-5 pt-1 lg:px-10">
        <div className="pr-1">
          <input
            value={note.title}
            onChange={(event) => updateNote(note.id, { title: event.target.value })}
            placeholder="Titre de la note"
            aria-label="Titre de la note"
            className="w-full bg-transparent font-serif text-[26px] font-semibold leading-[32px] outline-none placeholder:text-muted"
          />

          <div className="mb-1 mt-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
              <MethodIcon size={16} aria-hidden />
              {METHODS[note.method].label}
              {questions.length > 0 &&
                ` · ${questions.length} question${questions.length > 1 ? "s" : ""}`}
            </span>
            <button
              type="button"
              className="icon-btn -mr-2 h-9 w-9"
              aria-label="Options de la note"
              onClick={() => setSheet("menu")}
            >
              <DotsThree size={22} weight="bold" />
            </button>
          </div>
        </div>

        <NoteEditor
          key={`${note.id}:${editorEpoch}`}
          blocks={note.blocks}
          onChange={(blocks: Block[]) => replaceBlocks(note.id, blocks)}
          markers={markers}
          onBadgeClick={(blockId) => {
            setSheet("questions");
            window.setTimeout(() => jumpTo(blockId), 150);
          }}
          onAsk={(payload) => {
            setPending(payload);
            setDraft("");
            setSheet("ask");
          }}
        />
      </main>

      {/* Bureau : les questions vivent à côté du texte, pas derrière un bouton.
          C’est le geste Cornell — la colonne d’indices est visible. */}
      {desktop && (
        <aside className="editor-aside" aria-label="Questions de la note">
          <QuestionsPanel
            questions={questions}
            groups={questionGroups}
            display={display}
            onJump={jumpTo}
            onDelete={(question) => {
              deleteQuestion(question.id);
              toast("Question supprimée, carte archivée");
            }}
            showMenu
          />
        </aside>
      )}
      </div>

      {/* Ouverture du panneau des questions (mobile) */}
      {!desktop && (
      <button
        type="button"
        aria-label="Ouvrir le panneau des questions"
        onClick={() => setSheet("questions")}
        className="fixed top-[46%] z-20 flex h-20 w-[26px] items-center justify-center rounded-l-[14px] border border-r-0 border-line bg-surface text-accent"
        style={{
          right:
            "max(0px, calc((100vw - var(--rail) - var(--screen-max)) / 2))",
        }}
      >
        <ArrowFatLineRight size={18} weight="bold" />
      </button>
      )}

      {/* Feuille : ajouter une question */}
      <Sheet
        open={sheet === "ask"}
        onClose={() => setSheet("none")}
        title="Ajouter une question"
      >
        {pending && (
          <>
            <p className="mb-1 text-[14px] font-semibold text-muted">
              Passage sélectionné
            </p>
            <p className="passage mb-4 rounded-[6px] px-2.5 py-2 font-serif text-[16px] leading-[26px]">
              {pending.text}
            </p>
            <label
              htmlFor="question-text"
              className="mb-1.5 block text-[14px] font-semibold text-muted"
            >
              Quelle question vous fera retrouver ce passage ?
            </label>
            <textarea
              id="question-text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              autoFocus
              placeholder="Ex. Quelles sont les trois conditions de validité ?"
              className="field resize-none py-3 leading-[24px]"
            />
            <p className="mt-2 text-[13px] leading-[19px] text-muted">
              Cette liaison crée une carte de révision : question au recto,
              votre passage au verso.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setSheet("none")}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={!draft.trim()}
                onClick={createCard}
              >
                Créer la carte
              </button>
            </div>
          </>
        )}
      </Sheet>

      {/* Mobile : la feuille. Bureau : la colonne de droite. */}
      {!desktop && (
        <Sheet
          open={sheet === "questions"}
          onClose={() => setSheet("none")}
          title={`Questions · ${questions.length}`}
        >
          <QuestionsPanel
            questions={questions}
            groups={questionGroups}
            display={display}
            onJump={jumpTo}
            onDelete={(question) => {
              deleteQuestion(question.id);
              toast("Question supprimée, carte archivée");
            }}
            showMenu
          />
        </Sheet>
      )}

      {/* Feuille : options */}
      <Sheet
        open={sheet === "menu"}
        onClose={() => setSheet("none")}
        title="Cette note"
      >
        <div className="flex flex-col">
          <button
            type="button"
            className="flex min-h-[52px] items-center gap-3 border-b border-line text-left text-[16px]"
            onClick={exportMarkdown}
          >
            <DownloadSimple size={20} className="text-muted" />
            Exporter en Markdown
          </button>
          <button
            type="button"
            className="flex min-h-[52px] items-center gap-3 border-b border-line text-left text-[16px]"
            onClick={copyAll}
          >
            <Copy size={20} className="text-muted" />
            Copier le texte
          </button>
          {(note.method === "outline" || note.method === "cornell") && (
            <button
              type="button"
              className="flex min-h-[52px] items-center gap-3 border-b border-line text-left text-[16px]"
              onClick={() => setSheet("templates")}
            >
              <Sparkle size={20} weight="fill" className="text-muted" />
              Insérer un modèle
            </button>
          )}
          <button
            type="button"
            className="flex min-h-[52px] items-center gap-3 text-left text-[16px] text-danger"
            onClick={() => {
              trashNote(note.id);
              setSheet("none");
              toast("Note déplacée dans la corbeille");
              navigate("/");
            }}
          >
            <Trash size={20} />
            Mettre à la corbeille
          </button>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-[19px] text-muted">
          <Check size={16} className="mt-0.5 shrink-0 text-accent" />
          Tout est enregistré sur cet appareil, sans compte ni serveur.
        </p>
      </Sheet>

      {/* Feuille : insérer un modèle de sections */}
      <Sheet
        open={sheet === "templates"}
        onClose={() => setSheet("none")}
        title={`Modèles ${METHODS[note.method].label}`}
        size="wide"
      >
        <p className="mb-3 text-[14px] leading-[21px] text-muted">
          Les sections du modèle s’ajoutent à la suite de la note. Rien de ce
          que vous avez écrit n’est remplacé.
        </p>
        <NoteTemplateGallery
          templates={noteTemplatesFor(note.method as "outline" | "cornell")}
          onPick={insertTemplate}
        />
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panneau des questions — même contenu en feuille (mobile) et en      */
/* colonne latérale (bureau) : une seule implémentation, deux habits.  */
/* ------------------------------------------------------------------ */

function QuestionsPanel({
  questions,
  groups,
  display,
  onJump,
  onDelete,
  showMenu = false,
}: {
  questions: { id: string; number: number; text: string; passage: string; blockId: string }[];
  groups: {
    key: string;
    label: string;
    items: { id: string; number: number; text: string; passage: string; blockId: string }[];
  }[];
  display: { view: string };
  onJump: (blockId: string) => void;
  onDelete: (question: { id: string; number: number }) => void;
  showMenu?: boolean;
}) {
  if (questions.length === 0) {
    return (
      <p className="py-6 text-center text-[14px] leading-[21px] text-muted">
        Aucune question pour l’instant.
        <br />
        Sélectionnez un passage, puis « Créer une question ».
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[12.5px] text-muted">
          {questions.length} question{questions.length > 1 ? "s" : ""}
        </span>
        {showMenu && (
          <DisplayMenu
            surface="questions"
            views={[
              { value: "list", label: "Liste", hint: "Une question par ligne" },
              { value: "grid", label: "Grille", hint: "Par deux" },
            ]}
            defaults={{ sortBy: "number", view: "list" }}
            groupOptions={[
              { value: "anchor", label: "Ancrage" },
              { value: "length", label: "Longueur du passage" },
            ]}
            sortOptions={[
              { value: "number", label: "Numéro" },
              { value: "created", label: "Date de création" },
              { value: "text", label: "Texte A → Z" },
              { value: "length", label: "Longueur du passage" },
            ]}
            label="Trier"
          />
        )}
      </div>

      {groups.map((group) => (
        <div key={group.key} className="mb-3">
          {group.label && (
            <h3 className="mb-1.5 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
              {group.label}
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-bold">
                {group.items.length}
              </span>
            </h3>
          )}
          <ul
            className={
              display.view === "grid"
                ? "grid grid-cols-1 gap-2 xl:grid-cols-2"
                : "flex flex-col gap-2"
            }
          >
            {group.items.map((question) => (
              <li
                key={question.id}
                className="flex items-start gap-2 rounded-card border border-line bg-bg p-3"
              >
                <button
                  type="button"
                  onClick={() => onJump(question.blockId)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="mb-1 flex items-center gap-2">
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1 text-[12px] font-semibold text-on-accent">
                      Q{question.number}
                    </span>
                    <span className="text-[14.5px] font-semibold leading-snug">
                      {question.text}
                    </span>
                  </span>
                  <span className="line-clamp-2 block text-[13.5px] leading-[20px] text-muted">
                    {question.passage}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Supprimer la question ${question.number}`}
                  onClick={() => onDelete(question)}
                  className="icon-btn h-8 w-8 shrink-0 text-muted"
                >
                  <Trash size={17} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="mt-4 text-[13px] leading-[19px] text-muted">
        Une question, un passage : trois sélections liées donnent trois cartes.
      </p>
    </>
  );
}
