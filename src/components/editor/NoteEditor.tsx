import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { Hash } from "@phosphor-icons/react";
import { useToast } from "@/stores/useToast";
import type { Block } from "@/types";
import type { EditorHost } from "@/lib/editor/host";
import { EMPTY_SNAPSHOT, type EditorSnapshot } from "@/lib/editor/snapshot";
import { FORMAT, blocksToDelta, deltaToBlocks } from "@/lib/editor/quill/delta";
import {
  createQuillHost,
  ensureBlockIds,
  QUILL_FORMATS,
  registerEinnoteFormats,
  resetHistory,
} from "@/lib/editor/quill/adapt";
import { registerEditingEngine } from "@/lib/editor/quill/bridge";
import { Palette } from "@/components/commands/Palette";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { FindReplace } from "@/components/editor/FindReplace";
import { NotePicker } from "@/components/note/NotePicker";
import type { Command, CommandContext } from "@/lib/commands/registry";
import { normalizeTitle, resolveLink, type NoteRef } from "@/lib/links/notes";
import {
  activeTagQuery,
  findTags,
  rankTags,
  type TagCount,
} from "@/lib/editor/tags";

/* ------------------------------------------------------------------ */
/* Les formats maison                                                  */
/* ------------------------------------------------------------------ */

/* Trois attributs nous appartiennent : l’identité du bloc, le marquage « à
   relire », et le filet de séparation. Le reste vient de Quill — on ne
   réinvente ni le gras ni les listes, sinon Entrée, annulation et
   copier-coller cesseraient d’être ceux de la bibliothèque. */
/* ------------------------------------------------------------------ */
/* Liens de notes                                                      */
/* ------------------------------------------------------------------ */

const NOTELINK_PATTERN = /\[\[([^[\]\n]{1,160})\]\]/g;

interface LineInfo {
  start: number;
  text: string;
  blockId: string | null;
}

/** Les lignes du document, avec leur décalage et leur identité. */
function readLines(quill: Quill): LineInfo[] {
  const lines: LineInfo[] = [];
  let index = 0;
  let current: LineInfo = { start: 0, text: "", blockId: null };

  for (const op of quill.getContents().ops) {
    if (typeof op.insert !== "string") continue;
    const parts = op.insert.split("\n");
    parts.forEach((part, at) => {
      current.text += part;
      index += part.length;
      if (at < parts.length - 1) {
        lines.push({ ...current, blockId: (op.attributes?.[FORMAT.blockId] as string) ?? null });
        index += 1;
        current = { start: index, text: "", blockId: null };
      }
    });
  }
  if (current.text) lines.push(current);
  return lines;
}

/**
 * Met en forme les `[[renvois]]` d’une ligne.
 *
 * Le lien **est du texte** : on ne stocke rien, on ne migre rien, et un export
 * Markdown le retrouve tel quel. L’attribut n’est qu’un habillage, réappliqué
 * après chaque frappe, et effacé sans bruit quand les crochets disparaissent.
 */
function paintNoteLinks(quill: Quill, exists: (title: string) => boolean, only?: LineInfo) {
  const targets = only ? [only] : readLines(quill);
  for (const line of targets) {
    if (line.text.length === 0) continue;
    quill.formatText(line.start, line.text.length, { notelink: false }, "silent");
    NOTELINK_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = NOTELINK_PATTERN.exec(line.text)) !== null) {
      const title = match[1].trim();
      if (!title) continue;
      quill.formatText(
        line.start + match.index,
        match[0].length,
        exists(title) ? { notelink: "link" } : { notelink: "link--broken" },
        "silent",
      );
    }
  }
}

/**
 * Habille les `#étiquettes` d’une ligne.
 *
 * Même contrat que pour les renvois : le texte reste le texte. On efface
 * d’abord l’habillage de la ligne entière, puis on repose — sans cela, une
 * étiquette effacée garderait sa pastille et le texte mentirait.
 *
 * Ce n’est pas une fonction de saisie : elle ne crée jamais d’étiquette, elle
 * ne décore que ce qui est déjà écrit.
 */
function paintTags(quill: Quill, only?: LineInfo) {
  const targets = only ? [only] : readLines(quill);
  for (const line of targets) {
    if (line.text.length === 0) continue;
    quill.formatText(line.start, line.text.length, { tag: false }, "silent");
    for (const found of findTags(line.text)) {
      quill.formatText(
        line.start + found.start,
        found.end - found.start,
        { tag: "item" },
        "silent",
      );
    }
  }
}

