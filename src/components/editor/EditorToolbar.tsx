import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  ArrowCounterClockwise,
  ArrowLineDown,
  ArrowLineUp,
  ArrowUUpLeft,
  BookmarkSimple,
  CalendarBlank,
  CaretDown,
  Code,
  Copy,
  CopySimple,
  SlidersHorizontal,
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
  Question,
  Quotes,
  Ruler,
  ArrowsHorizontal,
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
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Align, EditorSnapshot } from "@/lib/editor/snapshot";
import type { BlockTarget, EditorHost } from "@/lib/editor/host";
import { HIGHLIGHTS } from "@/lib/editor/highlights";
import { CASE_MODES } from "@/lib/editor/host";
import { todayLabel } from "@/lib/editor/transform";
import { useAppStore } from "@/stores/useAppStore";

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

/* Le type vit désormais dans `@/lib/editor/snapshot` : le pupitre et la palette
   décrivent le même instant que cette barre, ils ne doivent pas dépendre d’un
   composant. Ré-exporté ici pour ne pas casser les appelants existants. */
export type { Align, EditorSnapshot } from "@/lib/editor/snapshot";

const KIND_LABELS: Record<BlockTarget, string> = {
  p: "Texte",
  h1: "Titre 1",
  h2: "Titre 2",
  h3: "Titre 3",
  quote: "Citation",
  rule: "Filet",
};

/**
 * Les types de bloc.
 *
 * Deux d’entre eux portent un **glyphe typographique** plutôt qu’une icône :
 * le paragraphe (`¶`) et le filet (`—`). C’est délibéré — `TextAlignLeft`
 * servait aussi à « Aligner à gauche » et `Minus` à « Texte plus petit » : une
 * même image pour deux gestes oblige à lire l’infobulle. Le glyphe, lui, est
 * unique par nature.
 */
