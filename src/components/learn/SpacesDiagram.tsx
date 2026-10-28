/**
 * Le schéma qui explique l’app en un regard : **un projet, plusieurs coffres,
 * plusieurs notes**.
 *
 * Il n’est pas décoratif. C’est la seule figure que la page Apprendre doit
 * faire passer, parce que c’est la seule erreur de rangement possible dans
 * l’app : croire qu’un coffre est un dossier d’écriture, ou qu’une note est
 * déjà une fiche. Le schéma montre les deux niveaux ensemble — les notes du
 * projet (à plat) et les fiches rangées par coffre — avec leurs nombres réels,
 * pour que la leçon se lise sur ses propres données et non sur un exemple.
 *
 * Aucune image, aucune icône décorative : des cadres, des nombres, un trait de
 * liaison. Il tient à 320 px comme à 1200 px.
 */
export function SpacesDiagram({
  projectName,
  noteCount,
  vaults,
}: {
  projectName: string;
  noteCount: number;
  vaults: { id: string; name: string; cardCount: number }[];
}) {
  return (
    <div className="rounded-card border border-line-strong bg-bg p-3">
      {/* Le projet : le cadre qui contient tout le reste. */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
          Projet
        </span>
        <span className="truncate font-serif text-[14px] font-semibold">{projectName}</span>
      </div>

      <div className="mt-2 border-l border-line-strong pl-2.5">
        {/* Niveau 1 : les notes du projet, qui n’ont pas besoin de coffre. */}
        <div className="flex items-center gap-1.5 rounded-field border border-line bg-surface px-2 py-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[12.5px]">Notes du projet</span>
          <span className="tabnum shrink-0 text-[11.5px] font-semibold text-muted">
            {noteCount}
          </span>
        </div>

        {/* Niveau 2 : les coffres, chacun avec ses fiches. */}
        <p className="mt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
          Coffres · {vaults.length}
        </p>
        <ul className="mt-1 flex flex-col gap-1">
          {vaults.slice(0, 3).map((vault) => (
            <li
              key={vault.id}
              className="rounded-field border border-line bg-surface px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-accent" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                  {vault.name}
                </span>
                <span className="tabnum shrink-0 text-[11.5px] text-muted">
                  {vault.cardCount} fiche{vault.cardCount > 1 ? "s" : ""}
                </span>
              </div>
              {/* Les fiches du coffre, suggérées : une bande, pas une liste. */}
              <div className="mt-1 flex gap-1" aria-hidden>
                {Array.from({ length: Math.min(vault.cardCount, 6) }).map((_, index) => (
                  <span
                    key={index}
                    className="h-2 flex-1 rounded-[2px] bg-accent/25"
                  />
                ))}
                {vault.cardCount === 0 && (
                  <span className="text-[11px] text-muted">coffre vide — prêt pour la première fiche</span>
                )}
              </div>
            </li>
          ))}
          {vaults.length === 0 && (
            <li className="rounded-field border border-dashed border-line-strong px-2 py-1.5 text-[11.5px] text-muted">
              Aucun coffre : vos notes vivent à plat dans le projet. Un coffre
              s’ajoute dès que deux fiches doivent se citer.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