/* ------------------------------------------------------------------ */

/** Ce que la fiche peut demander à l’éditeur sans le connaître. */
export type NoteEditorHandle = {
  /** ouvre le sélecteur de note et écrit `[[Titre]]` au curseur */
  link: () => void;
};

export function NoteEditor({
  blocks,
  onChange,
  markers,
  onBadgeClick,
  onAsk,
  onFiche,
  onToggleReading,
  reading = false,
  notes = [],
  noteId,
  tags = [],
  onOpenNote,
  onCreateNote,
  ref,
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
  /** toutes les notes : c’est ce qui rend `[[Titre]]` cliquable */
  notes?: NoteRef[];
  /** la note ouverte — on ne se lie pas à soi-même */
  noteId?: string;
  /** la base des étiquettes : ce que propose `#` */
  tags?: TagCount[];
  onOpenNote?: (note: NoteRef) => void;
  /** le sélecteur de note peut en créer une à la volée */
  onCreateNote?: (title: string) => NoteRef | undefined;
  /** la fiche, ouverte à côté du texte, peut déclencher le sélecteur de note */
  ref?: Ref<NoteEditorHandle>;
}) {
  const toast = useToast((s) => s.show);
  const [findOpen, setFindOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"run" | "add" | "insert">("run");
  const [linkOpen, setLinkOpen] = useState(false);
  const [tick, setTick] = useState(0);
  /* `#` en cours de frappe : où il commence, et ce qui suit. */
  const [tagMenu, setTagMenu] = useState<{ start: number; query: string } | null>(null);
  const [tagCursor, setTagCursor] = useState(0);

  const holder = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const [host, setHost] = useState<EditorHost | null>(null);

  const saveTimer = useRef<number | null>(null);
  /** les derniers blocs produits par le moteur, prêts à être écrits */
  const pendingBlocks = useRef<Block[] | null>(null);
  /** le menu d’étiquettes, lisible depuis les écouteurs du moteur */
  const tagMenuRef = useRef<{ start: number; query: string } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const onBadgeClickRef = useRef(onBadgeClick);
  onBadgeClickRef.current = onBadgeClick;
  const onAskRef = useRef(onAsk);
  onAskRef.current = onAsk;
  const onOpenNoteRef = useRef(onOpenNote);
  onOpenNoteRef.current = onOpenNote;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const titleIndex = useMemo(
    () => new Set(notes.map((note) => normalizeTitle(note.title))),
    [notes],
  );
  const titleIndexRef = useRef(titleIndex);
  titleIndexRef.current = titleIndex;

  /* ---------------------------- MONTAGE -------------------------------- */

  useEffect(() => {
    registerEinnoteFormats();
    const element = holder.current;
    if (!element) return;

    element.innerHTML = "";
    const quill = new Quill(element, {
      theme: "snow",
      modules: { toolbar: false, history: { delay: 600, maxStack: 200 } },
      formats: QUILL_FORMATS,
      placeholder: "Écrivez… tapez / pour un titre, une liste, une citation",
    });
    quill.root.setAttribute("spellcheck", "true");
    quill.root.setAttribute("aria-label", "Contenu de la note");
    quill.setContents(blocksToDelta(blocks), "silent");
    paintTags(quill);
    resetHistory(quill);

    const editor = createQuillHost(quill, (next) => onChangeRef.current(next));
    quillRef.current = quill;
    registerEditingEngine(quill);
    setHost(editor);

    return () => {
      /* Le moteur est encore vivant ici : c’est le seul moment où l’on peut
         relire le document sans le perdre. On met la relecture de côté, et
         l’effet de sauvegarde la rejouera juste après. */
      pendingBlocks.current = deltaToBlocks(quill.getContents());
      quill.off("text-change");
      quill.off("selection-change");
      registerEditingEngine(null);
      quillRef.current = null;
      element.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- LA FRAPPE ------------------------------- */

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || !host) return;

    const exists = (title: string) => titleIndexRef.current.has(normalizeTitle(title));

    /* Le menu d’étiquettes ne se réaffiche que s’il change vraiment : sans ce
       garde-fou, chaque frappe remplacerait l’objet et relancerait un rendu
       complet pour rien. */
    const syncTagMenu = (next: { start: number; query: string } | null) => {
      const current = tagMenuRef.current;
      if (!next) {
        if (!current) return;
        tagMenuRef.current = null;
        setTagMenu(null);
        return;
      }
      if (current && current.start === next.start && current.query === next.query) return;
      if (!current || current.query !== next.query) setTagCursor(0);
      tagMenuRef.current = next;
      setTagMenu(next);
    };

    const onText = () => {
      ensureBlockIds(quill);
      const lines = readLines(quill);
      const range = quill.getSelection();
      const at = range ? range.index : 0;
      const line =
        lines.find((candidate) => at >= candidate.start && at <= candidate.start + candidate.text.length) ??
        lines[lines.length - 1];
      if (line) {
        paintNoteLinks(quill, exists, line);
        paintTags(quill, line);
      }

      /* `#` : on regarde le texte **avant le curseur**. Dès que le caractère
         qui suit n’est plus une lettre — espace, ponctuation — le menu se
         referme de lui-même, sans qu’on ait à traquer les sorties. */
      const typed = line
        ? activeTagQuery(line.text.slice(0, Math.max(0, at - line.start)))
        : null;
      syncTagMenu(typed && line ? { start: line.start + typed.start, query: typed.query } : null);

      /* « / » seul sur une ligne vide : on retire le caractère et on ouvre la
         palette sur les gestes d’insertion. Un seul catalogue pour toutes les
         surfaces — palette, pupitre, fiche.
         Le curseur n’est pas toujours lisible à cet instant (le moteur vient
         d’écrire) : on retient donc la ligne dont le texte est **exactement**
         « / », et seulement si le curseur connu s’y trouve. */
      const slashLine = lines.find(
        (candidate) =>
          candidate.text === "/" &&
          (!range || (range.index >= candidate.start && range.index <= candidate.start + 1)),
      );
      if (slashLine) {
        quill.deleteText(slashLine.start, 1, "api");
        setPaletteMode("insert");
        setPaletteOpen(true);
      }

      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const blocks = host.blocks();
        pendingBlocks.current = null;
        onChangeRef.current(blocks);
      }, 350);
      setTick((value) => value + 1);
    };

    const onSelection = () => {
      setTick((value) => value + 1);
      /* Cliquer ailleurs ferme le menu : garder une liste ouverte loin du
         curseur ferait choisir une étiquette au mauvais endroit. */
      const range = quill.getSelection();
      const lines = readLines(quill);
      const line = range
        ? lines.find(
            (candidate) =>
              range.index >= candidate.start &&
              range.index <= candidate.start + candidate.text.length,
          )
        : undefined;
      const typed = line
        ? activeTagQuery(line.text.slice(0, Math.max(0, (range?.index ?? 0) - line.start)))
        : null;
      syncTagMenu(
        typed && line ? { start: line.start + typed.start, query: typed.query } : null,
      );
    };

    quill.on("text-change", onText);
    quill.on("selection-change", onSelection);
    paintNoteLinks(quill, exists);

    return () => {
      quill.off("text-change", onText);
      quill.off("selection-change", onSelection);
    };
  }, [host]);

  /* Enregistrement de sécurité : quitter la page ne perd pas la frappe.
     On rejoue **les derniers blocs connus**, jamais une relecture du moteur :
     au démontage, Quill est déjà détruit, et le relire rendrait un document
     vide — donc une note vidée. */
  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      const pending = pendingBlocks.current;
      pendingBlocks.current = null;
      if (pending) onChangeRef.current(pending);
    };
  }, []);

  useEffect(() => {
    quillRef.current?.enable(!reading);
  }, [reading]);

  /* --------------------------- LA SOURIS ------------------------------- */

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || !host) return;
    const root = quill.root;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      /* Un renvoi : on l’ouvre. Un renvoi mort : on le dit. */
      const link = target.closest("[class*='note-link']") as HTMLElement | null;
      if (link) {
        const raw = link.textContent ?? "";
        const title = raw.replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
        const found = resolveLink(title, notesRef.current);
        event.preventDefault();
        if (found) onOpenNoteRef.current?.(found);
        else toast(`Aucune note ne porte « ${title} »`);
        return;
      }

      /* Une case se coche en cliquant sur sa pastille, jamais en cliquant
         dans son texte : le curseur doit rester là où on l’a mis. */
      const item = target.closest("li[data-list='checked'], li[data-list='unchecked']") as
        | HTMLElement
        | null;
      if (!item) return;
      const box = item.getBoundingClientRect();
      if (event.clientX - box.left > 26) return;
      const blockId = item.getAttribute("data-block-id");
      if (!blockId) return;
      event.preventDefault();
      host.toggleCheckedById(blockId);
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [host, toast]);

  /* --------------------------- LE CLAVIER ------------------------------ */

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    const root = quill.root;

    const onKeyDown = (event: KeyboardEvent) => {
      /* Ctrl/Cmd+F ouvre la recherche de la note, jamais celle du
         navigateur : la note est un document, pas une page. */
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
        return;
      }
      /* Coller sans format : on lit le presse-papiers nous-mêmes, donc aucune
         balise ne peut entrer — et si le navigateur refuse, on le dit. */
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        void navigator.clipboard
          ?.readText()
          .then((text) => {
            if (!text) return;
            const range = quill.getSelection() ?? { index: 0, length: 0 };
            quill.deleteText(range.index, range.length, "api");
            quill.insertText(range.index, text.replace(/\r/g, ""), {}, "api");
          })
          .catch(() => toast("Collage sans format impossible sur ce navigateur"));
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [toast]);

  /* --------------------------- L’ÉTAT ---------------------------------- */

  /* L’état est relu à chaque rendu, sans mémo : il ne coûte qu’une poignée de
     lectures au moteur, et il ne peut donc jamais afficher un format périmé. */
  const snapshot: EditorSnapshot = (() => {
    if (!host) return EMPTY_SNAPSHOT;
    const attrs = host.attrs();
    return {
      kind: attrs.kind,
      marks: {
        bold: host.isMarkActive("bold"),
        italic: host.isMarkActive("italic"),
        underline: host.isMarkActive("underline"),
        strike: host.isMarkActive("strike"),
        code: host.isMarkActive("code"),
        highlight: host.isMarkActive("highlight"),
        link: host.isMarkActive("link"),
        superscript: host.isMarkActive("superscript"),
        subscript: host.isMarkActive("subscript"),
      },
      bullet: attrs.bullet,
      ordered: attrs.ordered,
      task: attrs.task,
      checked: attrs.checked,
      marked: attrs.marked,
      indent: attrs.indent,
      align: attrs.align,
      words: host.words(),
    };
  })();

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const selection = host ? host.selectedText() : "";

  /* --------------------------- COMMANDES ------------------------------- */

  /* Écrire un lien : si `[[` a été tapé, on remplace les deux crochets plutôt
     que d’en ajouter deux autres. Le curseur reste après le lien. */
  const insertLink = useCallback(
    (note: NoteRef) => {
      if (!host) return;
      host.insertText(`[[${note.title}]] `);
      setLinkOpen(false);
    },
    [host],
  );

  useImperativeHandle(ref, () => ({ link: () => setLinkOpen(true) }), []);

  /* --------------------------- LES ÉTIQUETTES -------------------------- */

  /* Ce que le menu propose : la base des étiquettes, filtrée par ce qui est
     déjà tapé après le `#`. */
  const tagSuggestions = useMemo(
    () => (tagMenu ? rankTags(tags, tagMenu.query) : []),
    [tagMenu, tags],
  );

  const closeTagMenu = useCallback(() => {
    tagMenuRef.current = null;
    setTagMenu(null);
    setTagCursor(0);
  }, []);

  /* Choisir une étiquette : on remplace le `#début` par le nom complet suivi
     d’une espace, et le curseur reste après — on continue sa phrase. */
  const chooseTag = useCallback(
    (tag: TagCount) => {
      const quill = quillRef.current;
      const menu = tagMenuRef.current;
      if (!quill || !menu) return;
      const range = quill.getSelection();
      /* On remplace **l’étiquette entière**, pas seulement ce qui précède le
         curseur : si on choisit avec le curseur au milieu de `#sourc`, la fin
         du mot ne doit pas rester collée derrière le nom choisi. */
      const tail = /^#[\p{L}\p{N}_/-]*/u.exec(quill.getText(menu.start, 64));
      const wordEnd = menu.start + (tail ? tail[0].length : 1);
      const end = Math.max(wordEnd, range ? range.index : menu.start);
      quill.deleteText(menu.start, end - menu.start, "api");
      quill.insertText(menu.start, `#${tag.name} `, {}, "api");
      quill.setSelection(menu.start + tag.name.length + 2, 0, "api");
      closeTagMenu();
    },
    [closeTagMenu],
  );

  /* Le clavier du menu. En phase de **capture** : sans cela, Quill aurait déjà
     avalé Entrée (un saut de ligne au milieu du mot) avant qu’on ait pu
     choisir. Les flèches ne quittent jamais la note, et Échap referme. */
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || !tagMenu || tagSuggestions.length === 0) return;
    const root = quill.root;
    const last = tagSuggestions.length - 1;

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        const down = event.key === "ArrowDown";
        setTagCursor((index) => (down ? (index >= last ? 0 : index + 1) : index <= 0 ? last : index - 1));
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        chooseTag(tagSuggestions[Math.min(tagCursor, last)]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeTagMenu();
      }
    };

    root.addEventListener("keydown", onKey, true);
    return () => root.removeEventListener("keydown", onKey, true);
  }, [tagMenu, tagSuggestions, tagCursor, chooseTag, closeTagMenu]);

  const runCommand = useCallback(
    (command: Command) => {
      if (!host) return;
      const context: CommandContext = {
        editor: host,
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
          const source = quillRef.current;
          if (!source) return;
          const offsets = host.selectionOffsets();
          const lines = readLines(source);
          const line = lines.find(
            (candidate) =>
              offsets.from >= candidate.start &&
              offsets.from <= candidate.start + candidate.text.length,
          );
          if (!line) return;
          const local = offsets.from - line.start;
          NOTELINK_PATTERN.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = NOTELINK_PATTERN.exec(line.text)) !== null) {
            const at = match.index;
            if (local < at || local > at + match[0].length) continue;
            const title = match[1].trim();
            const found = resolveLink(title, notesRef.current);
            if (found) onOpenNoteRef.current?.(found);
            else toast(`Aucune note ne porte « ${title} »`);
            return;
          }
          toast("Aucun renvoi sous le curseur");
        },
      };
      command.run(context);
      onChangeRef.current(host.blocks());
    },
    [host, onFiche, onToggleReading, toast],
  );

  const openPalette = useCallback((mode: "run" | "add" | "insert" = "run") => {
    setPaletteMode(mode);
    setPaletteOpen(true);
  }, []);

  /* `Ctrl/⌘ K` depuis n’importe où dans la note. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (reading) return;
      event.preventDefault();
      setPaletteMode("run");
      setPaletteOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reading]);

  const askFromSelection = () => {
    if (!host) return;
    const text = host.selectedText();
    const blockId = host.attrs().id;
    if (!text || !blockId) {
      toast("Sélectionnez d’abord un passage");
      return;
    }
    onAskRef.current({ blockId, text });
  };

  /* Les renvois morts, dits une fois pour les lecteurs d’écran.
     On ne touche pas au DOM de Quill : chaque écriture y relance son
     observateur, qui relance la mise en forme, qui relance l’écriture. Le
     résumé vit donc à côté, en `role="status"`, et il ne bouge que lorsque la
     liste change. */
  const deadLinks = useMemo(() => {
    const quill = quillRef.current;
    if (!quill) return [] as string[];
    const titles = new Set<string>();
    for (const line of readLines(quill)) {
      NOTELINK_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = NOTELINK_PATTERN.exec(line.text)) !== null) {
        const title = match[1].trim();
        if (title && !titleIndexRef.current.has(normalizeTitle(title))) titles.add(title);
      }
    }
    return [...titles];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, titleIndex]);

  /* Où poser le menu : sous le `#` qu’on est en train de taper. La position
     vient du moteur, pas du DOM — elle reste juste après un repli de fenêtre. */
  const tagMenuBox = useMemo(() => {
    const quill = quillRef.current;
    if (!tagMenu || !quill) return null;
    const bounds = quill.getBounds(tagMenu.start);
    return { top: bounds.top + (bounds.height || 22) + 6, left: bounds.left };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagMenu, tick]);

  /* --------------------------- LES PASTILLES --------------------------- */

  /* Chaque bloc qui porte des questions reçoit une pastille, posée à sa
     droite. Les positions viennent de l’éditeur, pas du DOM : elles restent
     justes après un pli de fenêtre ou un changement de largeur. */
  const badges = useMemo(() => {
    const quill = quillRef.current;
    if (!quill || !host) return [] as {
      blockId: string;
      numbers: number[];
      count: number;
      top: number;
    }[];
    if (markersRef.current.size === 0) return [];
    return readLines(quill)
      .filter((line) => line.blockId && markersRef.current.has(line.blockId))
      .map((line) => {
        const numbers = markersRef.current.get(line.blockId as string) ?? [];
        return {
          blockId: line.blockId as string,
          numbers,
          count: numbers.length,
          top: quill.getBounds(line.start).top,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, tick, markers]);

  /* --------------------------- LE RENDU -------------------------------- */

  return (
    <div className="note-editor">
      {/* **Une seule barre.** Elle tient à la fois la mise en forme, la
          question ancrée, les réglages de lecture de la note et la palette.
          Deux rangées empilées en bas d’un téléphone, c’est deux fois moins de
          texte visible — et deux endroits où chercher le même bouton. */}
      {!reading && (
        <div className="editor-bar">
          <EditorToolbar
            editor={host}
            snapshot={snapshot}
            selection={selection}
            onAsk={askFromSelection}
            onOpenPalette={() => openPalette("run")}
            onRun={(action) => {
              if (!host) return;
              action(host);
              onChangeRef.current(host.blocks());
            }}
            onFind={() => setFindOpen(true)}
          />
        </div>
      )}

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

      <FindReplace
        host={host}
        version={tick}
        open={findOpen}
        onClose={() => setFindOpen(false)}
        onDone={() => host && onChangeRef.current(host.blocks())}
        focusField={findMode === "replace" ? "replacement" : "query"}
      />

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

      <p className="sr-only" role="status" aria-live="polite">
        {deadLinks.length === 0
          ? ""
          : deadLinks.length === 1
            ? `Un renvoi mort : « ${deadLinks[0]} » ne correspond à aucune note.`
            : `${deadLinks.length} renvois morts, dont « ${deadLinks[0]} ».`}
      </p>

      {/* La marge de lecture vit ici, pas sur `.note-editor` : c’est ce qui
          permet à la barre, sa sœur, d’aller d’un bord à l’autre. */}
      <div className="note-sheet">
        <div className="note-prose" ref={holder} />
        {badges.map((badge) => (
          <button
            key={badge.blockId}
            type="button"
            onClick={() => onBadgeClickRef.current(badge.blockId)}
            style={{ top: badge.top }}
            className="gutter-badge"
            aria-label={
              badge.count === 1
                ? `Question ${badge.numbers[0]} sur ce bloc`
                : `Questions ${badge.numbers.join(", ")} sur ce bloc`
            }
          >
            Q{badge.numbers[0]}
            {badge.count > 1 && (
              <span className="ml-0.5 text-[10px] opacity-80">+{badge.count - 1}</span>
            )}
          </button>
        ))}

        {tagMenu && (
          <div
            className="tag-menu"
            role="listbox"
            aria-label="Étiquettes disponibles"
            style={tagMenuBox ? { top: tagMenuBox.top, left: tagMenuBox.left } : undefined}
          >
            {tagSuggestions.length === 0 ? (
              <p className="tag-menu-empty">
                Aucune étiquette pour l’instant. Écrivez <b>#idée</b> puis une espace :
                elle entrera dans la base et sera proposée les fois suivantes.
              </p>
            ) : (
              tagSuggestions.map((tag, index) => (
                <button
                  key={tag.key}
                  type="button"
                  role="option"
                  aria-selected={index === tagCursor}
                  /* Le curseur ne doit pas quitter la note : sans cela, la
                     sélection se ferme et le `#début` ne peut plus être
                     remplacé au bon endroit. */
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseTag(tag)}
                  className={`tag-menu-item${index === tagCursor ? " is-active" : ""}`}
                >
                  <Hash size={14} aria-hidden="true" />
                  <span className="truncate">{tag.name}</span>
                  <span className="tag-menu-count">
                    {tag.count === 0 ? "—" : tag.count}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}
