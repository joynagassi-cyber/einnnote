import { CanvasBg } from "@/types";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { DotsThreeVertical, LineVertical, SquaresFour, Minus } from "@phosphor-icons/react";

const CANVASES: { value: CanvasBg; icon: typeof DotsThreeVertical; label: string }[] = [
  { value: "dots", icon: DotsThreeVertical, label: "Pointillé" },
  { value: "ruled", icon: LineVertical, label: "Ligné" },
  { value: "grid", icon: SquaresFour, label: "Quadrillé" },
  { value: "blank", icon: Minus, label: "Blanc" },
];

interface CanvasBgPickerProps {
  className?: string;
}

export function CanvasBgPicker({ className }: CanvasBgPickerProps) {
  const { settings, setCanvasBg } = useAppStore();

  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-3">
        {CANVASES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCanvasBg(c.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-150",
              settings.canvasBg === c.value
                ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent-soft))]"
                : "border-[var(--line)] hover:border-[var(--muted)]"
            )}
            aria-pressed={settings.canvasBg === c.value}
          >
            <div
              className={cn("w-10 h-10 rounded-xl border border-[var(--line)] overflow-hidden", `canvas-${c.value}`)}
            >
              <span className="sr-only">{c.label}</span>
            </div>
            <span className="font-inter text-xs text-[var(--muted)]">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
