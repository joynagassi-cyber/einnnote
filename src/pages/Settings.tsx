import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { AccentPicker } from "@/components/ui/AccentPicker";
import { CanvasBgPicker } from "@/components/ui/CanvasBgPicker";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import { HeaderBar } from "@/components/ui/HeaderBar";
import {
  Moon,
  Sun,
  DeviceMobile,
  Palette,
  DotsThreeVertical,
  LineVertical,
  SquaresFour,
  Minus,
  TextAa,
  Eyedropper,
  ArrowArcRight,
  Globe,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ThemeMode, CanvasBg } from "@/types";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { settings, setTheme, setAccent, setCanvasBg, setFont, setFontSize, setContrast, setReduceMotion, setLanguage } = useAppStore();
  const [fontSize, setFontSizeLocal] = useState(settings.fontSize);

  useEffect(() => {
    setFontSize(fontSize);
  }, [fontSize, setFontSize]);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <DesktopSidebar />
      <PageShell>
        <HeaderBar title="Apparence" subtitle="Personnalisez Einnote" />

        <div className="space-y-6">
          {/* Theme */}
          <section>
            <h2 className="flex items-center gap-2 font-literata font-semibold text-[var(--ink)] mb-3">
              <Sun weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
              Thème
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "light", icon: Sun, label: "Clair" },
                { value: "dark", icon: Moon, label: "Sombre" },
                { value: "system", icon: DeviceMobile, label: "Système" },
              ] as const).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    settings.theme === value
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent-soft))]"
                      : "border-[var(--line)] hover:border-[var(--muted)]"
                  )}
                >
                  <Icon weight="fill" className={cn("w-6 h-6", settings.theme === value ? "text-[hsl(var(--accent))]" : "text-[var(--muted)]")} />
                  <span className="font-inter text-sm text-[var(--ink)]">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Accent */}
          <section>
            <h2 className="flex items-center gap-2 font-literata font-semibold text-[var(--ink)] mb-3">
              <Palette weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
              Accent
            </h2>
            <AccentPicker />
          </section>

          {/* Canvas background */}
          <section>
            <h2 className="flex items-center gap-2 font-literata font-semibold text-[var(--ink)] mb-3">
              <DotsThreeVertical weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
              Fond du canevas
            </h2>
            <CanvasBgPicker />
          </section>

          {/* Font */}
          <section>
            <h2 className="flex items-center gap-2 font-literata font-semibold text-[var(--ink)] mb-3">
              <TextAa weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
              Typographie
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(["literata", "inter"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFont(f)}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all",
                    settings.font === f
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent-soft))]"
                      : "border-[var(--line)] hover:border-[var(--muted)]"
                  )}
                >
                  <span className={cn("block text-xl font-bold", f === "literata" ? "font-literata" : "font-inter")}>
                    Aa
                  </span>
                  <span className={cn("font-inter text-sm mt-1 block", settings.font === f ? "text-[hsl(var(--accent))]" : "text-[var(--muted)]")}>
                    {f === "literata" ? "Literata" : "Inter"}
                  </span>
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between font-inter text-sm text-[var(--muted)]">
              <span>Taille du texte</span>
              <span className="font-semibold text-[var(--ink)]">{fontSize}px</span>
            </label>
            <input
              type="range"
              min={14}
              max={22}
              value={fontSize}
              onChange={(e) => setFontSizeLocal(Number(e.target.value))}
              className="w-full mt-2 accent-[hsl(var(--accent))]"
            />
          </section>

          {/* Options */}
          <section>
            <h2 className="flex items-center gap-2 font-literata font-semibold text-[var(--ink)] mb-3">
              <Eyedropper weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
              Options
            </h2>
            <div className="space-y-3">
              <ToggleRow
                label="Contraste élevé"
                description="Augmenter le contraste pour plus de lisibilité"
                checked={settings.contrast}
                onToggle={setContrast}
              />
              <ToggleRow
                label="Réduire les animations"
                description="Diminuer les mouvements et transitions"
                checked={settings.reduceMotion}
                onToggle={setReduceMotion}
              />
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)]">
                <div>
                  <span className="flex items-center gap-2 font-inter text-sm font-medium text-[var(--ink)]">
                    <Globe weight="regular" className="w-4 h-4 text-[var(--muted)]" /> Langue
                  </span>
                  <span className="font-inter text-xs text-[var(--muted)] block mt-0.5">{settings.language === "fr" ? "Français" : "English"}</span>
                </div>
                <button
                  onClick={() => setLanguage(settings.language === "fr" ? "en" : "fr")}
                  className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] font-inter text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                >
                  {settings.language === "fr" ? "EN" : "FR"}
                </button>
              </div>
            </div>
          </section>

          {/* Preview */}
          <section>
            <h2 className="flex items-center gap-2 font-literata font-semibold text-[var(--ink)] mb-3">
              <ArrowArcRight weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
              Aperçu
            </h2>
            <div className={cn("p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)]", settings.canvasBg !== "blank" ? `canvas-${settings.canvasBg}` : "")}>
              <div className="space-y-2">
                <div className="h-4 w-2/3 rounded-lg bg-[var(--surface-2)]" />
                <div className="h-3 w-full rounded-lg bg-[var(--line)]" />
                <div className="h-3 w-5/6 rounded-lg bg-[var(--line)]" />
                <div className="flex gap-2 mt-3">
                  <span className="px-2 py-1 rounded-full text-xs font-inter" style={{ backgroundColor: "hsl(var(--accent-soft))", color: "hsl(var(--accent))" }}>
                    Accent
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-inter bg-[var(--surface-2)] text-[var(--muted)]">
                    Tag
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </PageShell>
      <AppLayoutMobile />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)]">
      <div>
        <span className="font-inter text-sm font-medium text-[var(--ink)]">{label}</span>
        <p className="font-inter text-xs text-[var(--muted)] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onToggle(!checked)}
        className={cn(
          "w-11 h-6 rounded-full transition-colors relative",
          checked ? "bg-[hsl(var(--accent))]" : "bg-[var(--line)]"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
