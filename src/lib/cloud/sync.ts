import { hasLocalSession } from "@/lib/cloud/auth";
import { getSupabase } from "@/lib/cloud/client";
import { cloudConfig, deviceKey } from "@/lib/cloud/config";
import { mergeSnapshots, rowsToSnapshot, tombstoneKey } from "@/lib/cloud/merge";
import {
  activeTombstones,
  deriveTombstones,
  idsOf,
  loadState,
  rowsFromRpc,
  saveState,
  type CloudSyncState,
} from "@/lib/cloud/state";
import type {
  ContentSnapshot,
  MergeReport,
  Tombstone,
} from "@/lib/cloud/types";
import { COLLECTIONS } from "@/lib/cloud/types";
import { useContentStore } from "@/stores/useContentStore";

/**
 * Moteur de synchronisation.
 *
 * Séquence, et pourquoi cet ordre :
 *
 * 1. **Lire le local**, déduire les tombes (suppressions depuis la dernière
 *    fois). Rien n’est envoyé avant d’avoir compris ce qui a disparu.
 * 2. **Tirer le distant** en entier. Un delta naïf (`since`) raterait les
 *    entités créées puis modifiées pendant qu’on était hors ligne ; pour un
 *    carnet personnel, un transfert complet est de l’ordre de quelques
 *    dizaines de kilooctets.
 * 3. **Fusionner** — la logique pure de `merge.ts`, testée sans réseau.
 * 4. **Appliquer localement** la fusion avant de pousser, pour qu’un échec
 *    d’envoi ne laisse pas le local et le distant désalignés.
 * 5. **Pousser** par lots. Le serveur arbitre encore une fois (`stamp`), donc
 *    deux appareils simultanés ne peuvent pas s’écraser.
 * 6. **Mémoriser** l’état (ids connus, tombes) pour la fois suivante.
 */

export type SyncFailure =
  | "not-configured"
  | "offline"
  | "not-signed-in"
  | "payment-required"
  | "network"
  | "error";

export interface SyncResult {
  ok: boolean;
  reason?: SyncFailure;
  message?: string;
  report?: MergeReport;
  pushed?: number;
  pulled?: number;
  at?: string;
}

export interface Entitlement {
  plan: "free" | "cloud";
  status: "inactive" | "trialing" | "active" | "past_due" | "canceled";
  active: boolean;
  currentPeriodEnd: string | null;
}

export const FREE_ENTITLEMENT: Entitlement = {
  plan: "free",
  status: "inactive",
  active: false,
  currentPeriodEnd: null,
};

export interface CloudDevice {
  deviceKey: string;
  label: string | null;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
}

/** Le store ne connaît pas la notion de collection : on la projette ici. */
export function snapshotFromStore(): ContentSnapshot {
  const payload = useContentStore.getState().exportPayload() as Record<string, unknown>;
  const snapshot = {} as ContentSnapshot;
  for (const collection of COLLECTIONS) {
    const value = payload[collection];
    (snapshot as unknown as Record<string, unknown[]>)[collection] = Array.isArray(value)
      ? (value as unknown[])
      : [];
  }
  return snapshot;
}

function errorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  const record = error as { message?: string; code?: string; details?: string };
  return [record.message, record.details, record.code].filter(Boolean).join(" · ");
}

function isPaymentError(error: unknown): boolean {
  const text = errorMessage(error).toLowerCase();
  return text.includes("subscription required") || text.includes("42501");
}

/** Une seule synchronisation à la fois : deux appels concurrents se corrompent. */
let running: Promise<SyncResult> | null = null;

export function syncNow(options: { reason?: string } = {}): Promise<SyncResult> {
  if (running) return running;
  running = runSync(options).finally(() => {
    running = null;
  });
  return running;
}

