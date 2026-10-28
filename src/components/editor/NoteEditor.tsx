import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import {
  Code,
  Copy,
  Highlighter,
  LinkSimple,
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
} from "@phosphor-icons/react";
import { useToast } from "@/stores/useToast";
import { useAppStore } from "@/stores/useAppStore";
import { blocksToHtml, docToBlocks, type PmNode } from "@/lib/editor/blocks";
import {
  BlockMeta,
  QuestionBadges,
  blockIdAt,
  blockKindOf,
  currentBlockAttrs,
  selectedText,
        type BlockTarget,
} from "@/lib/editor/extensions";
import { NoteLinks } from "@/lib/editor/note-links";
import { NotePicker } from "@/components/note/NotePicker";
import { normalizeTitle, resolveLink, type NoteRef } from "@/lib/links/notes";
import { SearchHighlight } from "@/lib/editor/search";
import { HIGHLIGHTS } from "@/lib/editor/highlights";
import {
  EditorToolbar,
  type Align,
  type EditorSnapshot,
} from "@/components/editor/EditorToolbar";
import { FindReplace } from "@/components/editor/FindReplace";
import { Palette } from "@/components/commands/Palette";
import { Pupitre } from "@/components/commands/Pupitre";
import type { Command, CommandContext } from "@/lib/commands/registry";
import type { Block } from "@/types";

/* Les cinq surligneurs vivent dans `lib/editor/highlights` : la feuille « / »
   et la barre de sélection s’en servent aussi. Ré-export pour les appelants
   historiques. */
export { HIGHLIGHTS };

/* ------------------------------------------------------------------ */
/* Menu « / » — tout ce qu’on peut insérer ou transformer              */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */

