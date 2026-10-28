import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CardsThree,
  CheckCircle,
  Cube,
  Image as ImageIcon,
  Info,
  Stack,
} from "@phosphor-icons/react";
import { AppBar, Screen } from "@/components/Layout";
import { CardFan } from "@/components/ui/card-fan-carousel";
import { ImageCard3D, TiltCard } from "@/components/ui/3d-card";
import { ZettelLeaf } from "@/components/zettel/ZettelLeaf";
import { useContentStore } from "@/stores/useContentStore";
import { useSurfacePrefs } from "@/stores/useDisplayStore";
import { useToast } from "@/stores/useToast";
import { cn } from "@/lib/utils";

/**
 * Studio des cartes — `/settings/cards`.
 *
 * Pourquoi un écran à part : une étagère qui change l’apparence de tout un
 * vault ne se choisit pas à l’aveugle dans un menu. Ici, le style est appliqué
 * à **vos vraies fiches**, et le bouton écrit le réglage. Aucun aperçu
 * factice : les cartes viennent du store, et « Utiliser » a un effet vérifiable
 * la prochaine fois que vous ouvrez un vault.
 *
 * Le bloc « carte image » est le seul explicitement marqué **démonstration** :
 * il montre le style importé (carte à fond plein) tel qu’il existerait si les
 * vaults avaient des couvertures. Ce n’est pas branché sur vos données, et le
 * dire vaut mieux que de laisser croire que la fonction existe.
 */

const WALLS = ["/walls/aube.svg", "/walls/lagune.svg", "/walls/braise.svg"];

