import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { ThemeWrapper } from "@/components/layout/ThemeWrapper";
import { AccentPicker } from "@/components/ui/AccentPicker";
import { CanvasBgPicker } from "@/components/ui/CanvasBgPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeaderBar } from "@/components/ui/HeaderBar";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import {
  BookOpen,
  GraduationCap,
  Lock,
  PencilSimpleLine,
  ArrowClockwise,
  ShieldCheck,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function PinEntry({ onDone }: { onDone: (pin: string) => void }) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState(false);

  const handleChange = (i: number, v: string) => {
    if (v.length > 1) v = v[0];
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError(false);
    if (v && i < 3) {
      const inp = document.getElementById(`pin-${i + 1}`) as HTMLInputElement;
      inp?.focus();
    }
  };

  const handleSubmit = () => {
    const pin = digits.join("");
    if (pin.length === 4) {
      const stored = localStorage.getItem("einnote-pin");
      if (stored === pin || !stored) {
        onDone(pin);
      } else {
        setError(true);
        setDigits(["", "", "", ""]);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            id={`pin-${i}`}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Backspace" && !d && i > 0) {
                (document.getElementById(`pin-${i - 1}`) as HTMLInputElement)?.focus();
              }
            }}
            className={cn(
              "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-[var(--surface)] text-[var(--ink)]",
              "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2",
              error ? "border-[var(--danger)]" : "border-[var(--line)] focus:border-[hsl(var(--accent))]"
            )}
          />
        ))}
      </div>
      {error && <p className="text-sm text-[var(--danger)] font-inter">Code incorrect</p>}
      <button
        onClick={handleSubmit}
        disabled={digits.some((d) => !d)}
        className="w-full max-w-[200px] py-3 rounded-xl bg-[hsl(var(--accent))] text-white font-inter font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        Déverrouiller
      </button>
    </div>
  );
}

export default function IndexPage() {
  const navigate = useNavigate();
  const { settings, setOnboarded, setPinSet } = useAppStore();
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState<"onboard" | "pin" | "home">(() => {
    if (settings.onboarded) {
      return settings.pinSet ? "pin" : "home";
    }
    return "onboard";
  });

  useEffect(() => {
    if (settings.onboarded && settings.pinSet) {
      setShowPin(true);
    }
  }, []);

  const finishOnboarding = () => {
    setOnboarded(true);
    setTimeout(() => setStep("pin"), 400);
  };

  const finishPin = (pin: string) => {
    localStorage.setItem("einnote-pin", pin);
    setPinSet(true);
    setShowPin(false);
    setTimeout(() => setStep("home"), 300);
  };

  const goToLibrary = () => navigate("/library");

  return (
    <ThemeWrapper>
      <div className="flex min-h-screen bg-[var(--bg)]">
        <DesktopSidebar />
        <PageShell className="bg-[var(--bg)]">
          <AnimatePresence mode="wait">
            {step === "onboard" && (
              <motion.div
                key="onboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
              >
                <div className="flex flex-col items-center py-12 px-4 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="w-20 h-20 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center mb-6 shadow-lg"
                  >
                    <span className="font-literata text-white text-4xl font-bold leading-none">É</span>
                  </motion.div>
                  <h1 className="font-literata text-4xl font-bold text-[var(--ink)] mb-3">Einnote</h1>
                  <p className="font-inter text-[var(--muted)] text-base max-w-sm mb-10 leading-relaxed">
                    Prenez des notes intelligentes et révisiez avec l'apprentissage actif.
                  </p>

                  <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8">
                    {[
                      { icon: PencilSimpleLine, label: "4 méthodes" },
                      { icon: ArrowClockwise, label: "Révision FSRS" },
                      { icon: BookOpen, label: "Graphes de notes" },
                      { icon: GraduationCap, label: "Tutoriels" },
                    ].map(({ icon: I, label }, i) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)]"
                      >
                        <I weight="fill" className="w-6 h-6 text-[hsl(var(--accent))]" />
                        <span className="font-inter text-xs text-[var(--muted)]">{label}</span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={finishOnboarding}
                    className="w-full max-w-xs py-3.5 rounded-xl bg-[hsl(var(--accent))] text-white font-inter font-semibold text-base hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
                  >
                    Commencer
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === "pin" && (
              <motion.div
                key="pin"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center justify-center min-h-[70vh] px-4"
              >
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center mb-4">
                  <Lock weight="fill" className="w-6 h-6 text-white" />
                </div>
                <h2 className="font-literata text-xl font-semibold text-[var(--ink)] mb-1">Créer un code PIN</h2>
                <p className="font-inter text-sm text-[var(--muted)] mb-8">Protégez vos notes avec un code à 4 chiffres</p>
                <PinEntry onDone={finishPin} />
                <button
                  onClick={() => {
                    setPinSet(true);
                    setShowPin(false);
                    setStep("home");
                  }}
                  className="mt-6 font-inter text-sm text-[var(--muted)] hover:text-[var(--ink)] underline underline-offset-2"
                >
                  Passer — sans protection
                </button>
              </motion.div>
            )}

            {step === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <HeaderBar
                  title="Bonjour 👋"
                  subtitle="Que voulez-vous faire aujourd'hui ?"
                />
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[
                    { to: "/new", icon: PencilSimpleLine, label: "Nouvelle note", sub: "Créer" },
                    { to: "/review", icon: ArrowClockwise, label: "Réviser", sub: "Aujourd'hui" },
                    { to: "/library", icon: BookOpen, label: "Bibliothèque", sub: "Voir tout" },
                    { to: "/learn", icon: GraduationCap, label: "Apprendre", sub: "Leçons" },
                  ].map(({ to, icon: I, label, sub }) => (
                    <button
                      key={to}
                      onClick={() => navigate(to)}
                      className="flex flex-col items-start gap-2 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line)] hover:border-[hsl(var(--accent))]/40 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 touch-manipulation"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent-soft))] flex items-center justify-center">
                        <I weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
                      </div>
                      <div>
                        <span className="font-literata font-semibold text-[var(--ink)] block">{label}</span>
                        <span className="font-inter text-xs text-[var(--muted)]">{sub}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] p-5">
                  <h2 className="font-literata font-semibold text-[var(--ink)] mb-3">Rappel rapide</h2>
                  <p className="font-inter text-sm text-[var(--muted)] leading-relaxed">
                    Einnote combine prise de notes et révision espacée. Créez des notes avec les méthodes Outline, Cornell, Carte mentale ou Zettelkasten, puis révisez-les avec le système FSRS.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PageShell>
        <AppLayoutMobile />
      </div>
    </ThemeWrapper>
  );
}
