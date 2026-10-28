import { useNavigate } from "react-router-dom";
import { ArrowCounterClockwise, Check, Info } from "@phosphor-icons/react";
import { AppBar, Screen } from "@/components/Layout";
import { DEFAULT_PERSONALIZATION, useAppStore } from "@/stores/useAppStore";
import {
  PRESENTATION,
  controlById,
  formatValue,
  type ChoiceControl,
  type SliderControl,
} from "@/lib/presentation";
import type { Personalization as Presentation } from "@/types";
import { cn } from "@/lib/utils";

/**
 * **Présentation** — l’écran de réglage de l’apparence.
 *
 * Réécrit sur trois principes :
 *
 * 1. **Aucune liste écrite deux fois.** Les sections, les libellés, les bornes
 *    des curseurs et les valeurs possibles viennent de `PRESENTATION`
 *    (`src/lib/presentation.ts`). Ajouter un réglage se fait là-bas, pas ici.
 * 2. **Chaque contrôle agit, et le dit.** Un aperçu vivant reprend le rendu
 *    réel (carte, texte, boutons) ; sous chaque curseur, la valeur exacte est
 *    écrite — on sait ce qu’on a réglé.
 * 3. **Rien qui ne serve.** Les réglages « de style » sans effet ont été
 *    supprimés avec la duplication des teintes de papier : ce qui reste est
 *    calculé en JavaScript et visible immédiatement.
 *
 * L’ordre des sections est celui du confort de lecture : la forme, le papier,
 * puis la mesure (interligne, largeur de ligne).
 */
export default function Personalization() {
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const setPersonalization = useAppStore((s) => s.setPersonalization);
  const resetPersonalization = useAppStore((s) => s.resetPersonalization);
  const ui = settings.personalization ?? DEFAULT_PERSONALIZATION;

  const dirty = JSON.stringify(ui) !== JSON.stringify(DEFAULT_PERSONALIZATION);

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar
        back
        onBack={() => navigate("/settings/appearance")}
        title="Présentation"
        center={false}
        action={
          <button
            type="button"
            onClick={resetPersonalization}
            disabled={!dirty}
            aria-label="Réinitialiser la présentation"
            className="flex h-9 items-center gap-1.5 rounded-field px-2.5 text-[13.5px] font-semibold text-accent disabled:opacity-40"
          >
            <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
            {dirty ? "Rétablir" : "Par défaut"}
          </button>
        }
      />

      <p className="mt-1 max-w-[62ch] text-[13.5px] leading-[20px] text-muted">
        Ces réglages agissent sur toute l’application et s’enregistrent avec vos
        préférences — pas avec vos notes.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* ------------------------------------------------ les contrôles */}
        <div className="order-2 lg:order-1">
          {PRESENTATION.map((section) => (
            <section key={section.id} className="mt-5 first:mt-0">
              <h2 className="font-serif text-[18px] font-semibold">{section.title}</h2>
              <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">{section.hint}</p>

              <div className="mt-2.5 flex flex-col gap-4">
                {section.controls.map((control) =>
                  control.kind === "choice" ? (
                    <ChoiceRow
                      key={control.id}
                      control={control}
                      value={String(ui[control.id])}
                      onChange={(value) =>
                        setPersonalization({ [control.id]: value } as Partial<Presentation>)
                      }
                    />
                  ) : (
                    <SliderRow
                      key={control.id}
                      control={control}
                      value={ui[control.id] as number}
                      onChange={(value) =>
                        setPersonalization({ [control.id]: value } as Partial<Presentation>)
                      }
                    />
                  ),
                )}
              </div>
            </section>
          ))}
        </div>

        {/* ------------------------------------------------ l'aperçu */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-4">
          <div className="rounded-big border border-line bg-surface p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Aperçu vivant
            </p>
            <div className="paper rounded-card border border-line bg-surface p-3.5" data-canvas={settings.canvas}>
              <div className="flex items-center gap-2">
                <span className="badge text-[11.5px]">Cornell</span>
                <span className="text-[12px] text-muted">il y a 2 h</span>
              </div>
              <h3 className="mt-2 font-serif text-[17px] font-semibold leading-snug">
                Conditions de validité
              </h3>
              <p className="note-text mt-1.5 text-ink">
                Consentement exempt de vices, capacité de contracter, contenu
                licite et certain.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex h-9 items-center rounded-field bg-accent px-3 text-[13px] font-semibold text-on-accent">
                  Réviser
                </span>
                <span className="inline-flex h-9 items-center rounded-field border border-line px-3 text-[13px] font-semibold">
                  Modifier
                </span>
              </div>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-[16px] text-muted">
              <Info size={13} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
              L’aperçu est un vrai composant de l’application, pas une image : il
              subit exactement les mêmes règles.
            </p>
          </div>

        </aside>
      </div>

      <p className="mt-5 rounded-card bg-surface-2 p-3.5 text-[12.5px] leading-[18px] text-muted">
        Les formes viennent de la palette (thème) ; la teinte du papier la
        déplace, elle ne la remplace pas. Changer de thème ne perd donc jamais
        vos réglages de présentation.
      </p>

      <div className="h-24" />
    </Screen>
  );
}

/** Une ligne de choix : segments pour deux ou trois options, pastilles au-delà. */
function ChoiceRow({
  control,
  value,
  onChange,
}: {
  control: ChoiceControl;
  value: string;
  onChange: (value: string) => void;
}) {
  const swatches = control.options.every((option) => option.swatch);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14.5px] font-medium">{control.label}</p>
        <p className="text-[12.5px] text-muted">{formatValue(control, value)}</p>
      </div>
      {control.hint && (
        <p className="mt-0.5 text-[12px] leading-[17px] text-muted">{control.hint}</p>
      )}

      <div
        role="group"
        aria-label={control.label}
        className={cn("mt-2 grid gap-1.5", swatches ? "grid-cols-4" : "grid-cols-3")}
      >
        {control.options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-field border px-2 py-2 text-[12.5px] transition-colors",
                active
                  ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                  : "border-line bg-bg text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {option.swatch ? (
                <>
                  <span
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-[4px] border",
                      active ? "border-accent" : "border-line",
                    )}
                    style={{ background: option.swatch }}
                    aria-hidden
                  >
                    {active && <Check size={15} weight="bold" className="text-accent" />}
                  </span>
                  <span className="w-full truncate text-center">{option.label}</span>
                </>
              ) : (
                <span className="w-full truncate text-center">{option.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Une ligne de curseur : la valeur est écrite, pas devinée. */
function SliderRow({
  control,
  value,
  onChange,
}: {
  control: SliderControl;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={control.id} className="text-[14.5px] font-medium">
          {control.label}
        </label>
        <span className="text-[13px] font-semibold tabular-nums text-accent">
          {formatValue(control, value)}
        </span>
      </div>
      {control.hint && (
        <p className="mt-0.5 text-[12px] leading-[17px] text-muted">{control.hint}</p>
      )}
      <input
        id={control.id}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}

/* Le registre est la seule liste : cet import n’existe que pour que le
   compilateur signale un identifiant de contrôle inconnu. */
void controlById;
