import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  CaretDown,
  CaretRight,
  Check,
  Eyedropper,
  SlidersHorizontal,
  WarningCircle,
} from "@phosphor-icons/react";
import { AppBar, Screen, Segmented } from "@/components/Layout";
import { effectiveMode, useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import {
  contrastLevel,
  deriveAccent,
  formatContrast,
  isHex,
  parseHex,
  toHex,
} from "@/lib/accent";
import { ACCENT_PRESETS } from "@/lib/accents";
import {
  PALETTES,
  PALETTE_FAMILIES,
  paletteByKey,
  tokensFor,
} from "@/lib/themes";
import type { AccentKey, CanvasBg, Personalization, ThemeMode } from "@/types";
import { SIGNATURES, WALLS, wallById, wallUrl, wallsBySeries } from "@/lib/walls";
import { veilFromTone, veilTint } from "@/lib/palette";
import { useWallColors } from "@/stores/useWallColors";
import {
  PRESENTATION,
  type ChoiceControl,
} from "@/lib/presentation";
import {
  LAYERS,
  activeLayers,
  composeAppearance,
  compositionLine,
  type LayerId,
  type LayerState,
} from "@/lib/composition";
import {
  WALL_BLUR_MAX,
  WALL_BLUR_MIN,
  effectiveBlur,
  effectiveVeil,
  toRgb,
  veilBand,
} from "@/lib/glass";

/* Une seule source de vérité pour les pastilles (cf. lib/accents.ts) */
const ACCENTS = ACCENT_PRESETS.map((preset) => ({
  key: preset.key as AccentKey,
  label: preset.label,
  light: preset.light,
  dark: preset.dark,
}));

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "system", label: "Auto" },
];

const FONT_OPTIONS: { value: "literata" | "inter"; label: string }[] = [
  { value: "literata", label: "Literata" },
  { value: "inter", label: "Inter" },
];

const CANVASES: { key: CanvasBg; label: string }[] = [
  { key: "dots", label: "Pointillé" },
  { key: "ruled", label: "Ligné" },
  { key: "grid", label: "Quadrillé" },
  { key: "blank", label: "Blanc" },
];

/** La couche « Formes » vient du registre de `lib/presentation.ts`. */
const FORMES = PRESENTATION.find((section) => section.id === "formes")!;
/** La couche « Mesure » aussi : on n’en montre qu’un résumé ici. */
const MESURE = PRESENTATION.find((section) => section.id === "mesure")!;

/**
 * L’état de dépliage des sections.
 *
 * Les sections sont **repliées par défaut** : l’écran s’ouvre donc sur
 * l’aperçu, et non sur quatre écrans de pastilles. Chaque en-tête replié porte
 * la valeur courante de sa couche — replier ne cache jamais une information,
 * seulement des contrôles.
 */
const SectionState = createContext<{
  openIds: string[];
  open: (id: string) => void;
  toggle: (id: string) => void;
  goTo: (id: string) => void;
}>({
  openIds: [],
  open: () => {},
  toggle: () => {},
  goTo: () => {},
});

const useSections = () => useContext(SectionState);

/**
 * **Apparence — un studio de composition.**
 *
 * L’écran précédent empilait des listes : mode, 23 palettes, signatures, fonds,
 * accent, formes, typographie. Visuellement correct, mais faux sur le fond : il
 * laissait croire qu’on choisit *un thème* puis qu’on « ajoute » des options.
 *
 * Ici l’ordre raconte la vérité du produit : une apparence se **compose en cinq
 * couches**, et le thème n’est que la première. L’aperçu, la pile et la recette
 * sont en haut, toujours visibles ; chaque section en dessous correspond à une
 * couche, et l’on peut revenir sur n’importe laquelle après coup.
 *
 * Le modèle de cette page est pur et testé : `src/lib/composition.ts`.
 */
