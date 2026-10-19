import type { ReactNode } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

export function ThemeWrapper({ children }: { children: ReactNode }) {
  const { settings, setTheme, setAccent, setCanvasBg, setFont, setFontSize, setContrast, setReduceMotion, setLanguage } = useAppStore();

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-200",
        settings.reduceMotion ? "" : "animate-fade-in",
        settings.canvasBg !== "blank" ? `canvas-${settings.canvasBg}` : ""
      )}
      style={{ fontFamily: settings.font === "literata" ? "'Literata', serif" : "'Inter', sans-serif", fontSize: settings.fontSize }}
      data-theme={settings.theme}
      data-accent={settings.accent}
      data-high-contrast={settings.contrast}
    >
      {children}
    </div>
  );
}
