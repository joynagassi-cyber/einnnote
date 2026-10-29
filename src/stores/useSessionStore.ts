import { create } from "zustand";

/**
 * État **de session** — volontairement non persisté.
 *
 * Ce qui vit ici ne survit pas à un rechargement, et c’est le but : le rappel
 * de sauvegarde doit apparaître **une fois par lancement**. Le persister
 * reviendrait à le montrer une seule fois pour toujours, ce qui est l’inverse
 * de la promesse ; le garder en mémoire dans le composant reviendrait à le
 * remontrer à chaque navigation.
 */
export interface SessionState {
  /** le rappel de sauvegarde a déjà été proposé dans cette session */
  backupPrompted: boolean;
  /** message d’accueil déjà présenté (même règle) */
  welcomeSeen: boolean;
  markBackupPrompted: () => void;
  markWelcomeSeen: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  backupPrompted: false,
  welcomeSeen: false,
  markBackupPrompted: () => set({ backupPrompted: true }),
  markWelcomeSeen: () => set({ welcomeSeen: true }),
  resetSession: () => set({ backupPrompted: false, welcomeSeen: false }),
}));
