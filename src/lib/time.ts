/** Formatage relatif en français, sans dépendance. */
export function timeAgo(isoDate: string, now = Date.now()): string {
  const then = new Date(isoDate).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.round(diff / 60_000);
  if (minutes < 2) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 31) {
    const weeks = Math.round(days / 7);
    return `il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  }
  const months = Math.round(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  const years = Math.round(months / 12);
  return `il y a ${years} an${years > 1 ? "s" : ""}`;
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}