export default function Appearance() {
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const setTheme = useAppStore((s) => s.setTheme);
  const setPalette = useAppStore((s) => s.setPalette);
  const setWallpaper = useAppStore((s) => s.setWallpaper);
  const setWallSettings = useAppStore((s) => s.setWallSettings);
  const setPersonalization = useAppStore((s) => s.setPersonalization);

  const dark = effectiveMode(settings) === "dark";
  const currentPalette = paletteByKey(settings.paletteKey);
  const fixedMode = currentPalette.key !== "papier";

  const layers = useMemo(() => composeAppearance(settings), [settings]);
  const [openIds, setOpenIds] = useState<string[]>([]);

  const open = useCallback((id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  }, []);

  /* Un lien direct (`#couche-accent`) ouvre la couche visée, sinon le bloc
     resterait replié et l’ancre ne montrerait rien. */
  const goTo = useCallback((id: string) => {
    open(id);
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [open]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash.startsWith("couche-")) open(hash);
  }, [open]);

  const confort = [
    settings.contrast === "on"
      ? "contraste élevé"
      : settings.contrast === "off"
        ? "contraste normal"
        : "contraste système",
    settings.motion === "reduced" ? "animations réduites" : "animations système",
    settings.transparency === "reduced"
      ? "transparence réduite"
      : "transparence système",
    settings.layout === "auto" || !settings.layout
      ? "mise en page auto"
      : `mise en page ${settings.layout}`,
  ].join(" · ");

  return (
    <SectionState.Provider value={{ openIds, open, toggle, goTo }}>
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar
        back
        onBack={() => navigate("/settings")}
        title="Apparence"
        center={false}
      />

      <p className="mb-3 mt-1 max-w-[62ch] text-[13px] leading-[19px] text-muted">
        Cinq couches. Le thème est la <strong className="font-semibold text-ink">première</strong>,
        pas la dernière : tout ce qui vient après lui reste réglable.
      </p>

      <CompositionStudio />

      <RecipeBar />

      <JumpNav />

      {/* ---------------------------------------------------------- */}
      {/* 1 · Palette                                                */}
      {/* ---------------------------------------------------------- */}
      <Section
        id="couche-palette"
        index={1}
        title="Palette"
        subtitle="Le socle : papier, surfaces, encre, texte secondaire."
        action="socle"
        summary={layers[0].value}
      >
        <div className="mb-3">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
            Mode
          </h3>
          <Segmented
            value={settings.theme}
            onChange={(mode) => setTheme(mode)}
            label="Mode"
            options={THEME_OPTIONS}
          />
          {fixedMode && (
            <p className="mt-2 rounded-field bg-surface-2 px-3 py-2 text-[12.5px] leading-[18px] text-muted">
              « {currentPalette.label} » n’existe qu’en{" "}
              {currentPalette.mode === "dark" ? "sombre" : "clair"}. Le mode
              ci-dessus ne s’applique qu’au thème « Papier calme » ; utilisez la
              palette jumelle pour changer de luminosité.
            </p>
          )}
        </div>

        <p className="mb-3 text-[12.5px] leading-[18px] text-muted">
          {PALETTES.length} palettes vérifiées, regroupées par famille (Catppuccin,
          Nord, Gruvbox, Solarized, Rosé Pine, Tokyo Night, Everforest, Material 3,
          Radix). Chaque paire texte/fond est mesurée : sous AA, la teinte est
          corrigée du minimum nécessaire. Une palette donne les jetons de base —
          les quatre couches suivantes peuvent encore les déplacer.
        </p>

        {PALETTE_FAMILIES.map((family) => (
          <section key={family} className="mb-4">
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
              {family}
            </h3>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {PALETTES.filter((palette) => palette.family === family).map(
                (palette) => {
                  const tokens = tokensFor(palette.key);
                  const active = settings.paletteKey === palette.key;
                  return (
                    <button
                      key={palette.key}
                      type="button"
                      onClick={() => setPalette(palette.key)}
                      aria-pressed={active}
                      aria-label={`Thème ${palette.label} (${palette.mode === "dark" ? "sombre" : "clair"})`}
                      className={cn(
                        "group flex flex-col overflow-hidden rounded-card border text-left transition-colors",
                        active
                          ? "border-accent ring-2 ring-accent"
                          : "border-line hover:border-line-strong",
                      )}
                    >
                      <span
                        className="flex h-[54px] items-end gap-1 p-2"
                        style={{ background: tokens.bg }}
                        aria-hidden
                      >
                        <span
                          className="h-7 flex-1 rounded-t-md"
                          style={{ background: tokens.surface }}
                        />
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ background: tokens.accent }}
                        />
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: tokens.ink }}
                        />
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: tokens.muted }}
                        />
                      </span>
                      <span className="flex items-center gap-1.5 bg-surface px-2.5 py-2">
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                          {palette.label}
                        </span>
                        <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase text-muted">
                          {palette.mode === "dark" ? "nuit" : "jour"}
                        </span>
                        {active && (
                          <Check
                            size={14}
                            weight="bold"
                            className="shrink-0 text-accent"
                            aria-hidden
                          />
                        )}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </section>
        ))}
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 2 · Fond                                                   */}
      {/* ---------------------------------------------------------- */}
      <Section
        id="couche-fond"
        index={2}
        title="Fond"
        subtitle="L’image derrière l’interface, et la teinte de son voile."
        action="superpose"
        summary={`${layers[1].value} · voile ${settings.wallDim} %`}
      >
        <Signatures />

        <WallsGallery />

        <WallTuning />
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 3 · Accent                                                 */}
      {/* ---------------------------------------------------------- */}
      <Section
        id="couche-accent"
        index={3}
        title="Accent"
        subtitle="La couleur d’action — et le texte posé dessus."
        action="ecrase"
        summary={layers[2].value}
      >
        <WallAccentPanel />
        <AccentPresets dark={dark} />
        <CustomAccentSection dark={dark} />

      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 4 · Formes                                                 */}
      {/* ---------------------------------------------------------- */}
      <Section
        id="couche-formes"
        index={4}
        title="Formes"
        subtitle="Rayons, densité, traits, relief : la géométrie seule, sans couleur."
        action="geometrie"
        summary={layers[3].value}
      >
        <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
          {FORMES.controls.map((control) => (
            <ChoiceRow
              key={control.id}
              control={control as ChoiceControl}
              value={String(settings.personalization?.[control.id] ?? "")}
              onChange={(value) =>
                setPersonalization({ [control.id]: value } as Partial<Personalization>)
              }
            />
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-[17px] text-muted">
          Ces quatre réglages ne touchent <strong className="font-semibold text-ink">aucune
          couleur</strong> : ils se combinent avec n’importe quelle palette et
          n’importe quel fond. C’est ce qui fait qu’un thème choisi hier reste
          utilisable avec les formes choisies aujourd’hui.
        </p>

        <button
          type="button"
          onClick={() => navigate("/settings/personalization")}
          className="mt-3 flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3.5 text-left transition-colors active:bg-surface-2"
        >
          <span className="tile" aria-hidden="true">
            <SlidersHorizontal size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">
              Présentation avancée
            </span>
            <span className="mt-0.5 block text-[13px] leading-[18px] text-muted">
              Mesure du texte, teinte du papier, force du canevas
            </span>
          </span>
          <CaretRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
        </button>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 5 · Texte                                                  */}
      {/* ---------------------------------------------------------- */}
      <Section
        id="couche-texte"
        index={5}
        title="Texte"
        subtitle="Police, taille, interligne, largeur de lecture."
        action="typographie"
        summary={layers[4].value}
      >
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
          Police des notes
        </h3>
        <Segmented
          value={settings.font}
          onChange={useAppStore.getState().setFont}
          label="Police des notes"
          options={FONT_OPTIONS}
        />

        <div className="mt-4 flex items-baseline justify-between">
          <label htmlFor="font-size" className="text-[16px]">
            Taille du texte
          </label>
          <span className="text-[16px] font-semibold text-accent">
            {settings.fontSize} px
          </span>
        </div>
        <input
          id="font-size"
          type="range"
          min={14}
          max={22}
          step={1}
          value={settings.fontSize}
          onChange={(event) =>
            useAppStore.getState().setFontSize(Number(event.target.value))
          }
          className="mt-2 w-full"
        />

        <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-muted">
          Mesure du paragraphe
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {MESURE.controls.slice(0, 2).map((control) => (
            <label
              key={control.id}
              className="rounded-field border border-line bg-surface-2 px-3 py-2"
            >
              <span className="block text-[11.5px] text-muted">{control.label}</span>
              <span className="mt-1 flex items-baseline gap-1">
                <input
                  type="number"
                  value={Number(settings.personalization?.[control.id] ?? 0)}
                  min={"min" in control ? control.min : undefined}
                  max={"max" in control ? control.max : undefined}
                  step={"step" in control ? control.step : undefined}
                  onChange={(event) =>
                    setPersonalization({
                      [control.id]: Number(event.target.value),
                    } as Partial<Personalization>)
                  }
                  aria-label={control.label}
                  className="w-full bg-transparent text-[15px] font-semibold text-ink outline-none"
                />
                <span className="text-[12px] text-muted">
                  {"unit" in control ? control.unit.trim() : ""}
                </span>
              </span>
            </label>
          ))}
        </div>

        <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-muted">
          Fond du canevas
        </h3>
        <div className="flex items-start justify-between">
          {CANVASES.map((canvas) => {
            const active = settings.canvas === canvas.key;
            return (
              <button
                key={canvas.key}
                type="button"
                onClick={() => useAppStore.getState().setCanvas(canvas.key)}
                aria-pressed={active}
                className="flex w-[76px] flex-col items-center"
              >
                <span
                  className={cn(
                    "paper h-[76px] w-[76px] rounded-field border",
                    active ? "border-2 border-accent" : "border-line",
                  )}
                  data-canvas={canvas.key}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "mt-1.5 text-center text-[14px]",
                    active ? "font-semibold text-ink" : "text-muted",
                  )}
                >
                  {canvas.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* Confort                                                    */}
      {/* ---------------------------------------------------------- */}
      <Section
        id="couche-confort"
        title="Confort"
        subtitle="Ce qui aide à lire — et qui ne change aucune apparence."
        action="typographie"
        summary={confort}
      >
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <div>
            <div className="mb-1.5 text-[14px]">Contraste élevé</div>
            <Segmented
              value={settings.contrast}
              onChange={useAppStore.getState().setContrast}
              label="Contraste élevé"
              options={[
                { value: "system" as const, label: "Système" },
                { value: "on" as const, label: "Activé" },
                { value: "off" as const, label: "Désactivé" },
              ]}
            />
          </div>
          <div>
            <div className="mb-1.5 text-[14px]">Réduire les animations</div>
            <Segmented
              value={settings.motion}
              onChange={useAppStore.getState().setMotion}
              label="Réduire les animations"
              options={[
                { value: "system" as const, label: "Système" },
                { value: "reduced" as const, label: "Réduit" },
              ]}
            />
          </div>
          <div>
            <div className="mb-1.5 text-[14px]">Réduire la transparence</div>
            <Segmented
              value={settings.transparency}
              onChange={useAppStore.getState().setTransparency}
              label="Réduire la transparence"
              options={[
                { value: "system" as const, label: "Système" },
                { value: "reduced" as const, label: "Réduit" },
              ]}
            />
          </div>
          <div>
            <div className="mb-1.5 text-[14px]">Mise en page</div>
            <Segmented
              options={[
                { value: "auto", label: "Auto" },
                { value: "desktop", label: "Bureau" },
                { value: "mobile", label: "Mobile" },
              ]}
              value={settings.layout ?? "auto"}
              onChange={(value) =>
                useAppStore.getState().setLayout(value as "auto" | "desktop" | "mobile")
              }
              label="Mise en page"
            />
            <p className="mt-1.5 text-[12px] leading-[17px] text-muted">
              « Bureau » garde le rail même dans une fenêtre étroite (utile en
              aperçu) ; « Mobile » reproduit le téléphone sur grand écran.
            </p>
          </div>
        </div>
      </Section>

      <div className="h-10" aria-hidden="true" />
    </Screen>
    </SectionState.Provider>
  );
}

/* ================================================================== */
/* Studio : aperçu vivant, pile de couches, recette                    */
/* ================================================================== */

function CompositionStudio() {
  const settings = useAppStore((s) => s.settings);
  const layers = useMemo(() => composeAppearance(settings), [settings]);
  const active = activeLayers(settings);
  const wall = settings.wallpaper ? wallById(settings.wallpaper) : undefined;

  return (
    <section
      aria-labelledby="composition-titre"
      className="overflow-hidden rounded-sheet border border-line bg-surface"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id="composition-titre" className="text-[14px] font-semibold">
          Votre composition
        </h2>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold text-muted">
          {active} couches actives
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <CompositionPreview wallUrlValue={wall ? wallUrl(wall.id) : null} />

        <ol className="flex flex-col gap-1.5">
          {layers.map((layer) => (
            <li key={layer.id}>
              <LayerRow layer={layer} layers={layers} />
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-line bg-surface-2/60 px-4 py-3">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
          Recette
        </p>
        <p className="mt-1 text-[13px] leading-[19px] text-ink">
          {compositionLine(settings)}
        </p>
        <p className="mt-1.5 text-[11.5px] leading-[17px] text-muted">
          Un thème n’est pas une fin : chaque couche ci-dessus reste modifiable
          après coup, et les couches du dessus ne dépendent pas de la palette.
        </p>
      </div>
    </section>
  );
}

/** L’aperçu : un vrai morceau d’interface, pas une image. */
function CompositionPreview({ wallUrlValue }: { wallUrlValue: string | null }) {
  const settings = useAppStore((s) => s.settings);
  const wall = settings.wallpaper ? wallById(settings.wallpaper) : undefined;
  const tokens = tokensFor(settings.paletteKey);

  return (
    <div
      className="relative overflow-hidden rounded-card border border-line p-3"
      style={{ background: wallUrlValue ? undefined : tokens.bg }}
      aria-label="Aperçu de la composition"
      role="img"
    >
      {wallUrlValue && (
        <>
          <span
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${wallUrlValue})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden
          />
          <span
            className="absolute inset-0 backdrop-blur-[6px]"
            style={{ background: "color-mix(in srgb, var(--bg) 42%, transparent)" }}
            aria-hidden
          />
        </>
      )}

      <div className="relative">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/80">
            {wall ? wall.label : "Papier uni"}
          </span>
        </div>

        <div className="mt-2 rounded-card border border-line bg-surface p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-accent">
            Cours · droit civil
          </p>
          <p className="mt-1 text-[15px] font-semibold leading-[20px] text-ink">
            Conditions de validité du contrat
          </p>
          <p className="mt-1 text-[12px] leading-[17px] text-muted">
            Consentement exempt de vices, capacité de contracter, contenu licite
            et certain.
          </p>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-on-accent">
              Réviser
            </span>
            <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink">
              Modifier
            </span>
            <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent-ink">
              12 fiches
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-field border border-line bg-surface-2/70 px-2.5 py-1.5">
          <span className="text-[10.5px] text-muted">
            {settings.font === "literata" ? "Literata" : "Inter"} ·{" "}
            {settings.fontSize} px
          </span>
          <span className="flex gap-1" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-accent" />
            <span className="h-3 w-3 rounded-full bg-accent-soft" />
            <span className="h-3 w-3 rounded-full bg-line" />
          </span>
        </div>
      </div>
    </div>
  );
}

const ACTION_STYLE: Record<LayerState["action"], string> = {
  socle: "bg-surface-2 text-muted",
  superpose: "bg-accent-soft text-accent-ink",
  ecrase: "bg-accent text-on-accent",
  geometrie: "border border-line text-ink",
  typographie: "border border-line text-ink",
};

const ACTION_LABEL: Record<LayerState["action"], string> = {
  socle: "socle",
  superpose: "se superpose",
  ecrase: "écrase",
  geometrie: "géométrie",
  typographie: "typographie",
};

/**
 * Une ligne de la pile : numéro, nom, ce qu’elle vaut, et **ce qu’elle fait à
 * la couche du dessous**. C’est le cœur explicatif de l’écran : on voit que le
 * fond se superpose au socle, que l’accent écrase une couleur, que les formes
 * ne touchent qu’à la géométrie.
 */
function LayerRow({ layer, layers }: { layer: LayerState; layers: LayerState[] }) {
  const { goTo } = useSections();
  const previous = layers.find((entry) => entry.index === layer.index - 1);
  return (
    <a
      href={`#couche-${layer.id}`}
      onClick={(event) => {
        event.preventDefault();
        goTo(`couche-${layer.id}`);
      }}
      className="flex items-center gap-2.5 rounded-field border border-line bg-surface-2/40 px-2.5 py-2 transition-colors hover:border-line-strong"
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold",
          layer.active ? "bg-accent text-on-accent" : "bg-surface-2 text-muted",
        )}
        aria-hidden
      >
        {layer.index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-ink">{layer.label}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              ACTION_STYLE[layer.action],
            )}
          >
            {ACTION_LABEL[layer.action]}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-muted">
          {layer.value} · {layer.detail}
          {previous && layer.action !== "socle" && (
            <span className="text-muted/80"> — après {previous.label}</span>
          )}
        </span>
      </span>
    </a>
  );
}

/**
 * La recette, en barre collante.
 *
 * Quand une section est dépliée, l’aperçu du haut sort de l’écran. Cette bande
 * le remplace : elle dit en une ligne ce qui est composé, et permet de tout
 * replier d’un geste pour revenir à l’aperçu.
 */
function RecipeBar() {
  const settings = useAppStore((s) => s.settings);
  const { openIds, toggle, open } = useSections();

  return (
    <div className="sticky top-0 z-20 -mx-5 mt-3 border-y border-line bg-surface/85 px-5 py-2 backdrop-blur-xl lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[12px] text-muted">
          {compositionLine(settings)}
        </p>
        {openIds.length > 0 && (
          <button
            type="button"
            onClick={() => openIds.forEach((id) => toggle(id))}
            className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ink"
          >
            Tout replier
          </button>
        )}
        {openIds.length === 0 && (
          <button
            type="button"
            onClick={() => open("couche-palette")}
            className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ink"
          >
            Composer
          </button>
        )}
      </div>
    </div>
  );
}

/** Sommaire : cinq ancres, pour aller droit à la couche qu’on veut changer. */
function JumpNav() {
  const { openIds, goTo } = useSections();
  return (
    <nav
      aria-label="Couches de l’apparence"
      className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1"
    >
      {LAYERS.map((layer) => {
        const expanded = openIds.includes(`couche-${layer.id}`);
        return (
          <a
            key={layer.id}
            href={`#couche-${layer.id}`}
            onClick={(event) => {
              event.preventDefault();
              goTo(`couche-${layer.id}`);
            }}
            aria-current={expanded ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-medium",
              expanded
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line bg-surface text-ink",
            )}
          >
            {layer.index}. {layer.label}
          </a>
        );
      })}
    </nav>
  );
}

