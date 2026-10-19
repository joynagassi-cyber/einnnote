import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNoteStore } from "@/stores/useNoteStore";
import { useAppStore } from "@/stores/useAppStore";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import { HeaderBar } from "@/components/ui/HeaderBar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TextB,
  TextItalic,
  ListBullets,
  TextHOne,
  Quotes,
  Code,
  Trash,
  ArrowLeft,
  Question,
  DotsThreeVertical,
  Plus,
  TextAa,
  TextUnderline,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Method } from "@/types";

function EditorToolbar({ onFormat }: { onFormat: (cmd: string) => void }) {
  const btn = "p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] touch-manipulation";
  return (
    <div className="flex items-center gap-1 mb-4 flex-wrap">
      <button className={btn} onClick={() => onFormat("bold")} title="Gras"><TextB weight="fill" className="w-5 h-5" /></button>
      <button className={btn} onClick={() => onFormat("italic")} title="Italique"><TextItalic weight="fill" className="w-5 h-5" /></button>
      <button className={btn} onClick={() => onFormat("formatBlock:H2")} title="Titre"><TextHOne weight="fill" className="w-5 h-5" /></button>
      <button className={btn} onClick={() => onFormat("insertUnorderedList")} title="Liste"><ListBullets weight="fill" className="w-5 h-5" /></button>
      <button className={btn} onClick={() => onFormat("formatBlock:BLOCKQUOTE")} title="Citation"><Quotes weight="fill" className="w-5 h-5" /></button>
      <button className={btn} onClick={() => onFormat("insertCodeBlock")} title="Code"><Code weight="fill" className="w-5 h-5" /></button>
      <div className="w-px h-6 bg-[var(--line)] mx-1" />
      <button className={cn(btn, "text-[hsl(var(--accent))]")} onClick={() => onFormat("addQuestion")} title="Ajouter une question"><Question weight="fill" className="w-5 h-5" /></button>
    </div>
  );
}

