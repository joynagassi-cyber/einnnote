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
import { cn } from "@/lib/utils";
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
  toggleMeta,
  toggleTask,
  turnInto,
  type BlockTarget,
} from "@/lib/editor/extensions";
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

type SlashId =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "quote"
  | "rule"
  | "bullet"
  | "ordered"
  | "task"
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "highlight"
  | "link"
  | "clear";

interface SlashItem {
  id: SlashId;
  label: string;
  hint: string;
  group: string;
}

/**
 * Le menu « / » est le frère de la barre d’outils : les mêmes gestes, mais
 * sans quitter le clavier. Il est **groupé** (blocs, listes, mise en forme) et
 * **filtrable** — taper « cit » ne laisse que la citation.
 */
const SLASH_ITEMS: SlashItem[] = [
  { id: "p", label: "Texte", hint: "Paragraphe normal", group: "Blocs" },
  { id: "h1", label: "Titre 1", hint: "Section principale", group: "Blocs" },
  { id: "h2", label: "Titre 2", hint: "Sous-section", group: "Blocs" },
  { id: "h3", label: "Titre 3", hint: "Détail", group: "Blocs" },
  { id: "quote", label: "Citation", hint: "Passage mis en avant", group: "Blocs" },
  { id: "rule", label: "Filet", hint: "Séparateur horizontal", group: "Blocs" },
  { id: "bullet", label: "Liste à puces", hint: "Puces et retrait", group: "Listes" },
  { id: "ordered", label: "Liste numérotée", hint: "1. 2. 3.", group: "Listes" },
  { id: "task", label: "Case à cocher", hint: "À faire, coché d’un geste", group: "Listes" },
  { id: "bold", label: "Gras", hint: "Ctrl+B", group: "Mise en forme" },
  { id: "italic", label: "Italique", hint: "Ctrl+I", group: "Mise en forme" },
  { id: "strike", label: "Barré", hint: "Ctrl+Maj+X", group: "Mise en forme" },
  { id: "code", label: "Code en ligne", hint: "Ctrl+E", group: "Mise en forme" },
  { id: "highlight", label: "Surlignage", hint: "Jaune par défaut", group: "Mise en forme" },
  { id: "link", label: "Lien", hint: "Ctrl+K", group: "Mise en forme" },
  { id: "clear", label: "Effacer la mise en forme", hint: "Texte nu", group: "Mise en forme" },
];

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
}) {
  const toast = useToast((s) => s.show);
  const [slashAt, setSlashAt] = useState<number | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"run" | "add">("run");
  /* L’état du rangement est partagé : l’écran peut l’ouvrir depuis la fiche,
     au clavier, sans passer par un appui long de 500 ms. */
  const [rangingLocal, setRangingLocal] = useState(false);
  const ranging = rangingProp ?? rangingLocal;
  const setRanging = (open: boolean) => {
    setRangingLocal(open);
    onRangingChangeProp?.(open);
  };

  const saveTimer = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const onBadgeClickRef = useRef(onBadgeClick);
  onBadgeClickRef.current = onBadgeClick;
  const onAskRef = useRef(onAsk);
  onAskRef.current = onAsk;

  /* Le menu « / » s’écoute dans le champ de saisie lui-même : au niveau du
     document, ProseMirror aurait déjà coupé le paragraphe sur `Entrée`. */
  const slashUi = useRef({ open: false, items: [] as SlashItem[], index: 0 });
  const applySlashRef = useRef<(id: SlashId) => void>(() => {});

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

        const slash = slashUi.current;
        if (slash.open) {
          if (event.key === "Escape") {
            event.preventDefault();
            setSlashAt(null);
            setSlashQuery("");
            return true;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const count = slash.items.length;
            if (!count) return true;
            const delta = event.key === "ArrowDown" ? 1 : -1;
            setSlashIndex((index) => (index + delta + count) % count);
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            const item = slash.items[Math.min(slash.index, slash.items.length - 1)];
            if (item) applySlashRef.current(item.id);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        persist(instance.getJSON() as PmNode);
      }, 350);

      /* Menu « / » : un paragraphe dont le texte commence par « / ». La suite
         du texte filtre les entrées, comme dans Notion. */
      const { $from } = instance.state.selection;
      const text = $from.parent.textContent;
      const typing =
        instance.state.selection.empty &&
        $from.parent.type.name === "paragraph" &&
        text.startsWith("/") &&
        $from.parentOffset === text.length;
      setSlashAt(typing ? instance.state.selection.from : null);
      setSlashQuery(typing ? text.slice(1) : "");
      setSlashIndex(0);
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
      };
      command.run(context);
      persist(editor.getJSON() as PmNode);
    },
    [editor, onFiche, onToggleReading, persist, toast],
  );

  const openPalette = useCallback((mode: "run" | "add" = "run") => {
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

  /* ----------------------------- MENU « / » ----------------------------- */
  const slashItems = useMemo(() => {
    const needle = slashQuery.trim().toLowerCase();
    if (!needle) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.hint.toLowerCase().includes(needle) ||
        item.group.toLowerCase().includes(needle),
    );
  }, [slashQuery]);

  const applySlash = (id: SlashId) => {
    if (!editor || slashAt === null) return;
    const chain = editor
      .chain()
      .focus()
      .deleteRange({ from: slashAt - 1, to: slashAt });

    if (id === "p" || id === "h1" || id === "h2" || id === "h3" || id === "quote" || id === "rule") {
      chain.setParagraph().run();
      turnInto(editor, id);
    } else if (id === "bullet") {
      chain.setParagraph().run();
      toggleMeta(editor, "bullet");
    } else if (id === "ordered") {
      chain.setParagraph().run();
      toggleMeta(editor, "ordered");
    } else if (id === "task") {
      chain.setParagraph().run();
      toggleTask(editor);
    } else if (id === "bold") {
      chain.toggleBold().run();
    } else if (id === "italic") {
      chain.toggleItalic().run();
    } else if (id === "strike") {
      chain.toggleStrike().run();
    } else if (id === "code") {
      chain.toggleCode().run();
    } else if (id === "highlight") {
      chain.toggleHighlight({ color: HIGHLIGHTS[0].color }).run();
    } else if (id === "link") {
      chain.run();
      setLink();
    } else if (id === "clear") {
      chain.setParagraph().unsetAllMarks().run();
    }

    setSlashAt(null);
    setSlashQuery("");
    persist(editor.getJSON() as PmNode);
  };

  slashUi.current = {
    open: slashAt !== null,
    items: slashItems,
    index: slashIndex,
  };
  applySlashRef.current = applySlash;

  return (
    <div className="note-editor">
      {/* Compositeur : en haut sur bureau, en bas au-dessus du clavier sur mobile */}
      <div className="composer">
        <NoteDock />
        {/* Téléphone : le pupitre (quatre gestes choisis). Bureau : la barre
            complète. Le CSS décide laquelle est visible ; les deux lisent le
            même état, donc aucune divergence possible. */}
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
        title={paletteMode === "add" ? "Ajouter un geste au pupitre" : undefined}
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

      {/* Menu « / » */}
      {slashAt !== null && (
        <div className="dock dock-above-composer fixed inset-x-0 z-40 mx-auto px-4">
          <div
            role="menu"
            aria-label="Insérer un bloc"
            className="max-h-[52vh] overflow-y-auto rounded-card border border-line bg-surface p-1.5 shadow-lift"
          >
            {slashItems.length === 0 && (
              <p className="px-3 py-2 text-[13px] text-muted">Aucun bloc ne correspond.</p>
            )}
            {slashItems.map((item, index) => (
              <div key={item.id}>
                {(index === 0 || slashItems[index - 1].group !== item.group) && (
                  <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {item.group}
                  </p>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onMouseEnter={() => setSlashIndex(index)}
                  onClick={() => applySlash(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-field px-3 py-2 text-left",
                    index === slashIndex ? "bg-surface-2" : "hover:bg-surface-2",
                  )}
                >
                  <span className="text-[15px] font-medium">{item.label}</span>
                  <span className="text-[12.5px] text-muted">{item.hint}</span>
                </button>
              </div>
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
