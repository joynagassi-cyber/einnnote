import { useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  FileArrowDown,
  FileArrowUp,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { GraphStyle } from "@/lib/graph/styles";
import {
  downloadJson,
  downloadSvg,
  graphToDocument,
  graphToSvg,
  parseGraphDocument,
  type ExportInput,
  type GraphDocument,
} from "@/lib/graph/export";

/**
 * Affichage et échange d’un graphe.
 *
 * Trois réglages et trois gestes. Les réglages sont **d’affichage seulement** :
 * couper les étiquettes n’efface aucune citation, couper les renvois n’efface
 * aucun lien — l’export suit les mêmes réglages, donc ce qu’on voit est ce
 * qu’on emporte.
 *
 * L’import est volontairement strict : `parseGraphDocument` refuse un fichier
 * qui n’est pas un export Einnote ou qui pointe vers une fiche absente, et on
 * affiche la raison. Le modèle VisualFlow (`Flow_renderer_test`) faisait
 * `JSON.parse` puis `concat` : un fichier étranger cassait le canevas.
 */

export interface GraphDisplay {
  labels: boolean;
  echoes: boolean;
  animate: boolean;
}

interface Props {
  input: ExportInput;
  style: GraphStyle;
  display: GraphDisplay;
  onDisplay: (patch: Partial<GraphDisplay>) => void;
  onImport: (document: GraphDocument) => void;
}

function Row({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className="flex w-full items-start gap-3 rounded-field border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-line-strong active:bg-surface-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold">{label}</span>
          <span className="mt-0.5 block text-[12.5px] leading-[17px] text-muted">
            {hint}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border px-[2px] transition-colors",
            checked ? "border-accent bg-accent" : "border-line-strong bg-surface-2",
          )}
        >
          <span
            className={cn(
              "h-4 w-4 rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,.18)] transition-transform",
              checked ? "translate-x-[16px]" : "translate-x-0",
            )}
          />
        </span>
      </button>
    </li>
  );
}

export function GraphExchange({ input, style, display, onDisplay, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [verdict, setVerdict] = useState<
    { kind: "ok"; document: GraphDocument } | { kind: "error"; reason: string } | null
  >(null);

  const name = `graphe-${input.vault.name}`;

  const readFile = async (file: File) => {
    const parsed = parseGraphDocument(await file.text());
    if (parsed.ok) {
      setVerdict({ kind: "ok", document: parsed.document });
    } else {
      setVerdict({ kind: "error", reason: parsed.reason });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Affichage
        </h3>
        <ul className="flex flex-col gap-1.5">
          <Row
            label="Étiquettes de relation"
            hint="Écrit sur le lien pourquoi il existe : cite, cité par, réciproque, ou simple lien d’arbre."
            checked={display.labels}
            onChange={() => onDisplay({ labels: !display.labels })}
          />
          <Row
            label="Renvois"
            hint="Les liens hors arbre, en pointillés fins. Les couper clarifie la structure ; les fiches restent."
            checked={display.echoes}
            onChange={() => onDisplay({ echoes: !display.echoes })}
          />
          <Row
            label="Animation du courant"
            hint="Un flux parcourt les pointillés et les renvois. Coupé automatiquement si le mouvement est réduit."
            checked={display.animate}
            onChange={() => onDisplay({ animate: !display.animate })}
          />
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Emporter
        </h3>
        <p className="mb-2.5 text-[12.5px] leading-[18px] text-muted">
          Le fichier SVG est dessiné par les mêmes fonctions que l’écran : il
          contient les cartes, les liens et les étiquettes visibles. Le JSON
          garde le contenu des fiches et peut être réimporté ici.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-secondary h-11 gap-1.5 rounded-field text-[14px]"
            onClick={() => downloadSvg(`${name}-clair`, graphToSvg(input, { ...display, mode: "light" }))}
          >
            <FileArrowDown size={17} aria-hidden />
            SVG clair
          </button>
          <button
            type="button"
            className="btn-secondary h-11 gap-1.5 rounded-field text-[14px]"
            onClick={() => downloadSvg(`${name}-sombre`, graphToSvg(input, { ...display, mode: "dark" }))}
          >
            <FileArrowDown size={17} aria-hidden />
            SVG sombre
          </button>
        </div>
        <button
          type="button"
          className="btn-secondary mt-2 h-11 w-full gap-1.5 rounded-field text-[14px]"
          onClick={() => downloadJson(name, graphToDocument(input))}
        >
          <FileArrowDown size={17} aria-hidden />
          JSON du graphe · {input.cards.length} fiches · style {style.label}
        </button>
      </section>

      <section>
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">
          Reprendre un fichier
        </h3>
        <p className="mb-2.5 text-[12.5px] leading-[18px] text-muted">
          Un JSON exporté depuis Einnote devient un nouveau vault, avec ses
          codes et ses renvois. Tout autre fichier est refusé avec la raison.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn-secondary h-11 w-full gap-1.5 rounded-field text-[14px]"
          onClick={() => fileRef.current?.click()}
        >
          <FileArrowUp size={17} aria-hidden />
          Choisir un fichier JSON
        </button>

        {verdict?.kind === "error" && (
          <p
            role="alert"
            className="mt-2.5 flex items-start gap-2 rounded-field border border-line bg-surface-2 px-3 py-2 text-[12.5px] leading-[18px]"
          >
            <WarningCircle size={16} className="mt-px shrink-0 text-accent" aria-hidden />
            <span>
              <span className="font-semibold">Fichier refusé.</span> {verdict.reason}
            </span>
          </p>
        )}

        {verdict?.kind === "ok" && (
          <div className="mt-2.5 rounded-field border border-accent bg-accent-soft px-3 py-2.5">
            <p className="flex items-start gap-2 text-[12.5px] leading-[18px]">
              <Check size={16} className="mt-px shrink-0 text-accent" aria-hidden />
              <span>
                <span className="font-semibold">Fichier valide.</span>{" "}
                {verdict.document.cards.length} fiche
                {verdict.document.cards.length > 1 ? "s" : ""} ·{" "}
                {(verdict.document.treeLinks ?? []).length} liens d’arbre ·{" "}
                {(verdict.document.echoes ?? []).length} renvois
              </span>
            </p>
            <button
              type="button"
              className="btn-primary mt-2.5 h-10 w-full gap-1.5 rounded-field text-[14px]"
              onClick={() => onImport(verdict.document)}
            >
              <ArrowDown size={16} aria-hidden />
              En faire un vault
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
