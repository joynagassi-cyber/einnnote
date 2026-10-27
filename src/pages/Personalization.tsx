import { useNavigate } from "react-router-dom";
import { ArrowCounterClockwise, Check } from "@phosphor-icons/react";
import { AppBar, Screen, Segmented } from "@/components/Layout";
import { DEFAULT_PERSONALIZATION, useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import type {
  BorderStyle,
  Density,
  ElevationStyle,
  PaperTint,
  RadiusStyle,
} from "@/types";

/**
 * Personnalisation avancée.
 *
 * Chaque contrôle écrit une valeur réelle : les attributs `data-*` de
 * `applySettingsToDom` basculent des blocs CSS entiers, les curseurs posent
 * des variables continues. Aucun curseur n’est décoratif.
 */

const DENSITY: { value: Density; label: string }[] = [
  { value: "compact", label: "Compacte" },
  { value: "regular", label: "Standard" },
  { value: "airy", label: "Aérée" },
];

const RADIUS: { value: RadiusStyle; label: string }[] = [
  { value: "sharp", label: "Net" },
  { value: "regular", label: "Doux" },
  { value: "soft", label: "Très rond" },
];

const BORDERS: { value: BorderStyle; label: string }[] = [
  { value: "subtle", label: "Discrètes" },
  { value: "regular", label: "Normales" },
  { value: "strong", label: "Marquées" },
];

const ELEVATION: { value: ElevationStyle; label: string }[] = [
  { value: "flat", label: "Plates" },
  { value: "regular", label: "Standard" },
  { value: "raised", label: "Surélevées" },
];

const PAPERS: { value: PaperTint; label: string; swatch: string }[] = [
  { value: "sand", label: "Sable", swatch: "#F6F1E7" },
  { value: "ivory", label: "Ivoire", swatch: "#FBF8F0" },
  { value: "grey", label: "Gris", swatch: "#F2F2F0" },
  { value: "mist", label: "Brume", swatch: "#EFF2F1" },
];

export default function Personalization() {
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const setPersonalization = useAppStore((s) => s.setPersonalization);
  const resetPersonalization = useAppStore((s) => s.resetPersonalization);
  const ui = settings.personalization ?? DEFAULT_PERSONALIZATION;

  const dirty =
    JSON.stringify(ui) !== JSON.stringify(DEFAULT_PERSONALIZATION);

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar
        back
        onBack={() => navigate("/settings/appearance")}
        title="Personnalisation"
        center={false}
        action={
          <button
            type="button"
            onClick={resetPersonalization}
            disabled={!dirty}
            className="flex h-9 items-center gap-1.5 rounded-field px-2.5 text-[13.5px] font-semibold text-accent disabled:opacity-40"
          >
            <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
            Réinitialiser
          </button>
        }
      />

      <p className="mt-1 text-[13px] leading-[19px] text-muted">
        Chaque réglage agit immédiatement sur toute l’application. L’aperçu
        ci-dessous est un vrai composant, pas une image.
      </p>

      {/* ---------- Aperçu ---------- */}
      <div
        className="paper mt-4 rounded-card border border-line bg-surface p-4"
        data-canvas={settings.canvas}
      >
        <div className="note-column">
          <div className="flex items-center gap-2">
            <span className="badge text-[12px]">Cornell</span>
            <span className="text-[12.5px] text-muted">il y a 2 h</span>
          </div>
          <h3 className="mt-2 font-serif text-[18px] font-semibold leading-snug">
            Conditions de validité
          </h3>
          <p className="note-text mt-1.5 text-ink">
            Consentement exempt de vices, capacité de contracter, contenu licite
            et certain.
          </p>
          <div className="mt-3 flex gap-2">
            <span className="inline-flex h-9 items-center rounded-field bg-accent px-3 text-[13.5px] font-semibold text-on-accent">
              Réviser
            </span>
            <span className="inline-flex h-9 items-center rounded-field border border-line px-3 text-[13.5px] font-semibold">
              Modifier
            </span>
          </div>
        </div>
      </div>

      {/* ---------- Formes ---------- */}
      <Section title="Densité" hint="Espacement des marges et des cartes">
        <Segmented
          value={ui.density}
          onChange={(density) => setPersonalization({ density })}
          label="Densité"
          options={DENSITY}
        />
      </Section>

      <Section title="Rayons" hint="Arrondi des champs, cartes et boutons">
        <Segmented
          value={ui.radius}
          onChange={(radius) => setPersonalization({ radius })}
          label="Rayons"
          options={RADIUS}
        />
      </Section>

      <Section title="Bordures" hint="Contraste des traits de séparation">
        <Segmented
          value={ui.borders}
          onChange={(borders) => setPersonalization({ borders })}
          label="Bordures"
          options={BORDERS}
        />
      </Section>

      <Section title="Relief" hint="Ombre portée des cartes et des boutons">
        <Segmented
          value={ui.elevation}
          onChange={(elevation) => setPersonalization({ elevation })}
          label="Relief"
          options={ELEVATION}
        />
      </Section>

      {/* ---------- Papier ---------- */}
      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Teinte du papier
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {PAPERS.map((paper) => {
          const active = ui.paper === paper.value;
          return (
            <button
              key={paper.value}
              type="button"
              onClick={() => setPersonalization({ paper: paper.value })}
              aria-pressed={active}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "flex h-14 w-full items-center justify-center rounded-field border",
                  active ? "border-2 border-accent" : "border-line",
                )}
                style={{ background: paper.swatch }}
              >
                {active && (
                  <Check size={18} weight="bold" className="text-accent" aria-hidden />
                )}
              </span>
              <span
                className={cn(
                  "text-[13px]",
                  active ? "font-semibold text-ink" : "text-muted",
                )}
              >
                {paper.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------- Curseurs ---------- */}
      <Slider
        id="note-leading"
        label="Interligne des notes"
        value={ui.noteLeading}
        min={20}
        max={38}
        step={1}
        suffix=" px"
        onChange={(noteLeading) => setPersonalization({ noteLeading })}
      />

      <Slider
        id="reading-width"
        label="Largeur de lecture"
        hint="En bureau : longueur de ligne des notes"
        value={ui.readingWidth}
        min={520}
        max={980}
        step={20}
        suffix=" px"
        onChange={(readingWidth) => setPersonalization({ readingWidth })}
      />

      <Slider
        id="canvas-strength"
        label="Force du canevas"
        hint="Opacité du pointillé, des lignes ou du quadrillage"
        value={ui.canvasStrength}
        min={0}
        max={100}
        step={5}
        suffix=" %"
        onChange={(canvasStrength) => setPersonalization({ canvasStrength })}
      />

      <p className="mt-5 rounded-card bg-surface-2 p-3.5 text-[13px] leading-[19px] text-muted">
        Ces réglages sont enregistrés avec vos préférences, pas avec vos notes :
        restaurer une sauvegarde de contenu ne les écrase pas.
      </p>

      <div className="h-10" aria-hidden="true" />
    </Screen>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-[14px] font-semibold text-muted">{title}</h2>
      <p className="mb-2 mt-0.5 text-[12.5px] leading-[18px] text-muted">{hint}</p>
      {children}
    </section>
  );
}

function Slider({
  id,
  label,
  hint,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-medium">
          {label}
        </label>
        <span className="text-[15px] font-semibold tabular-nums text-accent">
          {value}
          {suffix}
        </span>
      </div>
      {hint && (
        <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">{hint}</p>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}
