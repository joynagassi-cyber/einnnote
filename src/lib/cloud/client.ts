import { cloudConfig } from "@/lib/cloud/config";

/**
 * Client Supabase — **chargé à la demande**.
 *
 * `@supabase/supabase-js` n’entre pas dans le bundle initial : quelqu’un qui
 * n’active jamais le cloud ne télécharge pas le SDK. C’est cohérent avec la
 * promesse « tout reste sur cet appareil » : le code du cloud n’est pas
 * seulement inactif, il est absent tant qu’on ne l’a pas demandé.
 */

type SupabaseClient = import("@supabase/supabase-js").SupabaseClient;

let cached: SupabaseClient | null = null;
let loading: Promise<SupabaseClient | null> | null = null;

export async function getSupabase(): Promise<SupabaseClient | null> {
  const config = cloudConfig();
  if (!config) return null;
  if (cached) return cached;
  if (loading) return loading;

  loading = import("@supabase/supabase-js")
    .then(({ createClient }) => {
      cached = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "engram.auth.v1",
        },
      });
      return cached;
    })
    .catch(() => null)
    .finally(() => {
      loading = null;
    });

  return loading;
}

/** Testé par les suites : remet le client à zéro entre deux cas. */
export function resetSupabaseClient() {
  cached = null;
  loading = null;
}
