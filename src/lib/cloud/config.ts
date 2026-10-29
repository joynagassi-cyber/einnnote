/**
 * Configuration du cloud.
 *
 * Rien n’est obligatoire : sans variables d’environnement, l’application reste
 * exactement ce qu’elle était — locale, sans compte. C’est la contrainte de
 * départ de ce projet, et le cloud ne doit pas la casser.
 *
 * Variables (fichier `.env.local`, non versionné) :
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ…
 *
 * La clé « anon » est **publique par conception** : elle ne donne que ce que
 * les politiques RLS autorisent. Ne jamais mettre la clé service role ici —
 * elle serait livrée dans le bundle du navigateur.
 */

export interface CloudConfig {
  url: string;
  anonKey: string;
}

function readEnv(key: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export function cloudConfig(): CloudConfig | null {
  const url = readEnv("VITE_SUPABASE_URL");
  const anonKey = readEnv("VITE_SUPABASE_ANON_KEY");

  /* Une URL sans clé, ou l’inverse, est une configuration incomplète : on la
     traite comme absente plutôt que de planter au premier appel réseau. */
  if (!url || !anonKey) return null;
  if (!/^https?:\/\//.test(url)) return null;

  return { url, anonKey };
}

export function isCloudConfigured(): boolean {
  return cloudConfig() !== null;
}

/** Prix affiché et facturé (centimes, devise). Une seule source. */
export const CLOUD_PRICE = {
  amount: 10,
  currency: "USD",
  interval: "mois",
  label: "10 $ / mois",
} as const;

/** Identifiant local de l’appareil, pour diagnostiquer les conflits. */
export function deviceKey(): string {
  const KEY = "engram.device.v1";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    window.localStorage.setItem(KEY, created);
    return created;
  } catch {
    return "inconnu";
  }
}
