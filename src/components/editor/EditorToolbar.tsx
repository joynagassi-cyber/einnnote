import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/core";
import {
  ArrowCounterClockwise,
  ArrowLineDown,
  ArrowLineUp,
  ArrowUUpLeft,
  BookmarkSimple,
  CalendarBlank,
  CaretDown,
  Code,
  CopySimple,
  DotsThree,
  TextAa,
  Eraser,
  Highlighter,
  LinkSimple,
  ListBullets,
  ListChecks,
  ListNumbers,
  MagnifyingGlass,
  Minus,
  Plus,
  Quotes,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextHOne,
  TextHThree,
  TextHTwo,
  TextIndent,
  TextItalic,
  TextOutdent,
  TextStrikethrough,
  TextSubscript,
  TextSuperscript,
  TextUnderline,
  Trash,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  changeIndent,
  clearBlockFormatting,
  deleteBlock,
  duplicateBlock,
  insertRule,
  moveBlock,
  setAlign,
  setBlockAttrs,
  toggleMeta,
  toggleTask,
  turnInto,
  type BlockTarget,
} from "@/lib/editor/extensions";
import { HIGHLIGHTS } from "@/lib/editor/highlights";
import {
  CASE_MODES,
  changeCase,
  currentBlockText,
  todayLabel,
} from "@/lib/editor/transform";

/**
 * La barre d’outils de la note — **toute la mise en forme, à un endroit**.
 *
 * Trois règles ont commandé sa forme :
 *
 * 1. **Les gestes fréquents restent visibles.** Gras, italique, titres, listes :
 *    rien qui demande d’ouvrir un menu pour la frappe de tous les jours.
 * 2. **Le reste est rangé, pas supprimé.** Les six boutons d’alignement, les
 *    exposants, la transformation de bloc, le déplacement, la recherche : tout
 *    existe, dans deux menus nommés (« Transformer », « Plus »).
 * 3. **Chaque bouton dit son raccourci.** Une barre qui n’enseigne pas le
 *    clavier reste une béquille ; c’est le raccourci affiché qui rend la barre
 *    inutile à la longue — et c’est bien le but.
 *
 * Le type de bloc courant est **écrit en toutes lettres** sur le bouton
 * (« Texte », « Titre 2 »…), parce qu’une icône seule ne dit jamais si l’on est
 * dans un paragraphe ou une citation.
 */

export type Align = "left" | "center" | "right";

export interface EditorSnapshot {
  kind: BlockTarget;
  marks: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    code: boolean;
    highlight: boolean;
    link: boolean;
    superscript: boolean;
    subscript: boolean;
  };
  bullet: boolean;
  ordered: boolean;
  task: boolean;
  checked: boolean;
  marked: boolean;
  indent: number;
  align: Align;
  words: number;
}

const KIND_LABELS: Record<BlockTarget, string> = {
  p: "Texte",
  h1: "Titre 1",
  h2: "Titre 2",
  h3: "Titre 3",
  quote: "Citation",
  rule: "Filet",
};

const BLOCK_CHOICES: {
  target: BlockTarget;
  label: string;
  hint: string;
  shortcut?: string;
  icon: ComponentType<IconProps>;
}[] = [
  { target: "p", label: "Texte", hint: "Paragraphe normal", shortcut: "Ctrl+Alt+0", icon: TextAlignLeft },
  { target: "h1", label: "Titre 1", hint: "Section principale", shortcut: "Ctrl+Alt+1", icon: TextHOne },
  { target: "h2", label: "Titre 2", hint: "Sous-section", shortcut: "Ctrl+Alt+2", icon: TextHTwo },
  { target: "h3", label: "Titre 3", hint: "Détail", shortcut: "Ctrl+Alt+3", icon: TextHThree },
  { target: "quote", label: "Citation", hint: "Passage mis en avant", shortcut: "Ctrl+Maj+9", icon: Quotes },
  { target: "rule", label: "Filet", hint: "Séparateur horizontal", icon: Minus },
];