export function NoteEditor({
  blocks,
  onChange,
  markers,
  onBadgeClick,
  onAsk,
  onFiche,
  onToggleReading,
  reading = false,
  ranging: rangingProp,
  onRangingChange: onRangingChangeProp,
  notes = [],
  noteId,
  onOpenNote,
  onCreateNote,
  onDeleteLink,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  markers: Map<string, number[]>;
  onBadgeClick: (blockId: string) => void;
  onAsk: (payload: { blockId: string; text: string }) => void;
  /** ouvre la fiche de la note (feuille sur téléphone, panneau sur bureau) */
  onFiche?: () => void;
  /** bascule le mode lecture, piloté par l’écran qui possède le compositeur */
  onToggleReading?: () => void;
  /** lecture seule : le compositeur disparaît, le texte respire */
  reading?: boolean;
  /** état du rangement du pupitre, quand l’écran le pilote aussi (fiche) */
  ranging?: boolean;
  onRangingChange?: (open: boolean) => void;
  /** toutes les notes : c’est ce qui rend `[[Titre]]` cliquable */
  notes?: NoteRef[];
  /** la note ouverte — on ne se lie pas à soi-même */
  noteId?: string;
  onOpenNote?: (note: NoteRef) => void;
  /** crée la note manquante et rend sa référence, pour lier aussitôt */
  onCreateNote?: (title: string) => NoteRef | undefined;
  onDeleteLink?: () => void;
}) {
  const toast = useToast((s) => s.show);
  const [findOpen, setFindOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"run" | "add" | "insert">("run");
  /* L’état du rangement est partagé : l’écran peut l’ouvrir depuis la fiche,
     au clavier, sans passer par un appui long de 500 ms. */
  const [linkOpen, setLinkOpen] = useState(false);
  const [rangingLocal, setRangingLocal] = useState(false);
  const ranging = rangingProp ?? rangingLocal;
  const setRanging = (open: boolean) => {
    setRangingLocal(open);
    onRangingChangeProp?.(open);
  };

  /* Le registre de notes est lu par des décorations créées une seule fois :
     une ref évite de reconstruire l’extension à chaque rendu. */
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const onOpenNoteRef = useRef(onOpenNote);
  onOpenNoteRef.current = onOpenNote;
  const titleIndex = useMemo(
    () => new Set(notes.map((note) => normalizeTitle(note.title))),
    [notes],
  );
  const titleIndexRef = useRef(titleIndex);
  titleIndexRef.current = titleIndex;

  const saveTimer = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const onBadgeClickRef = useRef(onBadgeClick);
  onBadgeClickRef.current = onBadgeClick;
  const onAskRef = useRef(onAsk);
  onAskRef.current = onAsk;

  const editable = !reading;

  const persist = useCallback((doc: PmNode) => {
    onChangeRef.current(docToBlocks(doc));
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
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
        /* Les raccourcis par défaut de TipTap écraseraient les nôtres sur
           Ctrl+Maj+7, 8 et 9 : on les désactive, `BlockMeta` les redéfinit. */
        strike: {},
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
      Superscript,
      Subscript,
      SearchHighlight,
      NoteLinks.configure({
        exists: (title) => titleIndexRef.current.has(normalizeTitle(title)),
        onOpen: (title) => {
          const target = resolveLink(title, notesRef.current);
          if (target) onOpenNoteRef.current?.(target);
          else toast(`Aucune note ne porte « ${title} »`);
        },
      }),
    ],
    content: blocksToHtml(blocks),
    autofocus: false,
    editable,
    /* En lecture, le curseur ne doit pas apparaître : un texte qu’on peut
       sélectionner mais pas modifier, comme une page imprimée. */
    editorProps: {
      attributes: {
        class: "note-prose",
        spellcheck: "true",
        "aria-label": "Contenu de la note",
      },
      /* Une case se coche en cliquant sur sa pastille, comme dans Notion :
         c’est le seul endroit du bloc où le clic ne place pas le curseur. */
      handleClick: (view, _pos, event) => {
        const target = event.target as HTMLElement | null;
        const block = target?.closest?.("[data-task]") as HTMLElement | null;
        if (!block) return false;
        const box = block.getBoundingClientRect();
        if (event.clientX - box.left > 26) return false;
        const blockId = block.getAttribute("data-block-id");
        if (!blockId) return false;
        event.preventDefault();
        const tr = view.state.tr;
        let toggled = false;
        view.state.doc.descendants((node, pos) => {
          if (toggled || node.type.name !== "paragraph" && node.type.name !== "heading") {
            return !toggled;
          }
          if (node.attrs.blockId !== blockId) return true;
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            checked: node.attrs.checked !== true,
          });
          toggled = true;
          return false;
        });
        if (toggled) {
          view.dispatch(tr);
          onChangeRef.current(docToBlocks(view.state.doc.toJSON() as PmNode));
        }
        return true;
      },
      handleKeyDown: (view, event) => {
        /* Ctrl/Cmd+F ouvre la recherche de la note, jamais celle du
           navigateur : la note est un document, pas une page. */
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
          event.preventDefault();
          setFindOpen(true);
          return true;
        }

        /* Coller sans format : du texte, rien que du texte. On lit le
           presse-papiers nous-mêmes (`readText`), donc aucune balise ne peut
           entrer — et si le navigateur refuse, on le dit au lieu de ne rien
           faire. */
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "v") {
          event.preventDefault();
          void navigator.clipboard
            ?.readText()
            .then((text) => {
              if (!text) return;
              view.dispatch(view.state.tr.insertText(text.replace(/\r/g, "")));
              onChangeRef.current(
                docToBlocks(view.state.doc.toJSON() as PmNode),
              );
            })
            .catch(() => toast("Collage sans format impossible sur ce navigateur"));
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        persist(instance.getJSON() as PmNode);
      }, 350);

      /* « / » dans un paragraphe vide : on retire le caractère et on ouvre la
         palette sur les gestes d’insertion. Un seul catalogue de commandes
         pour toutes les surfaces — c’est le point du registre. */
      const { $from } = instance.state.selection;
      if (
        instance.state.selection.empty &&
        $from.parent.type.name === "paragraph" &&
        $from.parentOffset === 1 &&
        $from.parent.textContent === "/"
      ) {
        instance.chain().deleteRange({ from: $from.pos - 1, to: $from.pos }).run();
        setPaletteMode("insert");
        setPaletteOpen(true);
      }
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

  /* Échap ferme la recherche ; le menu « / » s’écoute au clavier. */
  useEffect(() => {
    if (!findOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFindOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [findOpen]);

  useEffect(() => {
    editor?.setEditable(!reading);
  }, [editor, reading]);

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
          kind: "p" as BlockTarget,
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
          superscript: instance.isActive("superscript"),
          subscript: instance.isActive("subscript"),
        } as Record<string, boolean>,
        attrs: { ...currentBlockAttrs(instance) },
        kind: blockKindOf(instance),
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
    run((instance) => instance.chain().focus().toggleHighlight({ color }).run());

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

  const words = state?.words ?? 0;
  const selection = state?.selection ?? "";
  const marks = (state?.marks ?? {}) as Record<string, boolean>;
  const attrs = (state?.attrs ?? {}) as Record<string, unknown>;
  const kind = (state?.kind ?? "p") as BlockTarget;

  const snapshot: EditorSnapshot = {
    kind,
    marks: {
      bold: Boolean(marks.bold),
      italic: Boolean(marks.italic),
      underline: Boolean(marks.underline),
      strike: Boolean(marks.strike),
      code: Boolean(marks.code),
      highlight: Boolean(marks.highlight),
      link: Boolean(marks.link),
      superscript: Boolean(marks.superscript),
      subscript: Boolean(marks.subscript),
    },
    bullet: attrs.bullet === true,
    ordered: attrs.ordered === true,
    task: attrs.task === true,
    checked: attrs.checked === true,
    marked: attrs.marked === true,
    indent: Number(attrs.indent ?? 0) || 0,
    align: (attrs.align as Align) ?? "left",
    words,
  };

  /* Le runner lit toujours l’instantané le plus récent : une commande exécutée
     depuis la palette ne doit pas décider d’après un état vieux d’un rendu. */
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  /* --------------------------- COMMANDES -------------------------------- */

  /* Une seule porte d’exécution : la palette et le pupitre passent par ici,
     donc l’enregistrement est fait une seule fois, au même endroit. */
  /* Écrire un lien : si `[[` a été tapé, on remplace les deux crochets plutôt
     que d’en ajouter deux autres. Le curseur reste après le lien, prêt à
     continuer la phrase. */
  const insertLink = useCallback(
    (note: NoteRef) => {
      if (!editor) return;
      const { from } = editor.state.selection;
      if (from >= 2 && editor.state.doc.textBetween(from - 2, from, "\n", "\n") === "[[") {
        editor.chain().focus().deleteRange({ from: from - 2, to: from }).run();
      }
      editor.chain().focus().insertContent(`[[${note.title}]] `).run();
      persist(editor.getJSON() as PmNode);
      setLinkOpen(false);
    },
    [editor, persist],
  );

  const runCommand = useCallback(
    (command: Command) => {
      if (!editor) return;
      const context: CommandContext = {
        editor,
        snapshot: snapshotRef.current,
        toast,
        find: (mode = "find") => {
          setFindMode(mode);
          setFindOpen(true);
        },
        fiche: () => onFiche?.(),
        reading: () => onToggleReading?.(),
        link: () => setLinkOpen(true),
        openLinkAtCursor: () => {
          /* Le curseur peut être *dans* les crochets : on regarde le bloc de
             texte courant, où les décalages sont exacts, et on retient le lien
             dont l’intervalle contient le curseur. */
          const { $from } = editor.state.selection;
          const text = $from.parent.textContent;
          const offset = $from.parentOffset;
          const hit = [...text.matchAll(/\[\[([^[\]\n]{1,160})\]\]/g)].find(
            (match) => {
              const at = match.index ?? 0;
              return offset >= at && offset <= at + match[0].length;
            },
          );
          const raw = hit?.[1]?.trim();
          if (!raw) {
            toast("Aucun lien de note sous le curseur");
            return;
          }
          const target = resolveLink(raw, notesRef.current);
          if (target) onOpenNoteRef.current?.(target);
          else toast(`Aucune note ne porte « ${raw} »`);
        },
      };
      command.run(context);
      persist(editor.getJSON() as PmNode);
    },
    [editor, onFiche, onToggleReading, persist, toast],
  );

  const openPalette = useCallback((mode: "run" | "add" | "insert" = "run") => {
    setPaletteMode(mode);
    setPaletteOpen(true);
  }, []);

  /* `Ctrl/⌘ K` depuis n’importe où dans la note : une palette qu’il faut
     atteindre à la souris n’est pas une palette. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      /* En lecture, la palette n’a rien à formater : on ne l’ouvre pas. Échap
         quitte la lecture, c’est le seul raccourci qui y sert. */
      if (reading) return;
      event.preventDefault();
      setPaletteMode("run");
      setPaletteOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reading]);

  return (
    <div className="note-editor">
      {/* Compositeur : en haut sur bureau, en bas au-dessus du clavier sur mobile */}
      <div className="composer">
        <NoteDock />
        {/* Téléphone : le pupitre (quatre gestes choisis). Bureau : la barre
            complète. Le CSS décide laquelle est visible ; les deux lisent le
            même état, donc aucune divergence possible. */}
        <NotePicker
          open={linkOpen}
          onClose={() => setLinkOpen(false)}
          notes={notes}
          currentId={noteId}
          onPick={insertLink}
          onCreate={
            onCreateNote
              ? (title) => {
                  const created = onCreateNote(title);
                  if (created) insertLink(created);
                  else setLinkOpen(false);
                }
              : undefined
          }
        />
        <Pupitre
          snapshot={snapshot}
          onRun={runCommand}
          onOpenPalette={() => openPalette(ranging ? "add" : "run")}
          ranging={ranging}
          onRangingChange={setRanging}
        />
        <EditorToolbar
          editor={editor}
          snapshot={snapshot}
          onRun={run}
          onFind={() => setFindOpen(true)}
        />
        <FindReplace
          editor={editor}
          open={findOpen}
          onClose={() => setFindOpen(false)}
          onDone={() => editor && persist(editor.getJSON() as PmNode)}
          focusField={findMode === "replace" ? "replacement" : "query"}
        />
      </div>

      <Palette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        snapshot={snapshot}
        mode={paletteMode}
        title={
          paletteMode === "add"
            ? "Ajouter un geste au pupitre"
            : paletteMode === "insert"
              ? "Insérer"
              : undefined
        }
        onRun={runCommand}
      />

      <EditorContent editor={editor} />

      {/* Barre contextuelle : n’apparaît que sur une sélection */}
      {!state?.empty && selection.length > 0 && (
        <div className="dock dock-above-composer pointer-events-none fixed inset-x-0 z-30 mx-auto px-4">
          <div className="pointer-events-auto flex items-center gap-0.5 overflow-x-auto rounded-field bg-ink p-1 shadow-lift animate-sheet-up">
            <button
              type="button"
              onClick={askFromSelection}
              className="h-11 shrink-0 rounded-[10px] bg-accent px-3 text-[14px] font-semibold text-on-accent"
            >
              Créer une question
            </button>
            <button
              type="button"
              aria-label="Mettre en gras"
              aria-pressed={snapshot.marks.bold}
              onClick={() => run((i) => i.chain().focus().toggleBold().run())}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[10px] text-bg"
            >
              <TextB size={18} weight={snapshot.marks.bold ? "bold" : "regular"} />
            </button>
            <button
              type="button"
              aria-label="Mettre en italique"
              aria-pressed={snapshot.marks.italic}
              onClick={() => run((i) => i.chain().focus().toggleItalic().run())}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[10px] text-bg"
            >
              <TextItalic size={18} />
            </button>
            <button
              type="button"
              aria-label="Souligner"
              aria-pressed={snapshot.marks.underline}
              onClick={() => run((i) => i.chain().focus().toggleUnderline().run())}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[10px] text-bg"
            >
              <TextUnderline size={18} />
            </button>
            <button
              type="button"
              aria-label="Barrer"
              aria-pressed={snapshot.marks.strike}
              onClick={() => run((i) => i.chain().focus().toggleStrike().run())}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[10px] text-bg"
            >
              <TextStrikethrough size={18} />
            </button>
            <button
              type="button"
              aria-label="Code en ligne"
              aria-pressed={snapshot.marks.code}
              onClick={() => run((i) => i.chain().focus().toggleCode().run())}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[10px] text-bg"
            >
              <Code size={18} />
            </button>
            <button
              type="button"
              aria-label="Surligner la sélection"
              onClick={() => applyHighlight(HIGHLIGHTS[0].color)}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[10px] text-bg"
            >
              <Highlighter size={18} />
            </button>
            <button
              type="button"
              aria-label="Lien sur la sélection"
              onClick={setLink}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[10px] text-bg"
            >
              <LinkSimple size={18} />
            </button>
            <button
              type="button"
              aria-label="Copier la sélection"
              onClick={copySelection}
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-[10px] text-bg"
            >
              <Copy size={18} />
            </button>
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
