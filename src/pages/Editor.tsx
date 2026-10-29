import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CaretRight,
  ChatsCircle,
  PencilSimple,
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
import { NoteEditor, type NoteEditorHandle } from "@/components/editor/NoteEditor";
import { Fiche } from "@/components/note/Fiche";
import { MindCanvas } from "@/components/canvas/MindCanvas";
import { FicheWindow } from "@/components/note/FicheWindow";
import { DisplayMenu } from "@/components/DisplayMenu";
import { NoteTemplateGallery } from "@/components/TemplateGallery";
import { groupItems, sortItems, type DisplayFields } from "@/lib/display";
import { useSurfacePrefs } from "@/stores/useDisplayStore";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/stores/useToast";
import { cn } from "@/lib/utils";
import { METHODS } from "@/lib/methods";
import { blocksToMarkdown } from "@/lib/editor/blocks";
import { backlinksTo, outgoingFrom } from "@/lib/links/notes";
import { buildTagIndex } from "@/lib/editor/tags";
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
  const allNotes = useContentStore((s) => s.notes);
  const createNote = useContentStore((s) => s.createNote);
  const allTags = useContentStore((s) => s.tags);
  /* La planche d’un tableau blanc est la carte mentale de la note : une seule
     table, donc, et un seul état — la planche du texte et la page Carte mentale
     montrent la même chose. */
  const allMaps = useContentStore((s) => s.mindmaps);
  const boardMap = useMemo(
    () =>
      allMaps.find((m) => m.id === note?.mindmapId || m.noteId === note?.id),
    [allMaps, note?.id, note?.mindmapId],
  );
  /* Les notes qu’on peut lier : pas soi-même, pas la corbeille. */
  /* Le texte d’une note, sans balises : c’est ce que lisent les liens. */
  const plainText = (blocks: Block[]) =>
    blocks.map((block) => block.html.replace(/<[^>]+>/g, " ")).join("\n");
  /* La base des étiquettes, croisée avec l’usage réel : c’est la liste que
     propose `#`. Les notes en corbeille ne comptent pas. */
  const tagIndex = useMemo(() => buildTagIndex(allNotes, allTags ?? []), [allNotes, allTags]);
  const liveNotes = useMemo(
    () =>
      allNotes
        .filter((candidate) => candidate.id !== id && !candidate.deletedAt)
        .map((candidate) => ({ id: candidate.id, title: candidate.title })),
    [allNotes, id],
  );
  const replaceBlocks = useContentStore((s) => s.replaceBlocks);
  const addQuestion = useContentStore((s) => s.addQuestion);
  const deleteQuestion = useContentStore((s) => s.deleteQuestion);
  const trashNote = useContentStore((s) => s.trashNote);
  /* Une note n’a pas de « canevas » : elle a un papier. Uni (clair ou sombre,
     selon le thème) ou ligné. Les pointillés appartiennent aux cartes et aux
     graphes, pas à une page de texte. */
  const notePaper = useAppStore((s) => s.settings.notePaper);
  const desktop = useIsDesktop();
  const toast = useToast((s) => s.show);

  /* Les catégories du projet de la note : on ne propose que celles-là, sinon
     une note changerait de projet par un simple select. */
  const projectVaults = useMemo(
    () => allVaults.filter((vault) => vault.projectId === note?.projectId),
    [allVaults, note?.projectId],
  );

  const [sheet, setSheet] = useState<"none" | "ask" | "menu" | "templates">("none");
  /* Le panneau des questions n’est pas une fenêtre : c’est un **côté** de la
     feuille. Sur bureau il est ouvert d’emblée (la colonne Cornell) ; sur
     téléphone il s’ouvre d’un glissement depuis le bord droit, et il ne recouvre
     jamais le texte d’un voile — on doit sentir le texte derrière. */
  const [questionsOpen, setQuestionsOpen] = useState(desktop);
  /* Tableau blanc : le texte et la planche sont **deux vues du même travail**.
     Sur téléphone on passe de l’une à l’autre ; en bureau on peut les tenir
     côte à côte, parce que c’est là qu’on relie une phrase à une forme. */
  const [boardMode, setBoardMode] = useState<"text" | "board" | "split">(
    desktop ? "split" : "text",
  );
  const [panelDrag, setPanelDrag] = useState(0);
  const swipeFrom = useRef<number | null>(null);
  const [draft, setDraft] = useState("");
  /* L’éditeur ne relit pas les blocs de l’extérieur : quand un modèle ajoute
     des sections, on le remonte explicitement (et seulement dans ce cas). */
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");
  /* Lecture : le texte seul. Le pupitre, la barre et la personnalisation
     disparaissent — c’est la seule façon de lire sans être sollicité. */
  const [reading, setReading] = useState(false);
  const editorRef = useRef<NoteEditorHandle>(null);
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
    setQuestionsOpen(true);
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

  const noteRefs = useMemo(
    () =>
      allNotes
        .filter((candidate) => !candidate.deletedAt)
        .map((candidate) => ({ id: candidate.id, title: candidate.title })),
    [allNotes],
  );
  const backlinks = useMemo(() => {
    if (!note) return [];
    const sources = allNotes
      .filter((candidate) => !candidate.deletedAt && candidate.id !== note.id)
      .map((candidate) => ({
        note: { id: candidate.id, title: candidate.title },
        text: plainText(candidate.blocks),
      }));
    return backlinksTo({ id: note.id, title: note.title }, sources);
  }, [allNotes, note]);
  const outgoing = useMemo(
    () => (note ? outgoingFrom(plainText(note.blocks), noteRefs) : []),
    [note, noteRefs],
  );

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
        /* La barre de recherche vit dans le compositeur : en lecture, elle est
           masquée. Chercher doit donc sortir de la lecture d’abord. */
        setReading(false);
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
      backlinks={backlinks.map((link) => ({
        id: link.from.id,
        title: link.from.title,
        excerpt: link.excerpt,
      }))}
      outgoing={outgoing.map((link) => ({ title: link.title, id: link.note?.id }))}
      onOpenLink={(noteId) => {
        setSheet("none");
        navigate(`/note/${noteId}`);
      }}
      onLinkNote={
        desktop
          ? () => editorRef.current?.link()
          : undefined
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

  /* Échap replie le panneau des questions — sauf si un menu ou une fenêtre est
     ouvert devant : Échap appartient alors à ce qui est devant. */
  useEffect(() => {
    if (!questionsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="menu"],[role="dialog"]')) return;
      setQuestionsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [questionsOpen]);

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
  const isBoard = note.method === "whiteboard";
  const showText = !isBoard || boardMode !== "board";
  const showBoard = isBoard && boardMode !== "text" && Boolean(boardMap);

  /* **La bascule de mode.** Une icône, tout de suite à gauche du menu de la
     fiche (le « ⋯ » sur téléphone) : on change de mode sans ouvrir un panneau,
     parce que lire et écrire sont deux gestes de la même seconde.
     L’icône montre ce qu’on obtient, pas l’état courant : en écriture elle
     propose la lecture. */
  /* La bascule texte / planche du tableau blanc. Elle vit dans l’en-tête et non
     dans la colonne de texte : en vue « Planche », elle disparaîtrait avec le
     texte qu’elle sert justement à retrouver. */
  const boardToggle = isBoard ? (
    <span
      role="group"
      aria-label="Vue du tableau blanc"
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-line p-0.5"
    >
      {(
        [
          { value: "text", label: "Texte" },
          { value: "board", label: "Planche" },
          ...(desktop ? [{ value: "split", label: "Les deux" }] : []),
        ] as { value: "text" | "board" | "split"; label: string }[]
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setBoardMode(option.value)}
          aria-pressed={boardMode === option.value}
          className={cn(
            "h-7 rounded-full px-2.5 text-[12px] font-semibold",
            boardMode === option.value ? "bg-accent-soft text-accent-ink" : "text-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </span>
  ) : null;

  const modeSwitch = (
    <button
      type="button"
      onClick={() => setReading((value) => !value)}
      aria-label={reading ? "Revenir à l’écriture" : "Passer en lecture"}
      aria-pressed={reading}
      title={reading ? "Revenir à l’écriture" : "Lecture, sans barre ni sollicitation"}
      className={
        desktop
          ? "pill-quiet flex h-10 items-center gap-1.5 px-3 text-[14px]"
          : "icon-btn h-10 w-10"
      }
    >
      {reading ? (
        <PencilSimple size={desktop ? 17 : 21} weight="duotone" aria-hidden />
      ) : (
        <BookOpen size={desktop ? 17 : 21} weight="duotone" aria-hidden />
      )}
      {desktop && (reading ? "Écrire" : "Lecture")}
    </button>
  );

  return (
    <div
      className="paper screen screen-editor"
      data-sheet={notePaper}
      data-reading={reading ? "true" : undefined}
    >
      <div className="sticky top-0 z-20 glass">
        <AppBar
          back
          onBack={() => navigate("/")}
          action={
            desktop ? (
              <>
                {boardToggle}
                {modeSwitch}
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
              </>
            ) : (
              boardToggle ?? undefined
            )
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 items-start">
      <main className={cn("min-w-0 flex-1", showBoard && boardMode === "split" && "flex items-stretch")}>
        <div className={cn("min-w-0", showBoard && boardMode === "split" && "flex-1")}>
        <div className="px-5 pt-1 lg:px-10">
          <input
            ref={titleRef}
            value={note.title}
            onChange={(event) => updateNote(note.id, { title: event.target.value })}
            placeholder="Titre de la note"
            aria-label="Titre de la note"
            className="w-full bg-transparent font-serif text-[26px] font-semibold leading-[32px] outline-none placeholder:text-muted"
          />

          <div className="mb-1 mt-1 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-muted">
              {/* Le côté des questions s’ouvre d’ici : une icône fine, collée au
                  coin haut-gauche du texte. Pas de bande, pas de flèche de
                  20 px qui vole la moitié de la marge. */}
              <button
                type="button"
                onClick={() => setQuestionsOpen((value) => !value)}
                aria-expanded={questionsOpen}
                aria-label={
                  questionsOpen
                    ? "Replier le panneau des questions"
                    : "Ouvrir le panneau des questions"
                }
                title={questionsOpen ? "Replier les questions" : "Questions de la note"}
                className={cn(
                  "-ml-1 flex h-7 shrink-0 items-center gap-1 rounded-full px-1.5",
                  questionsOpen ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-surface-2",
                )}
              >
                <ChatsCircle size={16} weight={questionsOpen ? "fill" : "regular"} aria-hidden />
                {questions.length > 0 && (
                  <span className="tabnum text-[11.5px] font-bold">{questions.length}</span>
                )}
              </button>
              <MethodIcon size={16} aria-hidden />
              {METHODS[note.method].label}
            </span>
            {!desktop && (
              <span className="flex items-center gap-0.5">
                {modeSwitch}
                <button
                  type="button"
                  className="icon-btn -mr-2 h-10 w-10"
                  aria-label="Fiche de la note"
                  onClick={() => setSheet("menu")}
                >
                  <DotsThree size={22} weight="bold" />
                </button>
              </span>
            )}
          </div>
        </div>

        {showText && (
        <NoteEditor
          key={`${note.id}:${editorEpoch}`}
          ref={editorRef}
          blocks={note.blocks}
          reading={reading}
          noteId={note.id}
          notes={liveNotes}
          tags={tagIndex}
          onOpenNote={(target) => navigate(`/note/${target.id}`)}
          onCreateNote={(title) => {
            const created = createNote(note.method, {
              title,
              projectId: note.projectId,
              ...(note.vaultId ? { vaultId: note.vaultId } : {}),
            });
            toast(`Note « ${title} » créée`, "accent");
            return { id: created.id, title: created.title };
          }}
          onFiche={() => setSheet("menu")}
          onToggleReading={() => setReading((value) => !value)}
          onChange={(blocks: Block[]) => replaceBlocks(note.id, blocks)}
          markers={markers}
          onBadgeClick={(blockId) => {
            setQuestionsOpen(true);
            window.setTimeout(() => jumpTo(blockId), 150);
          }}
          onAsk={(payload) => {
            setPending(payload);
            setDraft("");
            setSheet("ask");
          }}
        />
        )}
        </div>

        {showBoard && (
          <div className={cn("board-pane relative min-w-0", boardMode === "split" ? "w-[46%] shrink-0 border-l border-line" : "flex-1")}>
            <MindCanvas
              mapId={boardMap?.id ?? ""}
              onOpenFull={() => navigate(`/mindmap/${boardMap?.id ?? ""}`)}
            />
          </div>
        )}
      </main>

      {/* Les questions vivent **à côté** du texte, jamais devant.
          C’est le geste Cornell : la colonne d’indices reste visible pendant
          qu’on écrit, et sur téléphone elle arrive par le bord, sans voile. */}
      <aside
        className="editor-aside"
        role="complementary"
        aria-label="Questions de la note"
        data-open={questionsOpen ? "true" : "false"}
        aria-hidden={!questionsOpen}
        /* Replié, le panneau est hors champ **et** hors du parcours clavier :
           un élément qu’on ne voit pas ne doit pas attraper le focus. */
        inert={!questionsOpen}
        style={{ ["--panel-drag" as string]: `${panelDrag}px` }}
        onPointerDown={(event) => {
          if (desktop) return;
          swipeFrom.current = event.clientX;
        }}
        onPointerMove={(event) => {
          if (desktop || swipeFrom.current === null) return;
          const dx = event.clientX - swipeFrom.current;
          if (dx > 0) setPanelDrag(dx);
        }}
        onPointerUp={() => {
          if (desktop) return;
          if (panelDrag > 64) setQuestionsOpen(false);
          setPanelDrag(0);
          swipeFrom.current = null;
        }}
        onPointerCancel={() => {
          setPanelDrag(0);
          swipeFrom.current = null;
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="flex-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
            Questions
          </span>
          <button
            type="button"
            onClick={() => setQuestionsOpen(false)}
            aria-label="Replier le panneau des questions"
            title="Replier (Échap)"
            className="icon-btn h-8 w-8"
          >
            <CaretRight size={17} weight="bold" />
          </button>
        </div>
        <QuestionsPanel
          questions={questions}
          groups={questionGroups}
          display={display}
          onJump={(blockId) => {
            jumpTo(blockId);
            if (!desktop) setQuestionsOpen(false);
          }}
          onDelete={(question) => {
            deleteQuestion(question.id);
            toast("Question supprimée, carte archivée");
          }}
          showMenu
        />
      </aside>
      </div>

      {/* Sur téléphone, le bord droit est la poignée du panneau : on glisse
          vers la gauche pour l’ouvrir. Aucune flèche dessinée. */}
      {!desktop && !questionsOpen && (
        <div
          aria-hidden="true"
          onPointerDown={(event) => {
            swipeFrom.current = event.clientX;
          }}
          onPointerMove={(event) => {
            if (swipeFrom.current === null) return;
            if (event.clientX - swipeFrom.current < -36) {
              setQuestionsOpen(true);
              swipeFrom.current = null;
            }
          }}
          onPointerUp={() => {
            swipeFrom.current = null;
          }}
          className="fixed inset-y-1/4 right-0 z-[24] w-2.5 touch-pan-y"
        />
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