/**
 * Une section repliable.
 *
 * L’en-tête **est** le bouton : titre, verbe de la couche, et — quand la section
 * est fermée — la valeur courante en clair. Replier ne cache donc jamais ce qui
 * est appliqué, seulement les contrôles. Tout l’écran tient alors en une page,
 * et l’aperçu du haut reste sous les yeux.
 */
function Section({
  id,
  index,
  title,
  subtitle,
  action,
  summary,
  children,
}: {
  id: string;
  index?: number;
  title: string;
  subtitle: string;
  action: LayerState["action"];
  summary: string;
  children: React.ReactNode;
}) {
  const { openIds, toggle } = useSections();
  const expanded = openIds.includes(id);

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titre`}
      className="mt-3 scroll-mt-24 rounded-sheet border border-line bg-surface px-4 py-1"
    >
      <h2 id={`${id}-titre`} className="sr-only">
        {title}
      </h2>
      <button
        type="button"
        onClick={() => toggle(id)}
        aria-expanded={expanded}
        aria-controls={`${id}-corps`}
        aria-label={`${expanded ? "Replier" : "Déplier"} ${title}`}
        className="flex w-full items-start gap-2.5 py-3 text-left"
      >
        {index !== undefined && (
          <span
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold",
              expanded
                ? "bg-accent text-on-accent"
                : "bg-surface-2 text-muted",
            )}
            aria-hidden
          >
            {index}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[15.5px] font-semibold text-ink">{title}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                ACTION_STYLE[action],
              )}
            >
              {ACTION_LABEL[action]}
            </span>
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-[18px] text-muted">
            {subtitle}
          </span>
          {!expanded && (
            <span className="mt-1 block truncate text-[12.5px] font-medium text-ink">
              {summary}
            </span>
          )}
        </span>
        <CaretDown
          size={18}
          weight="bold"
          aria-hidden
          className={cn(
            "mt-1 shrink-0 text-muted transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && (
        <div id={`${id}-corps`} className="pb-4">
          {children}
        </div>
      )}
    </section>
  );
}

/* ================================================================== */
/* Couche 2 — fond : signatures, galerie, réglages                     */
/* ================================================================== */

function Signatures() {
  const settings = useAppStore((s) => s.settings);
  const setPalette = useAppStore((s) => s.setPalette);
  const setWallpaper = useAppStore((s) => s.setWallpaper);
  const setPersonalization = useAppStore((s) => s.setPersonalization);

  return (
    <>
      <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
        Signatures · un goût complet en un geste
      </h3>
      <p className="mb-2 text-[12.5px] leading-[18px] text-muted">
        Choisir une signature règle le fond, la palette et les formes d’un seul
        coup. Rien n’est verrouillé : chaque couche reste modifiable ensuite.
      </p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {SIGNATURES.map((signature) => {
          const tokens = tokensFor(signature.palette);
          const active =
            settings.paletteKey === signature.palette &&
            settings.wallpaper === signature.wallpaper;
          return (
            <button
              key={signature.id}
              type="button"
              onClick={() => {
                setPalette(signature.palette);
                setWallpaper(signature.wallpaper);
                setPersonalization({
                  radius: signature.radius,
                  density: signature.density,
                  borders: signature.borders,
                });
              }}
              aria-pressed={active}
              className={cn(
                "overflow-hidden rounded-card border text-left transition-colors",
                active
                  ? "border-accent ring-2 ring-accent"
                  : "border-line hover:border-line-strong",
              )}
            >
              <span
                className="relative flex h-[58px] items-end gap-1 overflow-hidden p-2"
                style={{ background: tokens.bg }}
                aria-hidden
              >
                {signature.wallpaper && (
                  <span
                    className="absolute inset-0 opacity-80 blur-[6px]"
                    style={{
                      backgroundImage: `url(${wallUrl(signature.wallpaper)})`,
                      backgroundSize: "cover",
                    }}
                  />
                )}
                <span
                  className="relative h-7 flex-1 rounded-t-md"
                  style={{ background: tokens.surface }}
                />
                <span
                  className="relative h-4 w-4 rounded-full"
                  style={{ background: tokens.accent }}
                />
                <span
                  className="relative h-3 w-3 rounded-full"
                  style={{ background: tokens.ink }}
                />
              </span>
              <span className="block bg-surface px-2.5 py-2">
                <span className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                    {signature.label}
                  </span>
                  {active && (
                    <Check
                      size={14}
                      weight="bold"
                      className="shrink-0 text-accent"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-[16px] text-muted">
                  {signature.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function WallsGallery() {
  const settings = useAppStore((s) => s.settings);
  const setWallpaper = useAppStore((s) => s.setWallpaper);
  const setPalette = useAppStore((s) => s.setPalette);
  const setWallSettings = useAppStore((s) => s.setWallSettings);

  return (
    <>
      <h3 className="mb-1 mt-5 text-[12px] font-semibold uppercase tracking-wide text-muted">
        Galerie · {WALLS.length} fonds, {wallsBySeries().length} séries
      </h3>
      <p className="mb-2 text-[12.5px] leading-[18px] text-muted">
        Horizons, matières, saisons, villes, photographies, halos, dégradés. Une
        vignette applique <strong className="font-semibold text-ink">le fond</strong>{" "}
        et la palette qui le rend lisible : l’image reste visible, le texte reste
        AA. Le fond se <em>superpose</em> au socle — il ne le remplace pas.
      </p>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setWallpaper(null)}
          aria-pressed={settings.wallpaper === null}
          className={cn(
            "flex aspect-[16/10] flex-col items-center justify-center rounded-card border bg-surface text-[12.5px] font-medium",
            settings.wallpaper === null
              ? "border-accent ring-2 ring-accent"
              : "border-line hover:border-line-strong",
          )}
        >
          Aucun
          <span className="mt-0.5 text-[10.5px] font-normal text-muted">
            papier uni
          </span>
        </button>
      </div>

      {wallsBySeries().map((series) => (
        <div key={series.id} className="mt-4">
          <h4 className="text-[13px] font-semibold text-ink">
            {series.label}
            <span className="ml-1.5 text-[11.5px] font-normal text-muted">
              {series.walls.length}
            </span>
          </h4>
          <p className="mb-2 text-[11.5px] leading-[16px] text-muted">{series.hint}</p>
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {series.walls.map((wall) => {
              const active = settings.wallpaper === wall.id;
              return (
                <button
                  key={wall.id}
                  type="button"
                  onClick={() => {
                    setWallpaper(wall.id);
                    setPalette(wall.palette);
                    setWallSettings({
                      dim: veilBand(tokensFor(wall.palette), toRgb(wall.tone)).min,
                    });
                  }}
                  aria-pressed={active}
                  aria-label={`Fond ${wall.label} (${wall.mood})`}
                  className="group min-w-0 text-left"
                >
                  <span
                    className={cn(
                      "relative block aspect-[16/10] overflow-hidden rounded-card border bg-surface-2 transition",
                      active
                        ? "border-accent ring-2 ring-accent"
                        : "border-line group-hover:border-line-strong",
                    )}
                  >
                    <span
                      className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
                      style={{
                        backgroundImage: `url(${wallUrl(wall.id)})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                      aria-hidden
                    />
                    <span
                      className="absolute left-0 top-0 h-6 w-6 rounded-br-[inherit] bg-accent/90"
                      aria-hidden
                    />
                    {active && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent">
                        <Check size={12} weight="bold" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block truncate text-[12px] font-medium text-ink">
                    {wall.label}
                  </span>
                  <span className="block truncate text-[10.5px] text-muted">
                    {wall.mood}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function WallTuning() {
  const settings = useAppStore((s) => s.settings);
  const setWallSettings = useAppStore((s) => s.setWallSettings);
  const wall = WALLS.find((item) => item.id === settings.wallpaper);
  const wallTokens = tokensFor(settings.paletteKey);
  const band = wall ? veilBand(wallTokens, toRgb(wall.tone)) : null;
  const blur = effectiveBlur(settings.wallBlur);
  const veil = wall
    ? effectiveVeil(settings.wallDim, wallTokens, toRgb(wall.tone))
    : settings.wallDim;

  if (!wall || !band) return null;

  return (
    <div className="mt-4 rounded-card border border-line bg-surface-2/50 p-3.5">
      <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted">
        Réglage du fond
      </h4>
      <label className="mt-2 block text-[12.5px] font-medium text-ink">
        Flou du fond · {blur} px
        <input
          type="range"
          min={WALL_BLUR_MIN}
          max={WALL_BLUR_MAX}
          step={2}
          value={blur}
          onChange={(event) => setWallSettings({ blur: Number(event.target.value) })}
          className="mt-2 w-full"
          aria-label="Flou du fond"
        />
      </label>
      <label className="mt-3 block text-[12.5px] font-medium text-ink">
        Voile de lisibilité · {veil} %
        <input
          type="range"
          min={band.min}
          max={band.max}
          step={1}
          value={veil}
          onChange={(event) => setWallSettings({ dim: Number(event.target.value) })}
          className="mt-2 w-full"
          aria-label="Voile de lisibilité"
        />
      </label>
      <p className="mt-2 text-[11.5px] leading-[17px] text-muted">
        {band.tight || band.max - band.min < 8
          ? `Bande étroite sur ce couple : ${band.min} % est le minimum lisible, ${band.max} % le maximum où le fond reste visible. Changer de palette élargit la marge.`
          : `Réglable de ${band.min} % (lisibilité du texte) à ${band.max} % (le fond disparaît au-delà). L’accent se recale tout seul sur le verre.`}
      </p>
    </div>
  );
}

/* ================================================================== */
/* Couche 3 — accent                                                   */
/* ================================================================== */

function AccentPresets({ dark }: { dark: boolean }) {
  const settings = useAppStore((s) => s.settings);
  const setAccent = useAppStore((s) => s.setAccent);
  const setAccentMode = useAppStore((s) => s.setAccentMode);

  return (
    <>
      <h3 className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-wide text-muted">
        Accent imposé
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAccentMode("theme")}
          aria-pressed={settings.accentMode === "theme"}
          className={cn(
            "flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13.5px] font-semibold",
            settings.accentMode === "theme"
              ? "border-accent bg-accent-soft text-accent-ink"
              : "border-line bg-surface text-ink",
          )}
        >
          <span
            className="h-4 w-4 rounded-full"
            style={{ background: tokensFor(settings.paletteKey).accent }}
            aria-hidden
          />
          Celle du thème
        </button>
        {ACCENTS.map((accent) => {
          const active =
            settings.accentMode === "preset" && settings.accent === accent.key;
          const color = dark ? accent.dark : accent.light;
          return (
            <button
              key={accent.key}
              type="button"
              onClick={() => setAccent(accent.key)}
              aria-label={accent.label}
              aria-pressed={active}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: color,
                boxShadow: active
                  ? `0 0 0 2px var(--bg), 0 0 0 4px ${color}`
                  : undefined,
                color: dark ? "#141210" : "#FFFFFF",
              }}
            >
              {active && <Check size={17} weight="bold" />}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12.5px] leading-[18px] text-muted">
        Un accent choisi à la main est réaccordé au papier du thème, puis vérifié :
        la teinte peut être légèrement décalée pour rester lisible.
      </p>
    </>
  );
}

function CustomAccentSection({ dark }: { dark: boolean }) {
  const settings = useAppStore((s) => s.settings);
  const setCustomAccent = useAppStore((s) => s.setCustomAccent);
  const setAccentMode = useAppStore((s) => s.setAccentMode);
  const [draftHex, setDraftHex] = useState(settings.customAccent ?? "#0F766E");

  return (
    <CustomAccent
      dark={dark}
      value={draftHex}
      active={settings.accentMode === "custom"}
      onChange={(hex) => setDraftHex(hex)}
      onApply={(hex) => setCustomAccent(hex)}
      onReset={() => setAccentMode("theme")}
      resetLabel="Revenir à la couleur du thème"
    />
  );
}

/* ================================================================== */
/* Choix segmenté (registre de présentation)                           */
/* ================================================================== */

function ChoiceRow({
  control,
  value,
  onChange,
}: {
  control: ChoiceControl;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13.5px] font-medium">{control.label}</p>
        {control.hint && (
          <p className="truncate text-[11.5px] text-muted">{control.hint}</p>
        )}
      </div>
      <div className="mt-1.5 flex gap-1.5" role="group" aria-label={control.label}>
        {control.options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "flex-1 rounded-field border px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                active
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line bg-surface text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accent libre                                                        */
/* ------------------------------------------------------------------ */

function CustomAccent({
  value,
  dark,
  active,
  onChange,
  onApply,
  onReset,
  resetLabel,
}: {
  value: string;
  dark: boolean;
  active: boolean;
  onChange: (hex: string) => void;
  onApply: (hex: string) => void;
  onReset: () => void;
  resetLabel: string;
}) {
  const valid = isHex(value);
  const result = useMemo(
    () => (valid ? deriveAccent(value, dark ? "dark" : "light") : null),
    [value, valid, dark],
  );
  const normalized = valid ? toHex(parseHex(value)!) : null;
  const level = result ? contrastLevel(result.onBackground) : "insuffisant";

  return (
    <section className="mt-4 rounded-card border border-line bg-surface-2/50 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold">Couleur libre</h3>
          <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
            Palette dérivée et contrastes vérifiés automatiquement.
          </p>
        </div>
        {active && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent-ink">
            Appliquée
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label
          className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-field border border-line"
          style={{ background: valid ? value : "var(--surface-2)" }}
          title="Choisir une couleur"
        >
          <Eyedropper
            size={18}
            aria-hidden
            className="pointer-events-none mix-blend-luminosity"
            style={{ color: valid ? "#FFFFFF" : "var(--muted)" }}
          />
          <input
            type="color"
            value={normalized ?? "#0F766E"}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            aria-label="Couleur personnalisée"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        <input
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label="Code hexadécimal"
          spellCheck={false}
          placeholder="#0F766E"
          className={cn(
            "field h-11 min-w-0 flex-1 font-mono text-[14px] uppercase",
            !valid && "border-danger",
          )}
        />

        <button
          type="button"
          disabled={!valid}
          onClick={() => valid && onApply(value)}
          className="btn-primary h-11 shrink-0 px-4 text-[14px]"
        >
          Appliquer
        </button>
      </div>

      {!valid && (
        <p className="mt-2 text-[13px] font-medium text-danger">
          Code hexadécimal attendu, par exemple #0F766E.
        </p>
      )}

      {result && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 rounded-full border border-line"
              style={{ background: result.palette.accent }}
              aria-hidden
            />
            <span
              className="h-8 flex-1 rounded-field"
              style={{ background: result.palette.accentSoft }}
              aria-hidden
            />
            <span
              className="flex h-8 items-center rounded-field px-3 text-[13px] font-semibold"
              style={{
                background: result.palette.accent,
                color: result.palette.onAccent,
              }}
            >
              Aa
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] leading-[18px] text-muted">
            {result.level === "insuffisant" ? (
              <WarningCircle size={15} className="shrink-0 text-danger" aria-hidden />
            ) : (
              <Check size={15} weight="bold" className="shrink-0 text-accent" aria-hidden />
            )}
            Texte sur fond : {formatContrast(result.onBackground)} · {level}
            {result.adjusted && " · couleur ajustée pour rester lisible"}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-2 text-[13px] font-semibold text-muted underline-offset-2 hover:underline"
      >
        {resetLabel}
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Accent tiré du fond                                                */
/* ------------------------------------------------------------------ */

/**
 * Ce que l’image donne, en clair.
 *
 * Un réglage automatique qui ne s’explique pas est un réglage suspect : ici on
 * montre les **trois** couleurs lues, le texte choisi pour les boutons, et les
 * deux rapports de contraste mesurés. Si l’accent paraît « étrange », on voit
 * immédiatement d’où il vient.
 */
function WallAccentPanel() {
  const settings = useAppStore((s) => s.settings);
  const setDynamicAccent = useAppStore((s) => s.setDynamicAccent);
  const colors = useWallColors((s) => s.colors);
  const error = useWallColors((s) => s.error);
  const wall = settings.wallpaper ? wallById(settings.wallpaper) : undefined;
  const tokens = tokensFor(settings.paletteKey);
  const mode = effectiveMode(settings);

  if (!wall) {
    return (
      <p className="rounded-card border border-line bg-surface-2/50 px-3.5 py-3 text-[12.5px] leading-[18px] text-muted">
        Choisissez un fond : l’interface en tirera son accent, sa seconde couleur
        et la teinte de son voile.
      </p>
    );
  }

  const swatches = colors
    ? [
        { label: "Accent", value: colors.accent },
        { label: "Second ton", value: colors.secondary },
        { label: "Voile", value: veilTint(colors, mode) },
      ]
    : [
        { label: "Accent", value: tokens.accent },
        { label: "Second ton", value: tokens.accent },
        { label: "Voile", value: veilFromTone(wall.tone, mode) },
      ];

  return (
    <div className="rounded-card border border-line bg-surface-2/50 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-medium">Accent du fond</p>
          <p className="mt-0.5 text-[12px] leading-[17px] text-muted">
            Trois couleurs lues dans le fond (canvas 48 × 48), corrigées pour
            rester lisibles.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.dynamicAccent}
          aria-label="Accent tiré du fond"
          onClick={() => setDynamicAccent(!settings.dynamicAccent)}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
            settings.dynamicAccent
              ? "border-accent bg-accent"
              : "border-line bg-surface-2",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-all",
              settings.dynamicAccent ? "left-[26px]" : "left-0.5",
            )}
          />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {swatches.map((swatch) => (
          <div key={swatch.label} className="min-w-0">
            <span
              className="block h-11 w-full rounded-field border border-line"
              style={{ background: swatch.value }}
              aria-hidden
            />
            <span className="mt-1 block truncate text-[11px] font-medium text-muted">
              {swatch.label}
            </span>
            <span className="block font-mono text-[10.5px] text-muted">
              {swatch.value.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {colors ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px] text-muted">
          <dt>Accent sur le verre</dt>
          <dd className="text-right font-mono text-ink">
            {colors.contrast.toFixed(2)}:1 {colors.contrast >= 4.5 ? "✓" : "✗"}
          </dd>
          <dt>Texte des boutons</dt>
          <dd className="text-right font-mono text-ink">
            {colors.onAccent === "#FFFFFF" ? "blanc" : "noir"} ·{" "}
            {colors.onAccentContrast.toFixed(2)}:1
          </dd>
          <dt>Image couverte</dt>
          <dd className="text-right font-mono text-ink">
            {Math.round(colors.confidence * 100)} %
          </dd>
        </dl>
      ) : (
        <p className="mt-3 text-[11.5px] leading-[17px] text-muted">
          {error
            ? `Image illisible (${error}) : l’accent du thème reste en place.`
            : "Lecture de l’image en cours…"}
        </p>
      )}

      {!settings.dynamicAccent && (
        <p className="mt-2 text-[11.5px] leading-[17px] text-muted">
          L’accent du thème (ou celui que vous choisissez plus bas) reprend la
          main. Le voile garde la teinte du fond.
        </p>
      )}
    </div>
  );
}

/* Réexport utilitaire pour les tests d’écran */
export type { LayerId };
