import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  ArrowCounterClockwise,
  ArrowUUpLeft,
  Code,
  Copy,
  Highlighter,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Plus,
  Quotes,
  TextB,
  TextHOne,
  TextHTwo,
  TextIndent,
  TextItalic,
  TextOutdent,
  TextStrikethrough,
  TextUnderline,
  Trash,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useToast } from "@/stores/useToast";
import { useAppStore } from "@/stores/useAppStore";
import { blocksToHtml, docToBlocks, type PmNode } from "@/lib/editor/blocks";
import {
  BlockMeta,
  QuestionBadges,
  blockIdAt,
  changeIndent,
  currentBlockAttrs,
  selectedText,
  toggleMeta,
  toggleQuote,
} from "@/lib/editor/extensions";
import type { Block } from "@/types";

/* ------------------------------------------------------------------ */
/* Surligneurs                                                         */
/* ------------------------------------------------------------------ */

export const HIGHLIGHTS = [
  { label: "Jaune", color: "#F6E3A1" },
  { label: "Vert", color: "#CBE7C4" },
  { label: "Bleu", color: "#C9DFF2" },
  { label: "Rose", color: "#F3D2DA" },
  { label: "Violet", color: "#E0D3F3" },
] as const;

const SLASH_ITEMS = [
  { id: "h1", label: "Titre 1", hint: "Section principale" },
  { id: "h2", label: "Titre 2", hint: "Sous-section" },
  { id: "bullet", label: "Liste à puces", hint: "Puces et retrait" },
  { id: "ordered", label: "Liste numérotée", hint: "1. 2. 3." },
  { id: "quote", label: "Citation", hint: "Passage mis en avant" },
  { id: "paragraph", label: "Texte normal", hint: "Retirer la mise en forme" },
] as const;

/* ------------------------------------------------------------------ */