const BLOCK_CHOICES: {
  target: BlockTarget;
  label: string;
  hint: string;
  shortcut?: string;
  icon?: ComponentType<IconProps>;
  glyph?: string;
}[] = [
  { target: "p", label: "Texte", hint: "Paragraphe normal", shortcut: "Ctrl+Alt+0", glyph: "¶" },
  { target: "h1", label: "Titre 1", hint: "Section principale", shortcut: "Ctrl+Alt+1", icon: TextHOne },
  { target: "h2", label: "Titre 2", hint: "Sous-section", shortcut: "Ctrl+Alt+2", icon: TextHTwo },
  { target: "h3", label: "Titre 3", hint: "Détail", shortcut: "Ctrl+Alt+3", icon: TextHThree },
  { target: "quote", label: "Citation", hint: "Passage mis en avant", shortcut: "Ctrl+Maj+9", icon: Quotes },
  { target: "rule", label: "Filet", hint: "Séparateur horizontal", glyph: "—" },
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
  glyph,
  label,
  hint,
  shortcut,
  checked,
  disabled,
  onSelect,
}: {
  icon?: ComponentType<IconProps>;
  /** un signe typographique, quand une icône ferait doublon */
  glyph?: string;
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
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center",
          glyph && "font-serif text-[15px] leading-none",
        )}
        aria-hidden
      >
        {glyph ?? (Icon ? <Icon size={16} weight={checked ? "bold" : "regular"} /> : null)}
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
  selection,
  onRun,
  onFind,
  onAsk,
  onOpenPalette,
}: {
  editor: EditorHost | null;
  snapshot: EditorSnapshot;
  /** le passage sélectionné, vide s’il n’y en a pas */
  selection: string;
  /** exécute une action puis enregistre (l’appelant décide comment) */
  onRun: (action: (instance: EditorHost) => void) => void;
  onFind: () => void;
  /** crée une question ancrée sur la sélection */
  onAsk: () => void;
  /** ouvre la palette : tout le reste du registre, loin du pouce */
  onOpenPalette: () => void;
}) {
  const personalization = useAppStore((s) => s.settings.personalization);
  const settings = useAppStore((s) => s.settings);
  const setPersonalization = useAppStore((s) => s.setPersonalization);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setNotePaper = useAppStore((s) => s.setNotePaper);

  /* Les quatre réglages de la note vivaient sur une deuxième barre. Ils sont
     maintenant **dans** la barre, sous « ⋯ » : une barre qui empile deux
     rangées de boutons ne laisse plus de place au texte. */
  const noteSettings: {
    icon?: ComponentType<IconProps>;
    glyph?: string;
    label: string;
    hint: string;
    disabled?: boolean;
    run: () => void;
  }[] = [
    {
      glyph: "A+",
      label: "Texte plus grand",
      hint: `${settings.fontSize} px`,
      disabled: settings.fontSize >= 22,
      run: () => setFontSize(settings.fontSize + 1),
    },
    {
      glyph: "A−",
      label: "Texte plus petit",
      hint: `${settings.fontSize} px`,
      disabled: settings.fontSize <= 14,
      run: () => setFontSize(settings.fontSize - 1),
    },
    {
      icon: TextAa,
      label: "Interligne",
      hint:
        personalization.noteLeading >= 36
          ? "revenir au serré"
          : `${personalization.noteLeading} px`,
      run: () =>
        setPersonalization({
          noteLeading: personalization.noteLeading >= 36 ? 20 : personalization.noteLeading + 2,
        }),
    },
    {
      icon: ArrowsHorizontal,
      label: "Largeur de lecture",
      hint: `${personalization.readingWidth} px`,
      run: () =>
        setPersonalization({
          readingWidth:
            [560, 640, 720, 840, 920][
              ([560, 640, 720, 840, 920].indexOf(personalization.readingWidth) + 1) % 5
            ] ?? 720,
        }),
    },
    {
      icon: Ruler,
      label: "Papier de la note",
      hint: settings.notePaper === "ruled" ? "Ligné" : "Uni",
      run: () => setNotePaper(settings.notePaper === "ruled" ? "plain" : "ruled"),
    },
  ];
  const [menu, setMenu] = useState<null | "block" | "more" | "highlight">(null);
  const close = () => setMenu(null);
  const run = (action: (instance: EditorHost) => void) => {
    setMenu(null);
    onRun(action);
  };

  const chain = (action: (instance: EditorHost) => void) => () => run(action);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.currentHref();
    const href = window.prompt("Adresse du lien", previous ?? "https://");
    if (href === null) return;
    run((instance) => {
      instance.focus();
      instance.setLink(href.trim() === "" ? null : href.trim());
    });
  };

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Mise en forme">
      <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto px-1">
        {/* ------------------------------------------------- historique */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolButton label="Annuler" hint="Ctrl+Z" onClick={chain((i) => i.undo())}>
            <ArrowUUpLeft size={18} />
          </ToolButton>
          <ToolButton label="Rétablir" hint="Ctrl+Maj+Z" onClick={chain((i) => i.redo())}>
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
                glyph={choice.glyph}
                label={choice.label}
                hint={choice.hint}
                shortcut={choice.shortcut}
                checked={snapshot.kind === choice.target}
                onSelect={() => run((i) => i.turnInto(choice.target))}
              />
            ))}
          </MenuPanel>
        </span>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        {/* ------------------------------------------------- marques */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolButton label="Gras" hint="Ctrl+B" active={snapshot.marks.bold} onClick={chain((i) => i.toggleMark("bold"))}>
            <TextB size={18} weight={snapshot.marks.bold ? "bold" : "regular"} />
          </ToolButton>
          <ToolButton label="Italique" hint="Ctrl+I" active={snapshot.marks.italic} onClick={chain((i) => i.toggleMark("italic"))}>
            <TextItalic size={18} />
          </ToolButton>
          <ToolButton label="Souligné" hint="Ctrl+U" active={snapshot.marks.underline} onClick={chain((i) => i.toggleMark("underline"))}>
            <TextUnderline size={18} />
          </ToolButton>
          <ToolButton label="Barré" hint="Ctrl+Maj+X" active={snapshot.marks.strike} onClick={chain((i) => i.toggleMark("strike"))}>
            <TextStrikethrough size={18} />
          </ToolButton>
          <ToolButton label="Code en ligne" hint="Ctrl+E" active={snapshot.marks.code} onClick={chain((i) => i.toggleMark("code"))}>
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
                    onClick={() => run((i) => i.highlight(highlight.color))}
                    className="h-7 w-7 rounded-full border border-line"
                    style={{ background: highlight.color }}
                  />
                ))}
                <button
                  type="button"
                  aria-label="Retirer le surlignage"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => run((i) => i.highlight(null))}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            </MenuPanel>
          </span>

          <ToolButton label="Lien" hint="Ctrl+K" active={snapshot.marks.link} onClick={setLink}>
            <LinkSimple size={18} />
          </ToolButton>
        </div>
        {/* À partir d’ici, les gestes de structure vont à **droite** quand la
            largeur le permet : la barre se lit en deux groupes, et la main
            n’a pas à traverser tout l’écran pour trouver le bouton « ⋯ ». */}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        {/* ------------------------------------------------- listes */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolButton label="Liste à puces" hint="Ctrl+Maj+8" active={snapshot.bullet} onClick={chain((i) => i.toggleMeta("bullet"))}>
            <ListBullets size={18} />
          </ToolButton>
          <ToolButton label="Liste numérotée" hint="Ctrl+Maj+7" active={snapshot.ordered} onClick={chain((i) => i.toggleMeta("ordered"))}>
            <ListNumbers size={18} />
          </ToolButton>
          <ToolButton label="Case à cocher" hint="Ctrl+Maj+4" active={snapshot.task} onClick={chain((i) => i.toggleTask())}>
            <ListChecks size={18} />
          </ToolButton>
          <ToolButton label="Décaler à droite" hint="Tab" onClick={chain((i) => i.changeIndent(1))} disabled={snapshot.indent >= 3}>
            <TextIndent size={18} />
          </ToolButton>
          <ToolButton label="Décaler à gauche" hint="Maj+Tab" onClick={chain((i) => i.changeIndent(-1))} disabled={snapshot.indent <= 0}>
            <TextOutdent size={18} />
          </ToolButton>
        </div>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        {/* ------------------------------------------------- alignement */}
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolButton label="Aligner à gauche" hint="Ctrl+Maj+L" active={snapshot.align === "left"} onClick={chain((i) => i.setAlign("left"))}>
            <TextAlignLeft size={18} />
          </ToolButton>
          <ToolButton label="Centrer" hint="Ctrl+Maj+E" active={snapshot.align === "center"} onClick={chain((i) => i.setAlign("center"))}>
            <TextAlignCenter size={18} />
          </ToolButton>
          <ToolButton label="Aligner à droite" hint="Ctrl+Maj+R" active={snapshot.align === "right"} onClick={chain((i) => i.setAlign("right"))}>
            <TextAlignRight size={18} />
          </ToolButton>
        </div>

        {/* ------------------------------------------------- question */}
        <ToolButton
          label="Créer une question"
          hint={selection ? "Sur le passage sélectionné" : "Sélectionnez un passage"}
          disabled={!selection || !editor}
          onClick={() => {
            setMenu(null);
            onAsk();
          }}
        >
          <Question size={18} />
        </ToolButton>

        {/* ------------------------------------------------- plus */}
        <span className="relative shrink-0">
          <button
            type="button"
            aria-label="Plus d’options de mise en forme"
            aria-haspopup="menu"
            aria-expanded={menu === "more"}
            title="Mise en forme, blocs et affichage"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setMenu(menu === "more" ? null : "more")}
            className={cn("editor-tool", menu === "more" && "editor-tool-active")}
          >
            <SlidersHorizontal size={19} />
          </button>
          <MenuPanel label="Plus d’options de mise en forme" open={menu === "more"} onClose={close} wide>
            <MenuItem
              icon={TextSuperscript}
              label="Exposant"
              shortcut="Ctrl+."
              checked={snapshot.marks.superscript}
              onSelect={() => run((i) => i.toggleMark("superscript"))}
            />
            <MenuItem
              icon={TextSubscript}
              label="Indice"
              shortcut="Ctrl+,"
              checked={snapshot.marks.subscript}
              onSelect={() => run((i) => i.toggleMark("subscript"))}
            />
            <MenuItem
              icon={BookmarkSimple}
              label="Marquer comme réponse"
              hint="Surligne le passage qui répond à une question"
              checked={snapshot.marked}
              onSelect={() => run((i) => i.setAttrs({ marked: !snapshot.marked }))}
            />
            <MenuItem icon={Minus} label="Insérer un filet" hint="Séparateur horizontal" onSelect={() => run((i) => i.insertRule())} />

            <span className="editor-menu-sep" role="separator" />

            <MenuItem
              icon={CopySimple}
              label="Dupliquer le bloc"
              shortcut="Ctrl+Maj+D"
              onSelect={() => run((i) => i.duplicateBlock())}
            />
            <MenuItem icon={ArrowLineUp} label="Monter le bloc" shortcut="Alt+↑" onSelect={() => run((i) => i.moveBlock(-1))} />
            <MenuItem icon={ArrowLineDown} label="Descendre le bloc" shortcut="Alt+↓" onSelect={() => run((i) => i.moveBlock(1))} />
            <MenuItem icon={Trash} label="Supprimer le bloc" onSelect={() => run((i) => i.deleteBlock())} />

            <span className="editor-menu-sep" role="separator" />

            <MenuItem
              icon={Copy}
              label="Copier le bloc"
              hint="Texte du bloc courant"
              onSelect={() => {
                if (!editor) return;
                const text = editor.blockText();
                setMenu(null);
                if (!text) return;
                void navigator.clipboard?.writeText(text);
              }}
            />
            <MenuItem
              icon={CalendarBlank}
              label="Insérer la date"
              hint={todayLabel()}
              onSelect={() => run((i) => i.insertText(todayLabel()))}
            />

            <span className="editor-menu-sep" role="separator" />

            {CASE_MODES.map((item) => (
              <MenuItem
                key={item.mode}
                glyph={item.hint.split("→")[1]?.trim() ?? "Aa"}
                label={`Casse : ${item.label}`}
                hint={item.hint}
                onSelect={() => run((i) => i.changeCase(item.mode))}
              />
            ))}

            <span className="editor-menu-sep" role="separator" />

            <MenuItem icon={MagnifyingGlass} label="Rechercher dans la note" shortcut="Ctrl+F" onSelect={() => { setMenu(null); onFind(); }} />
            <MenuItem icon={Eraser} label="Effacer la mise en forme" hint="Marques et type de bloc" onSelect={() => run((i) => i.clearFormatting())} />

            <span className="editor-menu-sep" role="separator" />
            <p className="px-2 pb-1 pt-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
              Affichage de la note
            </p>
            {noteSettings.map((item) => (
              <MenuItem
                key={item.label}
                icon={item.icon}
                glyph={item.glyph}
                label={item.label}
                hint={item.hint}
                disabled={item.disabled}
                onSelect={() => {
                  setMenu(null);
                  item.run();
                }}
              />
            ))}
          </MenuPanel>
        </span>

        <span className="ml-auto" aria-hidden="true" />

        <button
          type="button"
          aria-label="Ajouter une puce"
          title="Nouveau bloc à puce"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            run((i) =>
              i.splitBlock({ kind: "p", bullet: true, ordered: false, task: false }),
            )
          }
          className="editor-tool shrink-0 text-accent"
        >
          <Plus size={19} weight="bold" />
        </button>

        <button
          type="button"
          aria-label="Toutes les commandes"
          title="Toutes les commandes (Ctrl+K)"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setMenu(null);
            onOpenPalette();
          }}
          className="editor-tool shrink-0 px-2.5 text-[12.5px] font-semibold text-muted"
          style={{ width: "auto" }}
        >
          Tout
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
