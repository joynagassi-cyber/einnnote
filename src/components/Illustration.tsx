import type { LessonStep } from "@/types";

/**
 * Illustrations géométriques simples, dessinées dans le même trait que les
 * icônes Phosphor. Aucune image générée par IA (règle du design system).
 */
export function Illustration({ kind }: { kind: LessonStep["illustration"] }) {
  const accent = "var(--accent)";
  const highlight = "var(--highlight)";

  return (
    <div className="flex h-[190px] items-center justify-center rounded-sheet bg-accent-soft">
      <svg
        width="150"
        height="130"
        viewBox="0 0 150 130"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        role="presentation"
      >
        {kind === "book" && (
          <>
            <rect x="20" y="14" width="110" height="102" rx="14" fill={accent} fillOpacity=".18" />
            <path d="M40 44h70M40 64h52M40 84h60" />
            <rect x="36" y="56" width="78" height="18" rx="5" fill={highlight} stroke="none" fillOpacity=".9" />
            <path d="M40 64h70" />
            <circle cx="124" cy="36" r="16" fill={accent} stroke="none" />
            <path d="M118 31a6 6 0 1 1 8 5.6c-1.4.7-2 1.5-2 3M124 45h.01" stroke="#fff" strokeWidth="3" />
          </>
        )}

        {kind === "question" && (
          <>
            <rect x="24" y="18" width="102" height="94" rx="14" fill={accent} fillOpacity=".16" />
            <path d="M42 42h66M42 58h44M42 88h58" />
            <circle cx="100" cy="82" r="26" fill={accent} stroke="none" />
            <path
              d="M92 75a8.5 8.5 0 1 1 11.6 8c-2 .9-3.6 2.4-3.6 4.6M100 95h.01"
              stroke="#fff"
              strokeWidth="3.4"
            />
            <path d="M32 96c8 3 14 3 20 0" stroke={accent} strokeWidth="2.5" />
          </>
        )}

        {kind === "map" && (
          <>
            <path d="M75 62C60 58 50 50 38 44M75 70C60 76 52 84 42 90M75 62c16-6 26-14 38-22" />
            <circle cx="75" cy="66" r="19" fill={accent} stroke="none" />
            <circle cx="30" cy="38" r="12" fill="var(--surface)" />
            <circle cx="34" cy="94" r="12" fill="var(--surface)" />
            <circle cx="120" cy="34" r="12" fill={highlight} />
            <path d="M26 34h8M30 30v8" strokeWidth="2.6" />
            <path d="M30 90h8M34 86v8" strokeWidth="2.6" />
            <circle cx="75" cy="66" r="6" fill={highlight} stroke="none" />
          </>
        )}

        {kind === "cards" && (
          <>
            <rect x="26" y="34" width="94" height="70" rx="12" fill={accent} fillOpacity=".12" transform="rotate(-6 73 69)" />
            <rect x="32" y="30" width="94" height="70" rx="12" fill="var(--surface)" />
            <path d="M46 48h58M46 62h40M46 76h48" />
            <rect x="44" y="58" width="46" height="12" rx="4" fill={highlight} stroke="none" fillOpacity=".95" />
            <path d="M46 64h42" />
            <circle cx="118" cy="96" r="14" fill={accent} stroke="none" />
            <path d="M112 96l4 4 8-9" stroke="#fff" strokeWidth="3" />
          </>
        )}

        {kind === "review" && (
          <>
            <rect x="22" y="30" width="76" height="78" rx="12" fill={accent} fillOpacity=".16" />
            <path d="M38 52h44M38 66h30M38 88h36" />
            <rect x="58" y="46" width="70" height="58" rx="12" fill="var(--surface)" transform="rotate(6 93 75)" />
            <path d="M72 64h40M72 76h26" transform="rotate(6 93 75)" />
            <circle cx="112" cy="34" r="15" fill={accent} stroke="none" />
            <path d="M105 34l4.5 4.5L118 29" stroke="#fff" strokeWidth="3" />
            <path d="M104 98l-8 10 16-4" stroke={accent} strokeWidth="2.5" />
          </>
        )}

        {kind === "timer" && (
          <>
            <circle cx="75" cy="68" r="46" fill={accent} fillOpacity=".14" />
            <circle cx="75" cy="68" r="46" />
            <path d="M75 42v28l18 10" />
            <path d="M75 14v10M112 68h10M28 68h10" />
            <circle cx="75" cy="68" r="4" fill={accent} stroke="none" />
            <path d="M104 30l8-8" stroke={highlight} strokeWidth="6" />
          </>
        )}
      </svg>
    </div>
  );
}
