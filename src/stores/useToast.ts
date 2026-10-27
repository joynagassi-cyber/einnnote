import { create } from "zustand";

interface ToastState {
  message: string | null;
  tone: "neutral" | "accent" | "danger";
  show: (message: string, tone?: ToastState["tone"]) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  message: null,
  tone: "neutral",
  show: (message, tone = "neutral") => {
    if (timer) clearTimeout(timer);
    set({ message, tone });
    timer = setTimeout(() => set({ message: null }), 2600);
  },
  hide: () => {
    if (timer) clearTimeout(timer);
    set({ message: null });
  },
}));
