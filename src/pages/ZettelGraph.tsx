import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppBar, EmptyState, Screen, Segmented } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { Graph } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ZettelCard } from "@/types";

const CARD_W = 160;
const CARD_H = 64;

const DEPTH_OPTIONS: { value: "direct" | "two"; label: string }[] = [
  { value: "direct", label: "Voisines directes" },
  { value: "two", label: "Étendre à 2 niveaux" },
];

interface Positioned {
  card: ZettelCard;
  x: number;
  y: number;
  level: number;
}

export default function ZettelGraph() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const vault = useContentStore((s) => s.vaults.find((v) => v.id === id));
  const allCards = useContentStore((s) => s.zettel);

  const cards = useMemo(
    () =>
      allCards
        .filter((c) => c.vaultId === id)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [allCards, id],
  );

  const [depth, setDepth] = useState<"direct" | "two">("direct");
  const [openCode, setOpenCode] = useState(cards[0]?.code ?? "");

  const openCard = cards.find((c) => c.code === openCode) ?? cards[0];

  const graph = useMemo(() => {
    if (!openCard) return { nodes: [] as Positioned[], edges: [] as { x1: number; y1: number; x2: number; y2: number }[] };
    const byCode = (code: string) => cards.find((c) => c.code === code);

    const neighbourCodes = Array.from(
      new Set([
        ...openCard.refs,
        ...cards.filter((c) => c.refs.includes(openCard.code)).map((c) => c.code),
      ]),
    )
      .filter((code) => byCode(code))
      .slice(0, depth === "direct" ? 2 : 2);

    const nodes: Positioned[] = [
      { card: openCard, x: (380 - CARD_W) / 2, y: 80, level: 0 },
    ];
    const slots = [12, 380 - CARD_W - 12];
    neighbourCodes.forEach((code, index) => {
      const card = byCode(code);
      if (!card) return;
      nodes.push({ card, x: slots[index] ?? 12, y: 250, level: 1 });
    });

    if (depth === "two") {
      const first = nodes.find((n) => n.level === 1);
      if (first) {
        const secondCode = first.card.refs.find(
          (code) => !nodes.some((n) => n.card.code === code),
        );
        const second = secondCode ? byCode(secondCode) : undefined;
        if (second) {
          nodes.push({ card: second, x: 12, y: 420, level: 2 });
        } else {
          const extra = cards.find(
            (c) =>
              c.code !== openCard.code &&
              !nodes.some((n) => n.card.code === c.code) &&
              c.refs.includes(first.card.code),
          );
          if (extra) nodes.push({ card: extra, x: 12, y: 420, level: 2 });
        }
      }
    }

    return { nodes, edges: [] as { x1: number; y1: number; x2: number; y2: number }[] };
  }, [openCard, cards, depth]);

  const children = graph.nodes.filter((n) => n.level === 1);
  const grands = graph.nodes.filter((n) => n.level === 2);

  if (!vault || cards.length === 0) {
    return (
      <Screen className="px-5">
        <AppBar back title="" />
        <EmptyState
          icon={Graph}
          title="Pas encore de réseau"
          description="Les cartes d’un coffre apparaissent ici dès qu’elles sont reliées par « Voir… »."
        />
      </Screen>
    );
  }

  return (
    <div className="paper screen" data-canvas="dots">
      <div className="sticky top-0 z-20 glass">
        <AppBar back onBack={() => navigate(`/vault/${id}`)} title={`Graph · ${vault.name}`} />
      </div>

      <div className="px-5 pt-3">
        <Segmented
          value={depth}
          onChange={(value) => setDepth(value === "two" ? "two" : "direct")}
          label="Profondeur du graphe"
          options={DEPTH_OPTIONS}
        />
        <p className="mt-2 text-[13px] leading-[19px] text-muted">
          Seules les cartes reliées à la carte ouverte apparaissent. Le graphe
          global reste volontairement hors de portée.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <div className="relative mx-auto mt-4 w-[380px] max-w-full">
          <svg
            width="380"
            height={depth === "two" ? 520 : 350}
            className="absolute inset-x-0 top-0"
            aria-hidden="true"
          >
            <g
              fill="none"
              stroke="var(--muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {children.map((child) => {
                const rootCenter = (380 - CARD_W) / 2 + CARD_W / 2;
                const childCenter = child.x + CARD_W / 2;
                const midY = 205;
                return (
                  <g key={`e-${child.card.id}`}>
                    <path
                      d={`M${rootCenter} ${80 + CARD_H} V${midY} H${childCenter} V${child.y}`}
                    />
                  </g>
                );
              })}
              {grands.map((grand) => {
                const parent = children.find((c) =>
                  c.card.refs.includes(grand.card.code),
                );
                if (!parent) return null;
                const parentCenter = parent.x + CARD_W / 2;
                const grandCenter = grand.x + CARD_W / 2;
                const midY = 372;
                return (
                  <path
                    key={`e-${grand.card.id}`}
                    d={`M${parentCenter} ${parent.y + CARD_H} V${midY} H${grandCenter} V${grand.y}`}
                  />
                );
              })}
            </g>
          </svg>

          <div style={{ height: depth === "two" ? 520 : 350 }} className="relative">
            {graph.nodes.map(({ card, x, y, level }) => (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  level === 0
                    ? navigate(`/vault/${id}?card=${encodeURIComponent(card.code)}`)
                    : setOpenCode(card.code)
                }
                style={{
                  left: x,
                  top: y,
                  width: CARD_W,
                  height: CARD_H,
                }}
                className={cn(
                  "absolute flex flex-col justify-center rounded-field border-[1.5px] bg-surface px-3 py-2 text-left",
                  level === 0
                    ? "border-[2.5px] border-accent bg-accent-soft"
                    : "border-line-strong",
                )}
              >
                <span className="text-[13px] font-semibold leading-none text-accent">
                  {card.code}
                  {level === 0 ? " · carte ouverte" : ""}
                </span>
                <span className="mt-1 line-clamp-2 font-serif text-[15px] font-semibold leading-[18px]">
                  {card.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dock pointer-events-none fixed inset-x-0 bottom-[calc(20px+var(--safe-bottom))] z-20 mx-auto flex gap-2.5 px-5">
        <button
          type="button"
          className="btn-secondary pointer-events-auto h-14 flex-1 rounded-big"
          onClick={() => {
            setOpenCode(cards[0]?.code ?? "");
            setDepth("direct");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Recentrer
        </button>
        <button
          type="button"
          className="btn-primary pointer-events-auto h-14 flex-[2] rounded-big text-[16px]"
          onClick={() => navigate(`/vault/${id}?card=${encodeURIComponent(openCard?.code ?? "")}`)}
        >
          Ouvrir la carte
        </button>
      </div>
    </div>
  );
}