interface IconProps {
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Petites briques                                                     */
/* ------------------------------------------------------------------ */

function ToolButton({
  label,
  hint,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={hint ? `${label} · ${hint}` : label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn("editor-tool", active && "editor-tool-active", disabled && "opacity-40")}
    >
      {children}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  shortcut,
  checked,
  disabled,
  onSelect,
}: {
  icon?: ComponentType<IconProps>;
  label: string;
  hint?: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={checked}
      disabled={disabled}
      title={shortcut ? `${label} · ${shortcut}` : label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className={cn("editor-menu-item", checked && "is-active", disabled && "opacity-40")}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {Icon ? <Icon size={16} weight={checked ? "bold" : "regular"} /> : null}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate">{label}</span>
        {hint && <span className="block truncate text-[11px] font-normal text-muted">{hint}</span>}
      </span>
      {shortcut && (
        <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10.5px] font-medium text-muted">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

function MenuPanel({
  label,
  open,
  onClose,
  children,
  wide,
}: {
  label: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className={cn("editor-menu", wide && "editor-menu-wide")}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* La barre                                                           */
/* ------------------------------------------------------------------ */

export function EditorToolbar({
  editor,
  snapshot,
  onRun,
  onFind,
}: {
  editor: Editor | null;
  snapshot: EditorSnapshot;
  /** exécute une action puis enregistre (l’appelant décide comment) */
  onRun: (action: (instance: Editor) => void) => void;
  onFind: () => void;
}) {
  const [menu, setMenu] = useState<null | "block" | "more" | "highlight">(null);
  const close = () => setMenu(null);
  const run = (action: (instance: Editor) => void) => {
    setMenu(null);
    onRun(action);
  };

  const chain = (action: (instance: Editor) => void) => () => run(action);

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

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Mise en forme">
      <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto px-1">
        {/* ------------------------------------------------- historique */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolButton label="Annuler" hint="Ctrl+Z" onClick={chain((i) => i.chain().focus().undo().run())}>
            <ArrowUUpLeft size={18} />
          </ToolButton>
          <ToolButton label="Rétablir" hint="Ctrl+Maj+Z" onClick={chain((i) => i.chain().focus().redo().run())}>
            <ArrowCounterClockwise size={18} />
          </ToolButton>
        </div>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        {/* ------------------------------------------------- type de bloc */}
        <span className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu === "block"}
            aria-label={`Type de bloc : ${KIND_LABELS[snapshot.kind]}`}
            title="Transformer le bloc"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setMenu(menu === "block" ? null : "block")}
            className={cn(
              "flex h-9 items-center gap-1 rounded-[10px] px-2 text-[12.5px] font-semibold",
              snapshot.kind === "p" ? "text-ink hover:bg-surface-2" : "bg-accent-soft text-accent-ink",
            )}
          >
            {KIND_LABELS[snapshot.kind]}
            <CaretDown size={12} weight="bold" aria-hidden />
          </button>
          <MenuPanel label="Transformer le bloc" open={menu === "block"} onClose={close}>
            {BLOCK_CHOICES.map((choice) => (
              <MenuItem
                key={choice.target}
                icon={choice.icon}
                label={choice.label}
                hint={choice.hint}
                shortcut={choice.shortcut}
                checked={snapshot.kind === choice.target}
                onSelect={() => run((i) => turnInto(i, choice.target))}
              />
            ))}
          </MenuPanel>
        </span>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        {/* ------------------------------------------------- marques */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolButton label="Gras" hint="Ctrl+B" active={snapshot.marks.bold} onClick={chain((i) => i.chain().focus().toggleBold().run())}>
            <TextB size={18} weight={snapshot.marks.bold ? "bold" : "regular"} />
          </ToolButton>
          <ToolButton label="Italique" hint="Ctrl+I" active={snapshot.marks.italic} onClick={chain((i) => i.chain().focus().toggleItalic().run())}>
            <TextItalic size={18} />
          </ToolButton>
          <ToolButton label="Souligné" hint="Ctrl+U" active={snapshot.marks.underline} onClick={chain((i) => i.chain().focus().toggleUnderline().run())}>
            <TextUnderline size={18} />
          </ToolButton>
          <ToolButton label="Barré" hint="Ctrl+Maj+X" active={snapshot.marks.strike} onClick={chain((i) => i.chain().focus().toggleStrike().run())}>
            <TextStrikethrough size={18} />
          </ToolButton>
          <ToolButton label="Code en ligne" hint="Ctrl+E" active={snapshot.marks.code} onClick={chain((i) => i.chain().focus().toggleCode().run())}>
            <Code size={18} />
          </ToolButton>

          <span className="relative">
            <ToolButton
              label="Surligner"
              hint="Cinq couleurs"
              active={snapshot.marks.highlight}
              onClick={() => setMenu(menu === "highlight" ? null : "highlight")}
            >
              <Highlighter size={18} />
            </ToolButton>
            <MenuPanel label="Couleur du surligneur" open={menu === "highlight"} onClose={close}>
              <div className="flex items-center gap-2 px-2 py-1.5">
                {HIGHLIGHTS.map((highlight) => (
                  <button
                    key={highlight.label}
                    type="button"
                    aria-label={`Surligner en ${highlight.label.toLowerCase()}`}
                    title={highlight.label}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => run((i) => i.chain().focus().toggleHighlight({ color: highlight.color }).run())}
                    className="h-7 w-7 rounded-full border border-line"
                    style={{ background: highlight.color }}
                  />
                ))}
                <button
                  type="button"
                  aria-label="Retirer le surlignage"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => run((i) => i.chain().focus().unsetHighlight().run())}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted"
                >
                  <Eraser size={14} />
                </button>
              </div>
            </MenuPanel>
          </span>

          <ToolButton label="Lien" hint="Ctrl+K" active={snapshot.marks.link} onClick={setLink}>
            <LinkSimple size={18} />
          </ToolButton>
        </div>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        {/* ------------------------------------------------- listes */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolButton label="Liste à puces" hint="Ctrl+Maj+8" active={snapshot.bullet} onClick={chain((i) => toggleMeta(i, "bullet"))}>
            <ListBullets size={18} />
          </ToolButton>
          <ToolButton label="Liste numérotée" hint="Ctrl+Maj+7" active={snapshot.ordered} onClick={chain((i) => toggleMeta(i, "ordered"))}>
            <ListNumbers size={18} />
          </ToolButton>
          <ToolButton label="Case à cocher" hint="Ctrl+Maj+4" active={snapshot.task} onClick={chain((i) => toggleTask(i))}>
            <ListChecks size={18} />
          </ToolButton>
          <ToolButton label="Décaler à droite" hint="Tab" onClick={chain((i) => changeIndent(i, 1))} disabled={snapshot.indent >= 3}>
            <TextIndent size={18} />
          </ToolButton>
          <ToolButton label="Décaler à gauche" hint="Maj+Tab" onClick={chain((i) => changeIndent(i, -1))} disabled={snapshot.indent <= 0}>
            <TextOutdent size={18} />
          </ToolButton>
        </div>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        {/* ------------------------------------------------- alignement */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolButton label="Aligner à gauche" active={snapshot.align === "left"} onClick={chain((i) => setAlign(i, "left"))}>
            <TextAlignLeft size={18} />
          </ToolButton>
          <ToolButton label="Centrer" active={snapshot.align === "center"} onClick={chain((i) => setAlign(i, "center"))}>
            <TextAlignCenter size={18} />
          </ToolButton>
          <ToolButton label="Aligner à droite" active={snapshot.align === "right"} onClick={chain((i) => setAlign(i, "right"))}>
            <TextAlignRight size={18} />
          </ToolButton>
        </div>

        {/* ------------------------------------------------- plus */}
        <span className="relative shrink-0">
          <button
            type="button"
            aria-label="Plus d’options de mise en forme"
            aria-haspopup="menu"
            aria-expanded={menu === "more"}
            title="Plus d’options"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setMenu(menu === "more" ? null : "more")}
            className={cn("editor-tool", menu === "more" && "editor-tool-active")}
          >
            <DotsThree size={20} weight="bold" />
          </button>
          <MenuPanel label="Plus d’options de mise en forme" open={menu === "more"} onClose={close} wide>
            <MenuItem
              icon={TextSuperscript}
              label="Exposant"
              shortcut="Ctrl+."
              checked={snapshot.marks.superscript}
              onSelect={() => run((i) => i.chain().focus().toggleSuperscript().run())}
            />
            <MenuItem
              icon={TextSubscript}
              label="Indice"
              shortcut="Ctrl+,"
              checked={snapshot.marks.subscript}
              onSelect={() => run((i) => i.chain().focus().toggleSubscript().run())}
            />
            <MenuItem
              icon={BookmarkSimple}
              label="Marquer comme réponse"
              hint="Surligne le passage qui répond à une question"
              checked={snapshot.marked}
              onSelect={() => run((i) => setBlockAttrs(i, { marked: !snapshot.marked }))}
            />
            <MenuItem icon={Minus} label="Insérer un filet" hint="Séparateur horizontal" onSelect={() => run((i) => insertRule(i))} />

            <span className="editor-menu-sep" role="separator" />

            <MenuItem
              icon={CopySimple}
              label="Dupliquer le bloc"
              shortcut="Ctrl+Maj+D"
              onSelect={() => run((i) => duplicateBlock(i))}
            />
            <MenuItem icon={ArrowLineUp} label="Monter le bloc" shortcut="Alt+↑" onSelect={() => run((i) => moveBlock(i, -1))} />
            <MenuItem icon={ArrowLineDown} label="Descendre le bloc" shortcut="Alt+↓" onSelect={() => run((i) => moveBlock(i, 1))} />
            <MenuItem icon={Trash} label="Supprimer le bloc" onSelect={() => run((i) => deleteBlock(i))} />

            <span className="editor-menu-sep" role="separator" />

            <MenuItem
              icon={CopySimple}
              label="Copier le bloc"
              hint="Texte du bloc courant"
              onSelect={() => {
                if (!editor) return;
                const text = currentBlockText(editor);
                setMenu(null);
                if (!text) return;
                void navigator.clipboard?.writeText(text);
              }}
            />
            <MenuItem
              icon={CalendarBlank}
              label="Insérer la date"
              hint={todayLabel()}
              onSelect={() =>
                run((i) =>
                  i
                    .chain()
                    .focus()
                    .insertContent({ type: "text", text: todayLabel() })
                    .run(),
                )
              }
            />

            <span className="editor-menu-sep" role="separator" />

            {CASE_MODES.map((item) => (
              <MenuItem
                key={item.mode}
                icon={TextAa}
                label={`Casse : ${item.label}`}
                hint={item.hint}
                onSelect={() => run((i) => changeCase(i, item.mode))}
              />
            ))}

            <span className="editor-menu-sep" role="separator" />

            <MenuItem icon={MagnifyingGlass} label="Rechercher dans la note" shortcut="Ctrl+F" onSelect={() => { setMenu(null); onFind(); }} />
            <MenuItem icon={Eraser} label="Effacer la mise en forme" hint="Marques et type de bloc" onSelect={() => run((i) => clearBlockFormatting(i))} />
          </MenuPanel>
        </span>

        <button
          type="button"
          aria-label="Ajouter une puce"
          title="Nouveau bloc à puce"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            run((i) =>
              i
                .chain()
                .focus()
                .splitBlock()
                .updateAttributes("paragraph", { bullet: true, ordered: false, task: false })
                .run(),
            )
          }
          className="editor-tool shrink-0 text-accent"
        >
          <Plus size={19} weight="bold" />
        </button>
      </div>

      {snapshot.words > 0 && (
        <span className="shrink-0 pr-2 text-[11.5px] tabular-nums text-muted">
          {snapshot.words} mot{snapshot.words > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