async function runSync(_options: { reason?: string }): Promise<SyncResult> {
  if (!cloudConfig()) {
    return {
      ok: false,
      reason: "not-configured",
      message:
        "Le cloud n’est pas configuré sur cette installation : ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.",
    };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      ok: false,
      reason: "offline",
      message: "Hors ligne. Votre travail reste enregistré ; la synchro reprendra au retour du réseau.",
    };
  }

  const supabase = await getSupabase();
  if (!supabase) {
    return { ok: false, reason: "not-configured", message: "Client cloud indisponible." };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) {
    return {
      ok: false,
      reason: "not-signed-in",
      message: "Connectez-vous pour synchroniser.",
    };
  }

  const before = snapshotFromStore();
  let state: CloudSyncState = loadState(userId);
  const now = new Date().toISOString();

  /* Tombes déduites AVANT le tirage : ce qui a disparu localement doit être
     annoncé au serveur, sinon il nous le rendra. */
  const fresh = deriveTombstones(state, before, now);
  const tombstones: Tombstone[] = activeTombstones(
    dedupe([...state.tombstones, ...fresh]),
    before,
  );
  state = { ...state, tombstones };

  /* 2 — tirage complet. */
  const { data: pulled, error: pullError } = await supabase.rpc("pull_entities", {
    since_ms: 0,
  });

  if (pullError) {
    const message = errorMessage(pullError);
    if (/function|schema|not found|does not exist/i.test(message)) {
      return {
        ok: false,
        reason: "error",
        message: `Schéma cloud absent sur ce projet : exécutez supabase/migrations/0001_cloud_sync.sql. (${message})`,
      };
    }
    return { ok: false, reason: "network", message: `Lecture impossible : ${message}` };
  }

  const remoteRows = rowsFromRpc(pulled);
  const { snapshot: remoteSnapshot, tombstones: remoteTombstones } = rowsToSnapshot(remoteRows);

  /* 3 — fusion. */
  const outcome = mergeSnapshots(before, remoteSnapshot, tombstones, remoteTombstones);
  state = { ...state, tombstones: outcome.tombstones };

  /* 4 — appliquer localement d’abord. */
  if (outcome.changedLocal) {
    useContentStore.getState().replaceAll(outcome.merged);
  }

  const finalSnapshot = outcome.changedLocal ? outcome.merged : before;

  /* 5 — pousser. Un lot vide n’est pas un appel. */
  let pushedCount = 0;
  const rows = outcome.toPush;
  if (rows.length > 0) {
    for (let index = 0; index < rows.length; index += 200) {
      const batch = rows.slice(index, index + 200).map((row) => ({
        collection: row.collection,
        entity_id: row.entity_id,
        payload: row.payload,
        stamp: row.stamp,
        deleted: row.deleted,
      }));

      const { data: ack, error: pushError } = await supabase.rpc("push_entities", {
        rows: batch,
        device_key: deviceKey(),
      });

      if (pushError) {
        if (isPaymentError(pushError)) {
          /* Le local est déjà fusionné et enregistré : on ne perd rien, on
             informe. C’est tout l’intérêt d’avoir appliqué avant de pousser. */
          return {
            ok: false,
            reason: "payment-required",
            message:
              "Abonnement requis pour envoyer vers le cloud. Vos notes restent sur cet appareil.",
            report: outcome.report,
            at: now,
          };
        }
        return {
          ok: false,
          reason: "network",
          message: `Envoi interrompu (${pushedCount}/${rows.length}) : ${errorMessage(pushError)}`,
          report: outcome.report,
        };
      }

      pushedCount += Number((ack as { accepted?: number } | null)?.accepted ?? 0);
    }
  }

  /* 6 — mémoriser. */
  state = {
    ...state,
    lastSyncAt: now,
    known: idsOf(finalSnapshot),
  };
  saveState(state);

  void supabase
    .rpc("touch_device", { device_key: deviceKey(), label: deviceLabel() })
    .then(() => undefined);

  return {
    ok: true,
    report: outcome.report,
    pushed: pushedCount,
    pulled: remoteRows.length,
    at: now,
  };
}

function dedupe(tombstones: Tombstone[]): Tombstone[] {
  const map = new Map<string, Tombstone>();
  for (const stone of tombstones) {
    const key = tombstoneKey(stone.collection, stone.id);
    const previous = map.get(key);
    if (!previous || (Date.parse(stone.deletedAt) || 0) > (Date.parse(previous.deletedAt) || 0)) {
      map.set(key, stone);
    }
  }
  return [...map.values()];
}