export function NoteEditor({
  blocks,
  onChange,
  markers,
  onBadgeClick,
  onAsk,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  markers: Map<string, number[]>;
  onBadgeClick: (blockId: string) => void;
  onAsk: (payload: { blockId: string; text: string }) => void;
}) {
  const toast = useToast((s) => s.show);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [slashAt, setSlashAt] = useState<number | null>(null);

  const saveTimer = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const onBadgeClickRef = useRef(onBadgeClick);
  onBadgeClickRef.current = onBadgeClick;
  const onAskRef = useRef(onAsk);
  onAskRef.current = onAsk;

  const persist = useCallback((doc: PmNode) => {
    onChangeRef.current(docToBlocks(doc));
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      BlockMeta,
      QuestionBadges.configure({
        markers: () => markersRef.current,
        onBadgeClick: (blockId) => onBadgeClickRef.current(blockId),
      }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: "Écrivez… tapez / pour un titre, une liste, une citation",
        showOnlyWhenEditable: true,
      }),
      CharacterCount,
    ],
    content: blocksToHtml(blocks),
    autofocus: false,
    editorProps: {
      attributes: {
        class: "note-prose",
        spellcheck: "true",
        "aria-label": "Contenu de la note",
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        persist(instance.getJSON() as PmNode);
      }, 350);

      /* Menu « / » : uniquement un paragraphe vide qui vient de recevoir « / » */
      const { $from } = instance.state.selection;
      const typedSlash =
        instance.state.selection.empty &&
        $from.parent.type.name === "paragraph" &&
        $from.parent.textContent === "/" &&
        $from.parentOffset === 1;
      setSlashAt(typedSlash ? instance.state.selection.from : null);
    },
  });

  /* Les pastilles sont des décorations : elles ne se recalculent qu’au
     prochain changement du document. On force ce recalcul quand une question
     est ajoutée ou supprimée pendant l’édition. */
  const markerKey = useMemo(
    () =>
      [...markers.entries()]
        .map(([blockId, numbers]) => `${blockId}:${numbers.join(",")}`)
        .sort()
        .join("|"),
    [markers],
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
  }, [markerKey, editor]);

  /* Enregistrement de sécurité : quitter la page ne perd pas la frappe */
  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (editor && !editor.isDestroyed) persist(editor.getJSON() as PmNode);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      if (!instance) {
        return {
          empty: true,
          selection: "",
          words: 0,
          marks: {} as Record<string, boolean>,
          attrs: {} as Record<string, unknown>,
        };
      }
      const { from, to } = instance.state.selection;
      return {
        empty: from === to,
        selection: selectedText(instance),
        words: instance.storage.characterCount.words() as number,
        marks: {
          bold: instance.isActive("bold"),
          italic: instance.isActive("italic"),
          underline: instance.isActive("underline"),
          strike: instance.isActive("strike"),
          code: instance.isActive("code"),
          highlight: instance.isActive("highlight"),
          link: instance.isActive("link"),
          h1: instance.isActive("heading", { level: 1 }),
          h2: instance.isActive("heading", { level: 2 }),
        } as Record<string, boolean>,
        attrs: currentBlockAttrs(instance),
      };
    },
  });

  const run = useCallback(
    (action: (instance: NonNullable<typeof editor>) => void) => {
      if (!editor) return;
      action(editor);
      persist(editor.getJSON() as PmNode);
    },
    [editor, persist],
  );

  const applyHighlight = (color: string) =>
    run((instance) => {
      instance.chain().focus().toggleHighlight({ color }).run();
      setHighlightsOpen(false);
    });

  const askFromSelection = () => {
    if (!editor) return;
    const text = selectedText(editor);
    const blockId = blockIdAt(editor, editor.state.selection.from);
    if (!text || !blockId) {
      toast("Sélectionnez d’abord un passage");
      return;
    }
    onAskRef.current({ blockId, text });
  };

  const copySelection = async () => {
    if (!editor) return;
    const text = selectedText(editor);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast("Copié", "accent");
    } catch {
      toast("Copie impossible sur ce navigateur");
    }
  };

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Adresse du lien", previous ?? "https://");
    if (href === null) return;
    run((instance) => {
      if (href.trim() === "") instance.chain().focus().unsetLink().run();
      else
        instance
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: href.trim() })
          .run();
    });
  };

  const applySlash = (id: (typeof SLASH_ITEMS)[number]["id"]) => {
    if (!editor || slashAt === null) return;
    const chain = editor
      .chain()
      .focus()
      .deleteRange({ from: slashAt - 1, to: slashAt });
    if (id === "h1") chain.setHeading({ level: 1 }).run();
    else if (id === "h2") chain.setHeading({ level: 2 }).run();
    else if (id === "paragraph") chain.setParagraph().run();
    else if (id === "quote")
      chain.setParagraph().updateAttributes("paragraph", { kind: "quote" }).run();
    else if (id === "bullet")
      chain
        .setParagraph()
        .updateAttributes("paragraph", { bullet: true, ordered: false })
        .run();
    else
      chain
        .setParagraph()
        .updateAttributes("paragraph", { ordered: true, bullet: false })
        .run();
    setSlashAt(null);
    persist(editor.getJSON() as PmNode);
  };

  const words = state?.words ?? 0;
  const selection = state?.selection ?? "";
  const marks = state?.marks ?? {};
  const attrs = state?.attrs ?? {};

  const toolbar = useMemo(
    () => [
      {
        group: "historique",
        items: [
          {
            key: "undo",
            label: "Annuler",
            icon: ArrowUUpLeft,
            onRun: () => run((i) => i.chain().focus().undo().run()),
          },
          {
            key: "redo",
            label: "Rétablir",
            icon: ArrowCounterClockwise,
            onRun: () => run((i) => i.chain().focus().redo().run()),
          },
        ],
      },
      {
        group: "structure",
        items: [
          {
            key: "h1",
            label: "Titre 1",
            icon: TextHOne,
            active: marks.h1,
            onRun: () =>
              run((i) => i.chain().focus().toggleHeading({ level: 1 }).run()),
          },
          {
            key: "h2",
            label: "Titre 2",
            icon: TextHTwo,
            active: marks.h2,
            onRun: () =>
              run((i) => i.chain().focus().toggleHeading({ level: 2 }).run()),
          },
          {
            key: "bullet",
            label: "Liste à puces",
            icon: ListBullets,
            active: attrs.bullet === true,
            onRun: () => run((i) => toggleMeta(i, "bullet")),
          },
          {
            key: "ordered",
            label: "Liste numérotée",
            icon: ListNumbers,
            active: attrs.ordered === true,
            onRun: () => run((i) => toggleMeta(i, "ordered")),
          },
          {
            key: "quote",
            label: "Citation",
            icon: Quotes,
            active: attrs.kind === "quote",
            onRun: () => run((i) => toggleQuote(i)),
          },
        ],
      },
      {
        group: "marques",
        items: [
          {
            key: "bold",
            label: "Gras",
            icon: TextB,
            active: marks.bold,
            onRun: () => run((i) => i.chain().focus().toggleBold().run()),
          },
          {
            key: "italic",
            label: "Italique",
            icon: TextItalic,
            active: marks.italic,
            onRun: () => run((i) => i.chain().focus().toggleItalic().run()),
          },
          {
            key: "underline",
            label: "Souligné",
            icon: TextUnderline,
            active: marks.underline,
            onRun: () => run((i) => i.chain().focus().toggleUnderline().run()),
          },
          {
            key: "strike",
            label: "Barré",
            icon: TextStrikethrough,
            active: marks.strike,
            onRun: () => run((i) => i.chain().focus().toggleStrike().run()),
          },
          {
            key: "code",
            label: "Code",
            icon: Code,
            active: marks.code,
            onRun: () => run((i) => i.chain().focus().toggleCode().run()),
          },
          {
            key: "highlight",
            label: "Surligner",
            icon: Highlighter,
            active: marks.highlight,
            onRun: () => setHighlightsOpen((open) => !open),
          },
          {
            key: "link",
            label: "Lien",
            icon: LinkSimple,
            active: marks.link,
            onRun: setLink,
          },
        ],
      },
      {
        group: "retrait",
        items: [
          {
            key: "indent",
            label: "Décaler à droite",
            icon: TextIndent,
            onRun: () => run((i) => changeIndent(i, 1)),
          },
          {
            key: "outdent",
            label: "Décaler à gauche",
            icon: TextOutdent,
            onRun: () => run((i) => changeIndent(i, -1)),
          },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      run,
      marks.bold,
      marks.italic,
      marks.underline,
      marks.strike,
      marks.code,
      marks.highlight,
      marks.link,
      marks.h1,
      marks.h2,
      attrs.bullet,
      attrs.ordered,
      attrs.kind,
    ],
  );

  return (
    <div className="note-editor">
      {/* Compositeur : en haut sur bureau, en bas au-dessus du clavier sur mobile */}
      <div className="composer">
        <NoteDock />
        {/* Barre d’outils persistante, comme la barre d’Obsidian */}
        <div className="editor-toolbar" role="toolbar" aria-label="Mise en forme">
        <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto px-1">
          {toolbar.map((group) => (
            <div key={group.group} className="flex shrink-0 items-center">
              {group.items.map((item) => (
                <ToolButton
                  key={item.key}
                  label={item.label}
                  active={item.active}
                  onClick={item.onRun}
                >
                  <item.icon size={19} weight={item.active ? "bold" : "regular"} />
                </ToolButton>
              ))}
              <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
            </div>
          ))}
          <button
            type="button"
            aria-label="Ajouter une puce"
            title="Nouveau bloc à puce"
            onClick={() =>
              run((i) =>
                i
                  .chain()
                  .focus()
                  .splitBlock()
                  .updateAttributes("paragraph", { bullet: true })
                  .run(),
              )
            }
            className="editor-tool text-accent"
          >
            <Plus size={19} weight="bold" />
          </button>
        </div>
        {words > 0 && (
          <span className="shrink-0 pr-2 text-[11.5px] tabular-nums text-muted">
            {words} mot{words > 1 ? "s" : ""}
          </span>
        )}
        </div>
      </div>

      {highlightsOpen && (
        <div
          className="editor-popover"
          role="group"
          aria-label="Couleur du surligneur"
        >
          {HIGHLIGHTS.map((highlight) => (
            <button
              key={highlight.label}
              type="button"
              aria-label={`Surligner en ${highlight.label.toLowerCase()}`}
              onClick={() => applyHighlight(highlight.color)}
              className="h-8 w-8 rounded-full border border-line"
              style={{ background: highlight.color }}
            />
          ))}
          <button
            type="button"
            onClick={() => run((i) => i.chain().focus().unsetHighlight().run())}
            aria-label="Retirer le surlignage"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted"
          >
            <Trash size={14} />
          </button>
        </div>
      )}

      <EditorContent editor={editor} />

      {/* Barre contextuelle : n’apparaît que sur une sélection */}
      {!state?.empty && selection.length > 0 && (
        <div className="dock dock-above-composer pointer-events-none fixed inset-x-0 z-30 mx-auto px-4">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-field bg-ink p-1 shadow-lift animate-sheet-up">
            <button
              type="button"
              onClick={askFromSelection}
              className="h-11 flex-1 rounded-[10px] bg-accent px-3 text-[14px] font-semibold text-on-accent"
            >
              Créer une question
            </button>
            <button
              type="button"
              aria-label="Surligner la sélection"
              onClick={() => applyHighlight(HIGHLIGHTS[0].color)}
              className="flex h-11 w-10 items-center justify-center rounded-[10px] text-bg"
            >
              <Highlighter size={18} />
            </button>
            <button
              type="button"
              aria-label="Mettre en gras"
              onClick={() => run((i) => i.chain().focus().toggleBold().run())}
              className="flex h-11 w-10 items-center justify-center rounded-[10px] text-bg"
            >
              <TextB size={18} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Copier la sélection"
              onClick={copySelection}
              className="flex h-11 w-10 items-center justify-center rounded-[10px] text-bg"
            >
              <Copy size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Menu « / » */}
      {slashAt !== null && (
        <div className="dock dock-above-composer fixed inset-x-0 z-40 mx-auto px-4">
          <div
            role="menu"
            aria-label="Insérer un bloc"
            className="rounded-card border border-line bg-surface p-1.5 shadow-lift"
          >
            {SLASH_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => applySlash(item.id)}
                className="flex w-full items-center justify-between gap-3 rounded-field px-3 py-2 text-left hover:bg-surface-2"
              >
                <span className="text-[15px] font-medium">{item.label}</span>
                <span className="text-[12.5px] text-muted">{item.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* Barre de personnalisation de la note                                */
/* ------------------------------------------------------------------ */

const WIDTHS = [560, 640, 720, 840, 920];
const PAPERS = [
  { value: "sand", label: "Sable" },
  { value: "ivory", label: "Ivoire" },
  { value: "grey", label: "Gris" },
  { value: "mist", label: "Brume" },
] as const;

/**
 * Quatre réglages qui agissent sur la note ouverte : taille du texte,
 * interligne, largeur de lecture, teinte du papier. Les mêmes valeurs que
 * l’écran Personnalisation — une seule source, donc pas de dérive.
 */
function NoteDock() {
  const settings = useAppStore((s) => s.settings);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setPersonalization = useAppStore((s) => s.setPersonalization);
  const ui = settings.personalization;

  const widthIndex = WIDTHS.indexOf(ui.readingWidth);
  const paperIndex = Math.max(
    0,
    PAPERS.findIndex((paper) => paper.value === ui.paper),
  );

  return (
    <div className="note-dock" role="toolbar" aria-label="Personnalisation de la note">
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="note-dock-btn"
          aria-label="Réduire la taille du texte"
          onClick={() => setFontSize(settings.fontSize - 1)}
          disabled={settings.fontSize <= 14}
        >
          A−
        </button>
        <button
          type="button"
          className="note-dock-btn"
          aria-label="Agrandir la taille du texte"
          onClick={() => setFontSize(settings.fontSize + 1)}
          disabled={settings.fontSize >= 22}
        >
          A+
        </button>
      </span>

      <button
        type="button"
        className="note-dock-btn"
        aria-label={`Interligne ${ui.noteLeading} pixels`}
        onClick={() =>
          setPersonalization({
            noteLeading: ui.noteLeading >= 36 ? 20 : ui.noteLeading + 2,
          })
        }
      >
        Interligne {ui.noteLeading}
      </button>

      <button
        type="button"
        className="note-dock-btn"
        aria-label={`Largeur de lecture ${ui.readingWidth} pixels`}
        onClick={() =>
          setPersonalization({
            readingWidth: WIDTHS[(widthIndex + 1) % WIDTHS.length] ?? 720,
          })
        }
      >
        Largeur {ui.readingWidth}
      </button>

      <button
        type="button"
        className="note-dock-btn"
        aria-label={`Teinte du papier : ${PAPERS[paperIndex]?.label}`}
        onClick={() =>
          setPersonalization({
            paper: PAPERS[(paperIndex + 1) % PAPERS.length].value,
          })
        }
      >
        Papier {PAPERS[paperIndex]?.label}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={Boolean(active)}
      onMouseDown={(event) => event.preventDefault()}
      onTouchStart={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn("editor-tool", active && "editor-tool-active")}
    >
      {children}
    </button>
  );
}
