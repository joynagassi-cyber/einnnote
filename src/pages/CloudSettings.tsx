import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowClockwise,
  CheckCircle,
  CloudArrowUp,
  CloudSlash,
  DeviceMobile,
  EnvelopeSimple,
  HardDrives,
  Info,
  LockKey,
  SignOut,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { AppBar, Screen } from "@/components/Layout";
import { useToast } from "@/stores/useToast";
import { useContentStore } from "@/stores/useContentStore";
import { CLOUD_PRICE, isCloudConfigured } from "@/lib/cloud/config";
import { currentEmail, requestCode, signOut, verifyCode } from "@/lib/cloud/auth";
import {
  autoSyncEnabled,
  fetchDevices,
  fetchEntitlement,
  lastSyncAt,
  setAutoSync,
  startCheckout,
  syncNow,
  wipeCloudData,
  type CloudDevice,
  type Entitlement,
  type SyncResult,
} from "@/lib/cloud/sync";
import { cn } from "@/lib/utils";

/**
 * Réglages du cloud.
 *
 * Trois états, jamais mélangés : **non configuré** (aucune trace d’un
 * serveur), **hors abonnement** (compte créé, compte gratuit : rien ne part),
 * **abonné** (la synchro fonctionne réellement, et le serveur le vérifie).
 *
 * Un écran de paiement qui prétend fonctionner sans le backend est pire
 * qu’aucun écran de paiement. Ici, tout état affiché vient d’une requête :
 * l’abonnement vient de `engram.my_entitlement()`, la dernière synchro d’un
 * horodatage réel, les appareils de `engram.list_devices()`.
 */
