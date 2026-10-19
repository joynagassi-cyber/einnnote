import { AccentColor } from "@/types";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

const ACCENTS: { value: AccentColor; hex: string; name: string }[] = [
  { value: "teal", hex: "#0F766E", name: "Sarcelle" },
  { value: "blue", hex: "#1D4ED8", name: "Bleu" },
  { value: "violet", hex: "#6D28D9", name: "Violet" },
  { value: "green", hex: "#15803D", name: "Vert" },
  { value: "terracotta", hex: "#B4532A", name: "Terracotta" },
  { value: "plum", hex: "#86198F", name: "Prune" },
  { value: "graphite", hex: "#3F3F46", name: "Graphite" },
];

interface AccentPickerProps {
  className?: string;
}

export function AccentPicker({ className }: AccentPickerProps) {
  const { settings, setAccent } = useAppStore();

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        {ACCENTS.map((a) => (
          <button
            key={a.value}
            onClick={() => setAccent(a.value)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 focus:outline-none",
              "touch-manipulation"
            )}
            title={a.name}
          >
            <span
              className={cn(
                "w-9 h-9 rounded-full transition-all duration-150",
                "border-2",
                settings.accent === a.value
                  ? "border-[var(--ink)] scale-110 shadow-md"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: a.hex }}
              aria-label={`Accent ${a.name}`}
            />
            <span className="font-inter text-[10px] text-[var(--muted)]">{a.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
