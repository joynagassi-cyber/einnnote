import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
import type { AccentKey, CanvasBg, ThemeMode } from "@/types";
import { SIGNATURES, WALLS, wallUrl } from "@/lib/walls";
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

export default function Appearance() {
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const setTheme = useAppStore((s) => s.setTheme);
  const setAccent = useAppStore((s) => s.setAccent);
  const setCustomAccent = useAppStore((s) => s.setCustomAccent);
  const setCanvas = useAppStore((s) => s.setCanvas);
  const setFont = useAppStore((s) => s.setFont);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setContrast = useAppStore((s) => s.setContrast);
  const setMotion = useAppStore((s) => s.setMotion);
  const setTransparency = useAppStore((s) => s.setTransparency);

  const setPalette = useAppStore((s) => s.setPalette);
  const setWallpaper = useAppStore((s) => s.setWallpaper);
  const setWallSettings = useAppStore((s) => s.setWallSettings);
  const setPersonalization = useAppStore((s) => s.setPersonalization);
  const setAccentMode = useAppStore((s) => s.setAccentMode);
  const [draftHex, setDraftHex] = useState(settings.customAccent ?? "#0F766E");
  /* La bande de voile est calculée sur le couple (thème, fond) : en dessous on
     perd le texte, au-dessus le fond disparaît. Les curseurs s’y accrochent,
     donc ils ne peuvent pas produire un réglage illisible ou décoratif. */
  const wall = WALLS.find((item) => item.id === settings.wallpaper);
  const wallTokens = tokensFor(settings.paletteKey);
  const band = wall ? veilBand(wallTokens, toRgb(wall.tone)) : null;
  const blur = effectiveBlur(settings.wallBlur);
  const veil = wall ? effectiveVeil(settings.wallDim, wallTokens, toRgb(wall.tone)) : settings.wallDim;
  const dark = effectiveMode(settings) === "dark";
  const currentPalette = paletteByKey(settings.paletteKey);
  const fixedMode = currentPalette.key !== "papier";

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar back onBack={() => navigate("/settings")} title="Apparence" center={false} />

      <p className="mb-1 mt-1 text-[13px] leading-[19px] text-muted">
        Le changement est immédiat, sans redémarrage.
      </p>

      <h2 className="mb-2 mt-4 text-[14px] font-semibold text-muted">Mode</h2>
      <Segmented
        value={settings.theme}
        onChange={(mode) => {
          // Un thème n’existe qu’en clair ou qu’en sombre : le mode global est
          // ignoré tant qu’il est actif. On le dit, on ne le cache pas.
          setTheme(mode);
        }}
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

      <h2 className="mb-1 mt-6 text-[14px] font-semibold text-muted">
        Thèmes · {PALETTES.length} palettes vérifiées
      </h2>
      <p className="mb-3 text-[12.5px] leading-[18px] text-muted">
        Couleurs officielles des auteurs (Catppuccin, Nord, Gruvbox, Solarized,
        Rosé Pine, Tokyo Night, Everforest, Material 3, Radix). Chaque paire
        texte/fond est mesurée : sous AA, la teinte est corrigée du minimum
        nécessaire.
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

      {/* ---------------------------------------------------------- */}
      {/* Signatures : un goût complet en un geste                     */}
      {/* ---------------------------------------------------------- */}
      <h2 className="mb-1 mt-6 text-[14px] font-semibold text-muted">
        Signatures
      </h2>
      <p className="mb-3 text-[12.5px] leading-[18px] text-muted">
        Un choix qui règle couleur, arrondi, densité et fond d’un seul coup.
        Tout reste modifiable ensuite, réglage par réglage.
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
                    <Check size={14} weight="bold" className="shrink-0 text-accent" aria-hidden />
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

      {/* ---------------------------------------------------------- */}
      {/* Fonds « verre »                                             */}
      {/* ---------------------------------------------------------- */}
      <h2 className="mb-1 mt-6 text-[14px] font-semibold text-muted">
        Fonds · {WALLS.length} verres
      </h2>
      <p className="mb-3 text-[12.5px] leading-[18px] text-muted">
        Une image floutée derrière l’interface, avec des surfaces translucides.
        Le voile est réglable : il garantit que le texte reste lisible quel que
        soit le fond.
      </p>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setWallpaper(null)}
          aria-pressed={settings.wallpaper === null}
          className={cn(
            "flex h-[74px] flex-col items-center justify-center rounded-card border bg-surface text-[12px] font-medium",
            settings.wallpaper === null
              ? "border-accent ring-2 ring-accent"
              : "border-line hover:border-line-strong",
          )}
        >
          Aucun
          <span className="mt-0.5 text-[10.5px] font-normal text-muted">papier uni</span>
        </button>
        {WALLS.map((wall) => {
          const active = settings.wallpaper === wall.id;
          return (
            <button
              key={wall.id}
              type="button"
              onClick={() => setWallpaper(wall.id)}
              aria-pressed={active}
              aria-label={`Fond ${wall.label} (${wall.mood})`}
              className={cn(
                "group relative h-[74px] overflow-hidden rounded-card border text-left",
                active ? "border-accent ring-2 ring-accent" : "border-line",
              )}
            >
              <span
                className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                style={{
                  backgroundImage: `url(${wallUrl(wall.id)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                aria-hidden
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                <span className="block truncate text-[12px] font-semibold text-white">
                  {wall.label}
                </span>
                <span className="block truncate text-[10px] text-white/75">
                  {wall.mood}
                </span>
              </span>
              {active && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent">
                  <Check size={12} weight="bold" aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {wall && band && (
        <div className="mt-3 rounded-card border border-line bg-surface p-3.5">
          <label className="block text-[12px] font-semibold uppercase tracking-wide text-muted">
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
          <label className="mt-3 block text-[12px] font-semibold uppercase tracking-wide text-muted">
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
      )}

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Couleur d’action
      </h2>
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
        Un accent choisi à la main est réaccordé au papier du thème, puis
        vérifié : la teinte peut être légèrement décalée pour rester lisible.
      </p>

      <CustomAccent
        dark={dark}
        value={draftHex}
        active={settings.accentMode === "custom"}
        onChange={(hex) => setDraftHex(hex)}
        onApply={(hex) => setCustomAccent(hex)}
        onReset={() => setAccentMode("theme")}
        resetLabel="Revenir à la couleur du thème"
      />

      <button
        type="button"
        onClick={() => navigate("/settings/personalization")}
        className="mt-5 flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3.5 text-left transition-colors active:bg-surface-2"
      >
        <span className="tile" aria-hidden="true">
          <SlidersHorizontal size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">
            Personnalisation avancée
          </span>
          <span className="mt-0.5 block text-[13px] leading-[18px] text-muted">
            Densité, rayons, bordures, relief, papier, interligne, largeur de
            lecture
          </span>
        </span>
        <CaretRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
      </button>

      <h2 className="mb-3 mt-6 text-[14px] font-semibold text-muted">
        Fond du canevas
      </h2>
      <div className="flex items-start justify-between">
        {CANVASES.map((canvas) => {
          const active = settings.canvas === canvas.key;
          return (
            <button
              key={canvas.key}
              type="button"
              onClick={() => setCanvas(canvas.key)}
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

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">Aperçu</h2>
      <div
        className="paper rounded-card border border-line bg-surface p-4 font-serif text-[17px] leading-[28px]"
        data-canvas={settings.canvas}
      >
        Conditions de validité :
        <br />
        <span className="rounded-[3px] mark-highlight px-1 [border-bottom:2px_solid_var(--accent)]">
          consentement, capacité, contenu licite
        </span>
      </div>

      <div className="mt-5 flex items-baseline justify-between">
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
        onChange={(event) => setFontSize(Number(event.target.value))}
        className="mt-2 w-full"
      />

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">Police des notes</h2>
      <Segmented
        value={settings.font}
        onChange={setFont}
        label="Police des notes"
        options={FONT_OPTIONS}
      />

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Accessibilité
      </h2>
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <div>
          <div className="mb-1.5 text-[14px]">Contraste élevé</div>
          <Segmented
            value={settings.contrast}
            onChange={setContrast}
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
            onChange={setMotion}
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
            onChange={setTransparency}
            label="Réduire la transparence"
            options={[
              { value: "system" as const, label: "Système" },
              { value: "reduced" as const, label: "Réduit" },
            ]}
          />
        </div>
      </div>

      <div className="h-10" aria-hidden="true" />
    </Screen>
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
    <section className="mt-4 rounded-card border border-line bg-surface p-3.5">
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