export default function CloudSettingsPage() {
  const navigate = useNavigate();
  const showToast = useToast((s) => s.show);

  const configured = isCloudConfigured();

  const [email, setEmail] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [devices, setDevices] = useState<CloudDevice[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [auto, setAuto] = useState(autoSyncEnabled);
  const [busy, setBusy] = useState<null | "sync" | "code" | "verify" | "checkout" | "wipe">(null);
  const [last, setLast] = useState<SyncResult | null>(null);

  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const notes = useContentStore((s) => s.notes);
  const cards = useContentStore((s) => s.cards);
  const zettel = useContentStore((s) => s.zettel);
  const localCount = notes.length + cards.length + zettel.length;

  const refresh = useCallback(async () => {
    if (!configured) return;
    try {
      const [who, plan, list] = await Promise.all([
        currentEmail(),
        fetchEntitlement(),
        fetchDevices(),
      ]);
      setEmail(who);
      setEntitlement(plan);
      setDevices(list);
      setSyncedAt(lastSyncAt());
      setLoadError(false);
    } catch {
      /* Serveur injoignable : on ne prétend ni abonné ni non abonné. */
      setLoadError(true);
    }
  }, [configured]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runSync = async () => {
    setBusy("sync");
    try {
      const result = await syncNow({ reason: "manuel" });
      setLast(result);
      setSyncedAt(lastSyncAt());
      if (result.ok) {
        showToast("Synchronisé.", "accent");
        void refresh();
      } else {
        showToast(result.message ?? "Synchronisation impossible.", "accent");
      }
    } finally {
      setBusy(null);
    }
  };

  const sendCode = async () => {
    setBusy("code");
    setAuthError(null);
    try {
      const result = await requestCode(address);
      if (result.ok) {
        setCodeSent(true);
        showToast("Code envoyé. Vérifiez votre boîte de réception.", "accent");
      } else if ("message" in result) {
        setAuthError(result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const checkCode = async () => {
    setBusy("verify");
    setAuthError(null);
    try {
      const result = await verifyCode(address, code);
      if (result.ok) {
        setCodeSent(false);
        setCode("");
        showToast("Connecté.", "accent");
        await refresh();
      } else if ("message" in result) {
        setAuthError(result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const subscribe = async () => {
    setBusy("checkout");
    try {
      const result = await startCheckout();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      showToast(result.error ?? "Paiement indisponible.", "accent");
    } finally {
      setBusy(null);
    }
  };

  const wipe = async () => {
    if (
      !window.confirm(
        "Supprimer les données du cloud ?\n\nVos notes restent sur cet appareil. Les autres appareils perdront la copie distante à leur prochaine synchronisation.",
      )
    ) {
      return;
    }
    setBusy("wipe");
    try {
      const result = await wipeCloudData();
      showToast(
        result.ok ? "Données cloud supprimées." : (result.message ?? "Échec de la suppression."),
        "accent",
      );
      if (result.ok) await refresh();
    } finally {
      setBusy(null);
    }
  };

  const signedIn = Boolean(email);
  const active = entitlement?.active === true;

  return (
    <Screen className="screen-narrow px-5">
      <AppBar back onBack={() => navigate("/settings")} title="Cloud" />

      <p className="mt-1 text-[13.5px] leading-[20px] text-muted">
        Synchroniser vos notes entre appareils, avec un serveur que vous pouvez
        inspecter.{" "}
        <strong className="text-ink">Optionnel et payant</strong> : sans abonnement,
        l’application reste entièrement utilisable, hors ligne, comme aujourd’hui.
      </p>

      {/* ------------------------------------------------ non configuré */}
      {!configured && (
        <section className="mt-4 rounded-big border border-line bg-surface p-4">
          <div className="flex items-start gap-2.5">
            <span className="tile h-9 w-9 shrink-0" aria-hidden>
              <CloudSlash size={18} weight="duotone" className="text-muted" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-[18px] font-semibold">
                Aucun serveur associé
              </h2>
              <p className="mt-1 text-[12.5px] leading-[18px] text-muted">
                Cette installation n’a pas de backend cloud. Rien n’est cassé : tout
                fonctionne en local. Pour activer la synchronisation, renseignez{" "}
                <code className="font-mono text-[12px]">VITE_SUPABASE_URL</code> et{" "}
                <code className="font-mono text-[12px]">VITE_SUPABASE_ANON_KEY</code>{" "}
                dans <code className="font-mono text-[12px]">.env.local</code>, puis
                appliquez la migration{" "}
                <code className="font-mono text-[12px]">
                  supabase/migrations/0001_cloud_sync.sql
                </code>
                .
              </p>
            </div>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-card bg-bg p-3 font-mono text-[11.5px] leading-[17px] text-muted">
{`supabase link --project-ref <ref>
supabase db push
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt`}
          </pre>
        </section>
      )}

      {/* ------------------------------------------------ connexion */}
      {configured && loadError && (
        <p className="mt-4 flex items-start gap-1.5 rounded-card border border-line bg-surface px-3 py-2.5 text-[12.5px] leading-[18px] text-muted">
          <WarningCircle size={15} weight="duotone" className="mt-0.5 shrink-0" />
          Serveur injoignable pour l’instant. L’état affiché peut être incomplet.
        </p>
      )}

      {configured && !signedIn && (
        <section className="mt-4 rounded-big border border-line bg-surface p-4">
          <div className="flex items-start gap-2.5">
            <span className="tile h-9 w-9 shrink-0" aria-hidden>
              <EnvelopeSimple size={18} weight="duotone" className="text-accent" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-[18px] font-semibold">Se connecter</h2>
              <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
                Un code à 6 chiffres, pas de mot de passe. Votre adresse sert
                uniquement d’identifiant de compte.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-semibold">Adresse électronique</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="vous@exemple.com"
                className="w-full rounded-card border border-line bg-bg px-3 py-2.5 text-[14px] outline-none focus:border-accent"
              />
            </label>

            {codeSent && (
              <label className="block">
                <span className="mb-1 block text-[12.5px] font-semibold">Code reçu</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="123456"
                  className="tabnum w-full rounded-card border border-line bg-bg px-3 py-2.5 font-mono text-[18px] tracking-[0.3em] outline-none focus:border-accent"
                />
              </label>
            )}

            {authError && (
              <p className="flex items-start gap-1.5 text-[12.5px] text-accent-ink">
                <WarningCircle size={15} weight="duotone" className="mt-0.5 shrink-0" />
                {authError}
              </p>
            )}

            <button
              type="button"
              onClick={codeSent ? checkCode : sendCode}
              disabled={busy !== null || (codeSent ? code.length < 6 : address.trim().length < 5)}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {busy === "code"
                ? "Envoi…"
                : busy === "verify"
                  ? "Vérification…"
                  : codeSent
                    ? "Vérifier le code"
                    : "Recevoir un code"}
            </button>

            {codeSent && (
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                }}
                className="text-[12.5px] text-muted underline"
              >
                Changer d’adresse
              </button>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ abonnement */}
      {configured && signedIn && (
        <>
          <section
            className={cn(
              "mt-4 rounded-big border p-4",
              active ? "border-accent/40 bg-accent-soft" : "border-line bg-surface",
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className="tile h-9 w-9 shrink-0" aria-hidden>
                {active ? (
                  <CheckCircle size={18} weight="duotone" className="text-accent" />
                ) : (
                  <Sparkle size={18} weight="duotone" className="text-accent" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-[18px] font-semibold">
                  {active ? "Abonnement actif" : `Cloud — ${CLOUD_PRICE.label}`}
                </h2>
                <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
                  {active
                    ? "Vos modifications partent au serveur et reviennent sur vos appareils."
                    : "La synchronisation est la seule fonction payante. Le reste — éditeur, révision FSRS, export — reste gratuit et local."}
                </p>
              </div>
            </div>

            {entitlement && active && entitlement.currentPeriodEnd && (
              <p className="mt-2 text-[12px] text-muted">
                Renouvellement le{" "}
                {new Date(entitlement.currentPeriodEnd).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {entitlement.status === "past_due" ? " · paiement en retard" : ""}.
              </p>
            )}

            {entitlement && active && entitlement.status === "past_due" && (
              <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-accent-ink">
                <WarningCircle size={15} weight="duotone" className="mt-0.5 shrink-0" />
                Le dernier paiement a échoué. Les envois reprendront dès régularisation.
              </p>
            )}

            {!active && (
              <button
                type="button"
                onClick={subscribe}
                disabled={busy !== null}
                className="btn btn-primary mt-3 w-full disabled:opacity-50"
              >
                {busy === "checkout" ? "Ouverture du paiement…" : `S’abonner — ${CLOUD_PRICE.label}`}
              </button>
            )}

            <p className="mt-2 text-[11.5px] leading-[17px] text-muted">
              Le droit d’accès est écrit par le webhook Stripe, jamais par le
              navigateur : impossible de s’octroyer un abonnement en modifiant le
              code de la page.
            </p>
          </section>

          {/* ------------------------------------------------ synchro */}
          <section className="mt-3 rounded-big border border-line bg-surface p-4">
            <div className="flex items-start gap-2.5">
              <span className="tile h-9 w-9 shrink-0" aria-hidden>
                <CloudArrowUp size={18} weight="duotone" className="text-accent" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-[18px] font-semibold">Synchronisation</h2>
                <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
                  {localCount} élément{localCount > 1 ? "s" : ""} sur cet appareil ·{" "}
                  {syncedAt
                    ? `dernière synchro ${new Date(syncedAt).toLocaleString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "jamais synchronisé"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={runSync}
              disabled={busy !== null || !active}
              className="btn mt-3 w-full border border-line bg-bg disabled:opacity-50"
            >
              <ArrowClockwise
                size={16}
                weight="bold"
                className={cn("mr-1.5 inline", busy === "sync" && "animate-spin")}
              />
              {busy === "sync" ? "Synchronisation…" : active ? "Synchroniser maintenant" : "Abonnement requis"}
            </button>

            <label className="mt-3 flex items-start justify-between gap-3">
              <span>
                <span className="block text-[13.5px] font-semibold">
                  Synchroniser automatiquement
                </span>
                <span className="block text-[12px] leading-[17px] text-muted">
                  4 secondes après la dernière modification, si l’appareil est en ligne.
                </span>
              </span>
              <input
                type="checkbox"
                checked={auto}
                onChange={(event) => {
                  setAuto(event.target.checked);
                  setAutoSync(event.target.checked);
                }}
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
                aria-label="Synchronisation automatique"
              />
            </label>

            {last?.report && (
              <div className="mt-3 rounded-card bg-bg px-3 py-2.5 text-[12px] leading-[18px] text-muted">
                <span className="font-semibold text-ink">Dernier échange</span> ·{" "}
                {last.report.applied} reçu{last.report.applied > 1 ? "s" : ""} ·{" "}
                {last.report.pushed} envoyé{last.report.pushed > 1 ? "s" : ""} ·{" "}
                {last.report.deleted} supprimé{last.report.deleted > 1 ? "s" : ""}
                {last.report.conflicts.length > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-accent-ink">
                      {last.report.conflicts.length} conflit
                      {last.report.conflicts.length > 1 ? "s" : ""} résolu
                      {last.report.conflicts.length > 1 ? "s" : ""} en faveur du local
                    </span>
                  </>
                )}
              </div>
            )}
          </section>

          {/* ------------------------------------------------ appareils */}
          <section className="mt-3 rounded-big border border-line bg-surface p-4">
            <div className="flex items-start gap-2.5">
              <span className="tile h-9 w-9 shrink-0" aria-hidden>
                <DeviceMobile size={18} weight="duotone" className="text-accent" />
              </span>
              <div className="min-w-0">
                <h2 className="font-serif text-[18px] font-semibold">Appareils</h2>
                <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
                  {devices.length === 0
                    ? "Aucun appareil n’a encore synchronisé."
                    : `${devices.length} appareil${devices.length > 1 ? "s" : ""} rattaché${devices.length > 1 ? "s" : ""} à ce compte.`}
                </p>
              </div>
            </div>

            {devices.length > 0 && (
              <ul className="mt-3 divide-y divide-line">
                {devices.map((device) => (
                  <li key={device.deviceKey} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-[13px]">
                      {device.label ?? "Appareil"}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-muted">
                      {device.lastSyncAt
                        ? new Date(device.lastSyncAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------------------------ ce qui part */}
          <section className="mt-3 rounded-big border border-line bg-surface p-4">
            <div className="flex items-start gap-2.5">
              <span className="tile h-9 w-9 shrink-0" aria-hidden>
                <Info size={18} weight="duotone" className="text-muted" />
              </span>
              <div className="min-w-0">
                <h2 className="font-serif text-[18px] font-semibold">Ce qui est envoyé</h2>
                <div className="mt-1 text-[12.5px] leading-[18px] text-muted">
                  <p>
                    <span className="text-ink">Synchronisé :</span> projets, notes et
                    blocs, questions Cornell, liaisons, cartes et journal de révision,
                    coffres, fiches zettelkasten, canevas, progression des leçons.
                  </p>
                  <p className="mt-1.5">
                    <span className="text-ink">Non synchronisé :</span> apparence,
                    densité, réglages de révision, thème — ils restent propres à chaque
                    appareil, parce qu’un téléphone et un écran large n’ont pas les
                    mêmes contraintes.
                  </p>
                  <p className="mt-1.5">
                    <span className="text-ink">Jamais envoyé :</span> aucune analytics,
                    aucun contenu hors de votre compte. Les politiques RLS du serveur
                    limitent chaque ligne à son propriétaire.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------ zone sensible */}
          <section className="mt-3 rounded-big border border-line bg-surface p-4">
            <h2 className="font-serif text-[18px] font-semibold">Compte</h2>
            <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
              Connecté en tant que <span className="text-ink">{email}</span>.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={wipe}
                disabled={busy !== null}
                className="btn w-full border border-line bg-bg text-[13.5px] disabled:opacity-50"
              >
                <HardDrives size={16} weight="duotone" className="mr-1.5 inline" />
                {busy === "wipe" ? "Suppression…" : "Supprimer les données du cloud"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setEmail(null);
                  setEntitlement(null);
                  setDevices([]);
                  setLast(null);
                  showToast("Déconnecté. Vos notes locales sont intactes.", "accent");
                }}
                className="btn w-full border border-line bg-bg text-[13.5px]"
              >
                <SignOut size={16} weight="duotone" className="mr-1.5 inline" />
                Se déconnecter
              </button>
            </div>

            <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-[17px] text-muted">
              <LockKey size={13} weight="duotone" className="mt-0.5 shrink-0" />
              Se déconnecter ne supprime rien. Supprimer côté cloud ne touche pas au
              local : les deux opérations sont séparées exprès, pour qu’aucune ne
              détruise l’autre par accident.
            </p>
          </section>
        </>
      )}
    </Screen>
  );
}