export default function CardStudio() {
  const navigate = useNavigate();
  const showToast = useToast((s) => s.show);
  const zettel = useContentStore((s) => s.zettel);
  const vaults = useContentStore((s) => s.vaults);
  const { prefs: vaultPrefs, set: setVaultPrefs } = useSurfacePrefs("vault", {
    view: "stack",
  });

  const [wall, setWall] = useState(0);

  /* On montre le vault le plus fourni : c’est celui où le choix compte. */
  const { vault, cards } = useMemo(() => {
    const byVault = vaults
      .map((entry) => ({
        vault: entry,
        cards: zettel
          .filter((card) => card.vaultId === entry.id)
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
      }))
      .sort((a, b) => b.cards.length - a.cards.length);
    return byVault[0] ?? { vault: undefined, cards: [] };
  }, [vaults, zettel]);

  const sample = cards.slice(0, 7);
  const relief = cards.slice(0, 3);

  const apply = (view: "fan" | "relief", label: string) => {
    setVaultPrefs({ view });
    showToast(`${label} appliqué : ouvrez un vault pour le voir.`, "accent");
  };

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar back onBack={() => navigate("/settings")} title="Studio des cartes" />

      <p className="mt-1 max-w-[62ch] text-[13.5px] leading-[20px] text-muted">
        Les cartes de vault peuvent se présenter de cinq façons. Voici les deux
        nouvelles, appliquées à{" "}
        <strong className="text-ink">
          vos fiches réelles{vault ? ` du vault ${vault.name}` : ""}
        </strong>
        . Rien n’est décoratif : chaque bouton écrit le réglage du vault.
      </p>

      {cards.length === 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-card border border-line bg-surface p-3 text-[13px] leading-[19px] text-muted">
          <Info size={16} weight="duotone" className="mt-0.5 shrink-0" />
          Aucune fiche pour l’instant : créez-en une dans un vault, le studio
          utilisera vos propres cartes au lieu d’exemples.
        </p>
      )}

      {/* ------------------------------------------------ 1 · éventail */}
      <Block
        index={1}
        icon={CardsThree}
        title="Éventail 3D"
        hint="On choisit une fiche, on ne la lit pas encore. La carte du centre est lisible, les voisines annoncent — code et titre."
        action={
          <ApplyButton
            done={vaultPrefs.view === "fan"}
            label="Utiliser l’éventail dans mes vaults"
            onClick={() => apply("fan", "Éventail")}
          />
        }
      >
        {sample.length > 0 ? (
          <CardFan
            items={sample.map((card) => ({
              key: card.id,
              label: `${card.code} — ${card.title}`,
              render: (active) => (
                <ZettelLeaf card={card} active={active} refs={card.refs} />
              ),
            }))}
          />
        ) : (
          <Placeholder label="L’éventail a besoin de fiches pour s’ouvrir." />
        )}
      </Block>

      {/* ------------------------------------------------ 2 · relief */}
      <Block
        index={2}
        icon={Cube}
        title="Relief 3D"
        hint="Les cartes restent en grille mais s’inclinent sous le pointeur (bureau) ou pendant l’appui (téléphone). Sert à comparer trois fiches côte à côte."
        action={
          <ApplyButton
            done={vaultPrefs.view === "relief"}
            label="Utiliser le relief dans mes vaults"
            onClick={() => apply("relief", "Relief")}
          />
        }
      >
        {relief.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {relief.map((card) => (
              <TiltCard key={card.id} maxTilt={8} depth={14} className="h-[16rem]">
                <ZettelLeaf card={card} refs={card.refs} />
              </TiltCard>
            ))}
          </div>
        ) : (
          <Placeholder label="Le relief a besoin de fiches à incliner." />
        )}
      </Block>

      {/* ------------------------------------------------ 3 · carte image */}
      <Block
        index={3}
        icon={ImageIcon}
        title="Carte image"
        hint="Le style du composant importé : une fiche avec couverture. Les fonds sont ceux de l’application (aucune requête vers un tiers)."
        badge="Démonstration — non branchée sur vos fiches"
      >
        <div className="flex flex-wrap items-start gap-4">
          <ImageCard3D
            key={wall}
            title={sample[0]?.title ?? "Une idée, une fiche"}
            subtitle={sample[0]?.code ? `Fiche ${sample[0].code}` : "Vault de démonstration"}
            imageUrl={WALLS[wall]}
            actionText="Changer de fond"
            onActionClick={() => setWall((current) => (current + 1) % WALLS.length)}
          />
          <div className="min-w-[15rem] flex-1">
            <p className="text-[12.5px] leading-[19px] text-muted">
              Trois fonds disponibles dans cette démonstration. Le bouton change
              de fond plutôt que de promettre une action qui n’existe pas.
            </p>
            <p className="mt-2 text-[12.5px] leading-[19px] text-muted">
              Pour l’activer réellement, il faudrait un champ « couverture » sur
              la fiche, une étape d’envoi d’image, et un quota de stockage — donc
              un chantier, pas un réglage. C’est écrit ici pour ne pas le
              maquiller.
            </p>
          </div>
        </div>
      </Block>

      {/* ------------------------------------------------ 4 · révision */}
      <Block
        index={4}
        icon={Stack}
        title="Carte de révision"
        hint="Même inclinaison, appliquée à la carte qu’on retourne. Le retournement reste réel (deux faces, rotation 180°)."
        action={
          <button
            type="button"
            onClick={() => navigate("/review/session?mode=all")}
            className="btn btn-primary h-10 px-3.5 text-[13.5px]"
          >
            Ouvrir une révision <ArrowRight size={15} weight="bold" className="ml-1.5 inline" />
          </button>
        }
      >
        <div className="max-w-[22rem]">
          <TiltCard maxTilt={6} depth={14}>
            <div className="flex h-[15rem] flex-col justify-between rounded-sheet border border-line bg-surface p-5 shadow-lift">
              <span className="w-fit rounded-rect bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent-ink">
                Question
              </span>
              <p className="font-serif text-[21px] font-semibold leading-[28px]">
                {cards[1]?.title ?? "Que retenez-vous de cette fiche ?"}
              </p>
              <p className="text-[12px] text-muted">Inclinez : approchez le pointeur</p>
            </div>
          </TiltCard>
        </div>
      </Block>

      <p className="mt-5 flex items-start gap-2 text-[12px] leading-[18px] text-muted">
        <Info size={15} weight="duotone" className="mt-0.5 shrink-0" />
        Tous ces effets sont coupés si le mouvement est réduit dans les réglages
        (Accessibilité → mouvement) ou par la préférence système.
      </p>

      <div className="h-16" />
    </Screen>
  );
}

function Block({
  index,
  icon: Icon,
  title,
  hint,
  badge,
  action,
  children,
}: {
  index: number;
  icon: React.ComponentType<{ size?: number; weight?: "duotone" | "regular"; className?: string }>;
  title: string;
  hint: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-big border border-line bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <span className="tile flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-surface-2 text-accent">
          <Icon size={18} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-[18px] font-semibold">
              <span className="tabnum mr-1.5 text-[13px] font-bold text-muted">{index}</span>
              {title}
            </h2>
            {badge && (
              <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 max-w-[70ch] text-[12.5px] leading-[18px] text-muted">
            {hint}
          </p>
        </div>
      </div>

      <div className="mt-3">{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </section>
  );
}

function ApplyButton({
  label,
  onClick,
  done,
}: {
  label: string;
  onClick: () => void;
  done: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-field border px-3.5 text-[13.5px] font-medium transition-colors",
        done
          ? "border-accent bg-accent-soft text-accent-ink"
          : "border-line bg-bg hover:border-line-strong",
      )}
    >
      {done ? <CheckCircle size={16} weight="fill" /> : <ArrowRight size={15} weight="bold" />}
      {label}
    </button>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-[12rem] items-center justify-center rounded-card border border-dashed border-line-strong px-6 text-center text-[13px] text-muted">
      {label}
    </div>
  );
}
