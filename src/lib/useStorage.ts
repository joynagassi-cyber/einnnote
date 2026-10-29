import { useEffect, useState } from "react";
import { estimateStorage, type StorageUsage } from "@/lib/storage";

/**
 * Mesure du stockage, recalculée à chaque changement de `refreshKey`.
 * Le quota réel n’est demandé qu’une fois : `navigator.storage.estimate()`
 * n’est pas gratuit.
 */
export function useStorageUsage(refreshKey?: unknown) {
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  useEffect(() => {
    let alive = true;
    estimateStorage().then((result) => {
      if (alive) setUsage(result);
    });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  return usage;
}