/** Étiquette lisible pour la liste des appareils. */
export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Appareil";
  const ua = navigator.userAgent;
  const platform = /iPad|Tablet/i.test(ua)
    ? "Tablette"
    : /Mobile|Android|iPhone/i.test(ua)
      ? "Téléphone"
      : "Ordinateur";
  const browser = /Firefox\//.test(ua)
    ? "Firefox"
    : /Edg\//.test(ua)
      ? "Edge"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Navigateur";
  return `${platform} · ${browser}`;
}

/* ------------------------------------------------------------------ */
/* Lecture d’état (abonnement, appareils, dernière synchro)            */
/* ------------------------------------------------------------------ */

export async function fetchEntitlement(): Promise<Entitlement> {
  const supabase = await getSupabase();
  if (!supabase) return FREE_ENTITLEMENT;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return FREE_ENTITLEMENT;

  const { data, error } = await supabase.rpc("my_entitlement");
  if (error || !data) return FREE_ENTITLEMENT;

  const record = data as Record<string, unknown>;
  return {
    plan: record.plan === "cloud" ? "cloud" : "free",
    status: (record.status as Entitlement["status"]) ?? "inactive",
    active: record.active === true,
    currentPeriodEnd:
      typeof record.current_period_end === "string" ? record.current_period_end : null,
  };
}

export async function fetchDevices(): Promise<CloudDevice[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_devices");
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    deviceKey: String(row.device_key ?? ""),
    label: typeof row.label === "string" ? row.label : null,
    lastSeenAt: typeof row.last_seen_at === "string" ? row.last_seen_at : null,
    lastSyncAt: typeof row.last_sync_at === "string" ? row.last_sync_at : null,
  }));
}

export function lastSyncAt(): string | null {
  return storedState()?.lastSyncAt ?? null;
}

function storedState(): CloudSyncState | null {
  try {
    const raw = window.localStorage.getItem("engram.cloud.state.v1");
    return raw ? (JSON.parse(raw) as CloudSyncState) : null;
  } catch {
    return null;
  }
}

/** Réglage local : synchroniser automatiquement en fin de session d’édition. */
const AUTO_KEY = "engram.cloud.auto.v1";

export function autoSyncEnabled(): boolean {
  try {
    return window.localStorage.getItem(AUTO_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setAutoSync(enabled: boolean) {
  try {
    window.localStorage.setItem(AUTO_KEY, enabled ? "on" : "off");
  } catch {
    /* sans effet : le réglage est un confort, pas une garantie */
  }
}

/** Débounce : une frappe ne doit pas déclencher une requête par caractère. */
let autoTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoSync(delay = 4000) {
  /* Sans cloud configuré, ou sans session connue, une synchro automatique
     serait un appel réseau pour rien à chaque frappe. */
  if (!autoSyncEnabled()) return;
  if (!cloudConfig()) return;
  if (!hasLocalSession()) return;
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    autoTimer = null;
    void syncNow({ reason: "auto" });
  }, delay);
}

/* ------------------------------------------------------------------ */
/* Abonnement                                                          */
/* ------------------------------------------------------------------ */

export async function startCheckout(): Promise<{ url?: string; error?: string }> {
  const supabase = await getSupabase();
  if (!supabase) return { error: "Cloud non configuré." };

  const { data, error } = await supabase.functions.invoke("stripe-checkout", { body: {} });
  if (error) {
    return {
      error: `Paiement indisponible : ${errorMessage(error)}. Déployez la fonction stripe-checkout.`,
    };
  }
  const url = (data as { url?: string } | null)?.url;
  const message = (data as { error?: string } | null)?.error;
  if (!url) return { error: message ?? "Aucune session de paiement renvoyée." };
  return { url };
}

/** Effacement côté cloud — les notes locales restent. */
export async function wipeCloudData(): Promise<{ ok: boolean; message?: string }> {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, message: "Cloud non configuré." };

  const { error } = await supabase.rpc("wipe_cloud_data");
  if (error) return { ok: false, message: errorMessage(error) };

  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) saveState({ userId: userData.user.id, lastSyncAt: null, tombstones: [], known: {} });

  return { ok: true };
}
