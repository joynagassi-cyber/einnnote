import { getSupabase } from "@/lib/cloud/client";

/**
 * Authentification par lien/code à usage unique.
 *
 * Pas de mot de passe, et c’est un choix : un carnet de notes personnel n’a
 * pas besoin d’un second secret à retenir, et un mot de passe de plus est un
 * mot de passe de plus à fuiter. Supabase envoie un code à 6 chiffres ; le
 * code est vérifié localement via `verifyOtp`, donc aucun lien à cliquer, donc
 * rien à configurer côté URL de redirection.
 */

export type AuthOutcome =
  | { ok: true; stage: "code-sent" | "signed-in" }
  | { ok: false; message: string };

export async function requestCode(email: string): Promise<AuthOutcome> {
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
    return { ok: false, message: "Adresse électronique invalide." };
  }

  const supabase = await getSupabase();
  if (!supabase) {
    return { ok: false, message: "Cloud non configuré sur cette installation." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { ok: false, message: messageFor(error.message) };
  }
  return { ok: true, stage: "code-sent" };
}

export async function verifyCode(email: string, token: string): Promise<AuthOutcome> {
  const code = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, message: "Le code comporte 6 chiffres." };
  }

  const supabase = await getSupabase();
  if (!supabase) return { ok: false, message: "Cloud non configuré." };

  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code,
    type: "email",
  });

  if (error) return { ok: false, message: messageFor(error.message) };
  return { ok: true, stage: "signed-in" };
}

/**
 * Session présente localement ? Répond sans appel réseau, et sert
 * uniquement à éviter de tenter une synchro automatique quand on sait
 * déjà qu’il n’y a personne de connecté.
 */
export function hasLocalSession(): boolean {
  try {
    return Boolean(window.localStorage.getItem("engram.auth.v1"));
  } catch {
    return false;
  }
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase?.auth.signOut();
}

export async function currentEmail(): Promise<string | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.email ?? null;
}

function messageFor(raw: string): string {
  const text = raw.toLowerCase();
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Trop de demandes. Réessayez dans quelques minutes.";
  }
  if (text.includes("expired") || text.includes("invalid")) {
    return "Code invalide ou expiré. Demandez-en un nouveau.";
  }
  if (text.includes("email not confirmed")) {
    return "Adresse non confirmée.";
  }
  return raw;
}
