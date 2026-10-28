import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X } from "@phosphor-icons/react";
import { useAppStore } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { dueCards, reminderDue, reviewSettings } from "@/lib/scheduler";

/**
 * Rappel quotidien, **dans** l’application.
 *
 * Trois règles, pour qu’un rappel reste un service et pas une nuisance :
 * 1. il ne s’affiche que s’il reste des cartes dues ;
 * 2. il ne s’affiche qu’à partir de l’heure choisie (`reminderDue`) ;
 * 3. il se ferme pour la journée (clé datée dans `sessionStorage`) — et une
 *    notification système, si elle est autorisée, n’est émise qu’une fois.
 *
 * Limite assumée : sans service worker ni serveur, une page fermée ne peut
 * pas programmer de notification. Le rappel part donc à l’ouverture.
 */
export function ReviewReminder() {
  const navigate = useNavigate();
  const settings = reviewSettings(useAppStore((s) => s.settings.review));
  const cards = useContentStore((s) => s.cards);
  const due = dueCards(cards).length;

  const todayKey = useMemo(() => {
    const now = new Date();
    return `engram-review-reminder-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }, []);

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(todayKey) === "off";
  });

  const active = !dismissed && reminderDue(settings, due);

  useEffect(() => {
    if (!active || !settings.reminder.notifications) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const key = `${todayKey}-notified`;
    if (window.sessionStorage.getItem(key) === "1") return;
    try {
      new Notification("Engram — révision", {
        body: `${due} carte${due > 1 ? "s" : ""} vous attend${due > 1 ? "ent" : ""}.`,
        tag: "engram-review",
      });
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* Un navigateur peut refuser la notification malgré l’autorisation :
         le rappel dans l’interface, lui, fonctionne toujours. */
    }
  }, [active, due, settings.reminder.notifications, todayKey]);

  if (!active) return null;

  return (
    <section
      aria-label="Rappel de révision"
      className="mt-3 flex items-start gap-3 rounded-card border border-line bg-surface p-3.5"
    >
      <span className="tile h-9 w-9 shrink-0" aria-hidden>
        <Bell size={17} weight="duotone" className="text-accent" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">
          {due} carte{due > 1 ? "s" : ""} à revoir
        </p>
        <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
          C’est l’heure que vous avez choisie ({settings.reminder.time}). Dix
          minutes suffisent.
        </p>
        <button
          type="button"
          onClick={() => navigate("/review")}
          className="mt-2 h-9 rounded-rect bg-accent px-3 text-[13px] font-semibold text-on-accent"
        >
          Réviser
        </button>
      </div>
      <button
        type="button"
        aria-label="Masquer le rappel de révision"
        onClick={() => {
          setDismissed(true);
          try {
            window.sessionStorage.setItem(todayKey, "off");
          } catch {
            /* stockage indisponible : le rappel se réaffichera au prochain
               rendu, ce n’est pas bloquant. */
          }
        }}
        className="icon-btn -mr-1 -mt-1 h-8 w-8 shrink-0 text-muted"
      >
        <X size={16} weight="bold" />
      </button>
    </section>
  );
}
