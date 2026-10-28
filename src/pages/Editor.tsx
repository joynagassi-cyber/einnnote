import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowFatLineRight,
  BookOpen,
  Check,
  Copy,
  DotsThree,
  DownloadSimple,
  IdentificationCard,
  Sparkle,
  Stack,
  Trash,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen, Sheet } from "@/components/Layout";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { Fiche } from "@/components/note/Fiche";
import { FicheWindow } from "@/components/note/FicheWindow";
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
  const allVaults = useContentStore((s) => s.vaults);
  const projects = useContentStore((s) => s.projects);
  const replaceBlocks = useContentStore((s) => s.replaceBlocks);
  const addQuestion = useContentStore((s) => s.addQuestion);
  const deleteQuestion = useContentStore((s) => s.deleteQuestion);
  const trashNote = useContentStore((s) => s.trashNote);
  const canvas = useAppStore((s) => s.settings.canvas);
  const desktop = useIsDesktop();
  const toast = useToast((s) => s.show);

  /* Les catégories du projet de la note : on ne propose que celles-là, sinon
     une note changerait de projet par un simple select. */
  const projectVaults = useMemo(
    () => allVaults.filter((vault) => vault.projectId === note?.projectId),
    [allVaults, note?.projectId],
  );

  const [sheet, setSheet] = useState<
    "none" | "ask" | "questions" | "menu" | "templates"
  >("none");
  const [draft, setDraft] = useState("");
  /* L’éditeur ne relit pas les blocs de l’extérieur : quand un modèle ajoute
     des sections, on le remonte explicitement (et seulement dans ce cas). */
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");
  /* Lecture : le texte seul. Le pupitre, la barre et la personnalisation
     disparaissent — c’est la seule façon de lire sans être sollicité. */
  const [reading, setReading] = useState(false);
  /* Le pupitre se range depuis la fiche (clavier) comme par appui long. */
  const [ranging, setRanging] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
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

  const copyLink = async () => {
    if (!note) return;
    const url = `${window.location.origin}/note/${note.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Lien de la note copié", "accent");
    } catch {
      toast("Le navigateur a refusé l’accès au presse-papiers");
    }
    setSheet("none");
  };

  const moveToProject = (projectId: string) => {
    if (!note) return;
    /* Un vault appartient à un projet : changer de projet sans vider le vault
       laisserait la note dans une catégorie d’un autre projet. */
    const keepVault = allVaults.some(
      (vault) => vault.id === note.vaultId && vault.projectId === projectId,
    );
    updateNote(note.id, {
      projectId,
      vaultId: keepVault ? note.vaultId : undefined,
    });
    setSheet("none");
    toast("Note déplacée", "accent");
  };

  const fiche = (
    <Fiche
      title={note.title}
      vaults={projectVaults.map((vault) => ({ id: vault.id, name: vault.name }))}
      vaultId={note.vaultId}
      projects={projects.map((project) => ({ id: project.id, name: project.name }))}
      projectId={note.projectId}
      onVault={(vaultId) => {
        updateNote(note.id, { vaultId });
        const target = projectVaults.find((vault) => vault.id === vaultId);
        toast(
          target ? `Note rangée dans « ${target.name} »` : "Note retirée du vault",
          target ? "accent" : undefined,
        );
      }}
      onProject={moveToProject}
      onRename={() => {
        setSheet("none");
        titleRef.current?.focus();
        titleRef.current?.select();
      }}
      onReading={() => {
        setSheet("none");
        setReading(true);
      }}
      onFind={(mode) => {
        setSheet("none");
        setFindMode(mode);
        setFindOpen(true);
      }}
      onExport={exportMarkdown}
      onCopyText={copyAll}
      onCopyLink={copyLink}
      onTemplate={
        note.method === "outline" || note.method === "cornell"
          ? () => setSheet("templates")
          : undefined
      }
      onArrange={
        desktop
          ? undefined
          : () => {
              setSheet("none");
              setRanging(true);
            }
      }
      onTrash={() => {
        trashNote(note.id);
        setSheet("none");
        toast("Note déplacée dans la corbeille");
        navigate("/");
      }}
    />
  );

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

  /* Ctrl/⌘ . — la fiche, partout dans l’éditeur. Le raccourci d’Obsidian pour
     la palette est `Ctrl+P` ; ici la palette tient déjà `Ctrl/⌘ K`, et la
     fiche prend le point, comme les inspecteurs de mise en page. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "." || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setSheet((current) => (current === "menu" ? "none" : "menu"));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* Échap quitte la lecture : c’est le seul geste de sortie dont on se
     souvienne sans lire une consigne. */
  useEffect(() => {
    if (!reading) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReading(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reading]);

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
    <div
      className="paper screen screen-editor"
      data-canvas={canvas}
      data-reading={reading ? "true" : undefined}
    >
      <div className="sticky top-0 z-20 glass">
        <AppBar
          back
          onBack={() => navigate("/")}
          action={
            desktop ? (
              <button
                type="button"
                onClick={() => setSheet("menu")}
                aria-label="Fiche de la note (Ctrl + .)"
                className="pill-quiet flex h-10 items-center gap-1.5 px-3.5 text-[14px]"
              >
                <IdentificationCard size={17} weight="duotone" aria-hidden />
                Fiche
                <kbd className="kbd-shortcut" aria-hidden>Ctrl .</kbd>
              </button>
            ) : (
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
            ref={titleRef}
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
            {!desktop && (
              <button
                type="button"
                className="icon-btn -mr-2 h-9 w-9"
                aria-label="Fiche de la note"
                onClick={() => setSheet("menu")}
              >
                <DotsThree size={22} weight="bold" />
              </button>
            )}
          </div>
        </div>

        <NoteEditor
          key={`${note.id}:${editorEpoch}`}
          blocks={note.blocks}
          reading={reading}
          onFiche={() => setSheet("menu")}
          onToggleReading={() => setReading((value) => !value)}
          ranging={ranging}
          onRangingChange={setRanging}
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

      {/* La fiche : fenêtre flottante sur bureau, feuille sur téléphone.
          C’est le même composant — un seul contenu à maintenir, deux cadres. */}
      {desktop ? (
        sheet === "menu" && (
          <FicheWindow onClose={() => setSheet("none")}>
            {fiche}
          </FicheWindow>
        )
      ) : (
        <Sheet
          open={sheet === "menu"}
          onClose={() => setSheet("none")}
          title="Cette note"
        >
          {fiche}
        </Sheet>
      )}

      {/* Lecture : une seule sortie, discrète et toujours au même endroit. */}
      {reading && (
        <button
          type="button"
          onClick={() => setReading(false)}
          className="lecture-sortie"
          aria-label="Quitter la lecture"
        >
          <BookOpen size={16} weight="duotone" aria-hidden />
          Quitter la lecture
          <kbd aria-hidden>Échap</kbd>
        </button>
      )}

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