function QuestionGutter({ questions, noteId }: { questions: { id: string; text: string }[]; noteId: string }) {
  return (
    <div className="hidden lg:block w-48 flex-shrink-0 border-r border-[var(--line)] pr-4">
      <div className="sticky top-4">
        <h3 className="font-inter text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Questions</h3>
        {questions.length === 0 ? (
          <p className="font-inter text-sm text-[var(--muted)] italic">Sélectionnez du texte et ajoutez une question.</p>
        ) : (
          <div className="space-y-2">
            {questions.map((q) => (
              <div key={q.id} className="p-3 rounded-xl bg-[var(--surface-2)] text-sm font-inter text-[var(--ink)]">
                {q.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getNote, updateNote, addQuestion, getQuestionsForNote } = useNoteStore();
  const { settings } = useAppStore();
  const [title, setTitle] = useState("");
  const [questionMode, setQuestionMode] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const note = id ? getNote(id) : null;
  const questions = note ? getQuestionsForNote(note.id) : [];

  useEffect(() => {
    if (note) {
      setTitle(note.title);
    }
  }, [note]);

  const save = (updates: Partial<typeof note>) => {
    if (!note) return;
    updateNote(note.id, updates);
  };

  const handleTitleChange = (v: string) => {
    setTitle(v);
    save({ title: v });
  };

  const handleFormat = (cmd: string) => {
    if (cmd === "addQuestion") {
      setQuestionMode(!questionMode);
      return;
    }
    if (cmd === "insertCodeBlock") {
      const sel = window.getSelection();
      if (sel && sel.toString() && contentRef.current) {
        const code = document.createElement("code");
        code.className = "bg-[var(--surface-2)] px-1.5 py-0.5 rounded font-mono text-sm";
        code.textContent = sel.toString();
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(code);
      }
      return;
    }
    document.execCommand(cmd, false);
    contentRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const handleContentInput = () => {
    if (!note) return;
    const html = contentRef.current?.innerHTML || "";
    save({ contentJson: { type: "doc", content: parseHTMLToContent(html) } });
  };

  // Simple HTML -> content placeholder
  const parseHTMLToContent = (html: string): any => ({ html });

  const addQuestionFromSelection = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (text && note) {
      const qId = `q-${Date.now()}`;
      addQuestion({ id: qId, noteId: note.id, text, createdAt: new Date().toISOString() });
      setQuestionMode(false);
      setPendingQuestion("");
    }
  };

  if (!note) {
    return (
      <div className="flex min-h-screen bg-[var(--bg)]">
        <DesktopSidebar />
        <PageShell>
          <button onClick={() => navigate("/library")} className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--ink)] mb-4 font-inter focus:outline-none">
            <ArrowLeft weight="bold" className="w-4 h-4" /> Retour
          </button>
          <EmptyState icon={ArrowLeft} title="Note introuvable" description="Cette note n'existe pas ou a été supprimée." />
        </PageShell>
        <AppLayoutMobile />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <DesktopSidebar />
      <PageShell padding="px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--ink)] mb-4 font-inter focus:outline-none">
          <ArrowLeft weight="bold" className="w-4 h-4" /> Retour
        </button>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full text-3xl font-literata font-bold text-[var(--ink)] bg-transparent border-none outline-none mb-4 placeholder:text-[var(--muted)]"
          placeholder="Titre de la note…"
        />

        {/* Toolbar */}
        <div className={cn(
          "sticky top-0 z-10 mb-4 py-2 rounded-xl bg-[var(--bg)]/95 backdrop-blur-sm border-b border-[var(--line)]"
        )}>
          <EditorToolbar onFormat={handleFormat} />
        </div>

        <div className="flex gap-6">
          {/* Question gutter for cornell */}
          {note.method === "cornell" && <QuestionGutter questions={questions} noteId={note.id} />}

          {/* Canvas */}
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleContentInput}
            className={cn(
              settings.canvasBg !== "blank" ? `canvas-${settings.canvasBg}` : "",
              "flex-1 min-h-[60vh] p-6 rounded-2xl bg-[var(--surface)] border border-[var(--line)]",
              "font-literata text-lg leading-[1.75] text-[var(--ink)]",
              "outline-none prose prose-lg max-w-none",
              "prose-headings:font-literata prose-headings:font-semibold prose-headings:text-[var(--ink)]",
              "prose-p:text-[var(--ink)] prose-p:leading-relaxed",
              "prose-blockquote:border-l-[hsl(var(--accent))] prose-blockquote:italic prose-blockquote:text-[var(--muted)]",
              "prose-code:bg-[var(--surface-2)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
              questionMode && "ring-2 ring-[hsl(var(--accent))]/40 rounded-2xl"
            )}
            role="textbox"
            aria-multiline="true"
            aria-label="Contenu de la note"
          />
        </div>

        {/* Question input mode */}
        {questionMode && (
          <div className="mt-4 p-4 rounded-2xl bg-[hsl(var(--accent-soft))] border border-[hsl(var(--accent))]/30">
            <div className="flex items-center gap-2 mb-2">
              <Question weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
              <span className="font-inter text-sm font-semibold text-[hsl(var(--accent))]">Ajouter une question</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={pendingQuestion}
                onChange={(e) => setPendingQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addQuestionFromSelection()}
                placeholder="Votre question…"
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] font-inter text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <button
                onClick={addQuestionFromSelection}
                className="px-4 py-2 rounded-xl bg-[hsl(var(--accent))] text-white font-inter text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Status tag */}
        <div className="mt-6 flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-inter font-medium",
            note.status === "draft" && "bg-[var(--surface-2)] text-[var(--muted)]",
            note.status === "captured" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
            note.status === "questioned" && "bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent))]",
            note.status === "done" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
          )}>
            {note.status === "draft" && "Brouillon"}
            {note.status === "captured" && "Capturé"}
            {note.status === "questioned" && "Questionné"}
            {note.status === "done" && "Terminé"}
          </span>
        </div>
      </PageShell>
      <AppLayoutMobile />
    </div>
  );
}
