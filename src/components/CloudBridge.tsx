import { useEffect } from "react";
import { isCloudConfigured } from "@/lib/cloud/config";
import { scheduleAutoSync, syncNow } from "@/lib/cloud/sync";
import { useContentStore } from "@/stores/useContentStore";

/**
 * Pont entre le store et le moteur de synchro.
 *
 * Deux déclencheurs, pas trois :
 * 1. **au démarrage**, si une session existe — on récupère ce qui a changé
 *    ailleurs avant que l’utilisateur ne commence à écrire ;
 * 2. **après une modification**, débouncée à 4 s — écrire sans arrêter de
 *    sync n’a aucun intérêt et coûte des requêtes.
 *
 * Rien ne s’exécute si le cloud n’est pas configuré : aucun composant inutile
 * n’est monté, aucun SDK n’est chargé.
 */
export function CloudBridge() {
  useEffect(() => {
    if (!isCloudConfigured()) return;

    const delay = window.setTimeout(() => {
      void syncNow({ reason: "démarrage" });
    }, 1500);

    const unsubscribe = useContentStore.subscribe(() => {
      scheduleAutoSync();
    });

    return () => {
      window.clearTimeout(delay);
      unsubscribe();
    };
  }, []);

  return null;
}
