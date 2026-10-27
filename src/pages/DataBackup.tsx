import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  DownloadSimple,
  FileText,
  LockKey,
  ShieldCheck,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { AppBar, Screen, Sheet } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { StorageMeter } from "@/components/StorageGuard";
import { useStorageUsage } from "@/lib/useStorage";
import { buildMarkdown, buildMarkdownTree, type MarkdownScope } from "@/lib/markdown";
import { buildZip } from "@/lib/zip";
import { contentStamp } from "@/lib/storage";
import { useToast } from "@/stores/useToast";
import {
  decryptBackup,
  downloadBlob,
  downloadFile,
  encryptBackup,
  readFileAsText,
  type BackupEnvelope,
} from "@/lib/backup";
import { formatDate } from "@/lib/time";

interface Report {
  notes: number;
  cards: number;
  zettel: number;
  lessons: number;
  date: string;
}

export default function DataBackup() {
  const navigate = useNavigate();
  const toast = useToast((s) => s.show);
  const exportPayload = useContentStore((s) => s.exportPayload);
  const replaceAll = useContentStore((s) => s.replaceAll);
  const projects = useContentStore((s) => s.projects);
  const vaults = useContentStore((s) => s.vaults);
  const markBackup = useAppStore((s) => s.markBackup);
  const lastBackupAt = useAppStore((s) => s.settings.lastBackupAt);
  const notesCount = useContentStore((s) => s.notes.length);
  const usage = useStorageUsage(notesCount);
  const [mdScope, setMdScope] = useState("library");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [file, setFile] = useState<{ name: string; envelope: BackupEnvelope } | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const exportEncrypted = async () => {
    if (password.length < 8) {
      toast("Mot de passe : 8 caractères minimum");
      return;
    }
    if (password !== confirm) {
      toast("Les deux mots de passe diffèrent");
      return;
    }
    setBusy(true);
    try {
      const envelope = await encryptBackup(exportPayload(), password);
      downloadFile(
        `engram-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(envelope, null, 2),
      );
      markBackup();
      toast("Sauvegarde chiffrée téléchargée", "accent");
      setPassword("");
      setConfirm("");
    } catch {
      toast("La sauvegarde a échoué");
    } finally {
      setBusy(false);
    }
  };

  const exportReadable = () => {
    downloadFile(
      `engram-lisible-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(exportPayload(), null, 2),
    );
    markBackup();
    toast("Export lisible téléchargé", "accent");
  };

  /* Markdown : lisible par Obsidian, Logseq, GitHub, sans outil Engram */
  const exportMarkdown = () => {
    const store = useContentStore.getState();
    const scope: MarkdownScope =
      mdScope === "library"
        ? { kind: "library" }
        : mdScope.startsWith("vault:")
          ? { kind: "vault", vaultId: mdScope.slice("vault:".length) }
          : { kind: "project", projectId: mdScope.slice("project:".length) };
    const tree = buildMarkdownTree(store as never, scope);
    if (!tree.files.length) {
      toast("Rien à exporter dans ce périmètre");
      return;
    }
    /* Un fichier par note et par fiche, rangé en dossiers : le ZIP est le seul
       format qu’un navigateur peut produire et que le système ouvre d’un
       double-clic. */
    const zip = buildZip(
      tree.files.map((file) => ({
        path: `${tree.root}/${file.path}`,
        content: file.content,
      })),
    );
    downloadBlob(`${tree.root}.zip`, new Blob([zip as BlobPart], { type: "application/zip" }));
    markBackup(undefined, contentStamp(store));
    toast(
      `Markdown : ${tree.notes} note${tree.notes > 1 ? "s" : ""}, ${tree.cards} fiche${tree.cards > 1 ? "s" : ""} · ${tree.files.length} fichiers`,
      "accent",
    );
  };

  /* Le fichier unique reste utile : on l’envoie par courriel, on le colle dans
     un billet. L’arborescence, elle, est faite pour être ouverte dans un
     gestionnaire de notes. Les deux ont leur geste. */
  const exportMarkdownFlat = () => {
    const store = useContentStore.getState();
    const scope: MarkdownScope =
      mdScope === "library"
        ? { kind: "library" }
        : mdScope.startsWith("vault:")
          ? { kind: "vault", vaultId: mdScope.slice("vault:".length) }
          : { kind: "project", projectId: mdScope.slice("project:".length) };
    const bundle = buildMarkdown(store as never, scope);
    if (!bundle.content) {
      toast("Rien à exporter dans ce périmètre");
      return;
    }
    downloadFile(bundle.filename, bundle.content, "text/markdown");
    markBackup(undefined, contentStamp(store));
    toast(`Markdown : ${bundle.notes} notes, ${bundle.cards} fiches`, "accent");
  };

  const pickFile = async (chosen?: File) => {
    if (!chosen) return;
    try {
      const text = await readFileAsText(chosen);
      const envelope = JSON.parse(text) as BackupEnvelope;
      if (envelope.format !== "engram.backup") {
        toast("Ce fichier n’est pas une sauvegarde Engram");
        return;
      }
      setFile({ name: chosen.name, envelope });
      setRestoreOpen(true);
    } catch {
      toast("Fichier illisible");
    }
  };

  const restore = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const payload = await decryptBackup(file.envelope, restorePassword);
      const counts = replaceAll(payload);
      setReport({
        ...counts,
        date: file.envelope.createdAt ?? new Date().toISOString(),
      });
      setRestoreOpen(false);
      setRestorePassword("");
      setFile(null);
      toast("Sauvegarde restaurée", "accent");
    } catch {
      toast("Mot de passe incorrect ou fichier abîmé");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar back onBack={() => navigate("/settings")} title="Données" center={false} />

      <p className="mt-1 text-[14px] leading-[21px] text-muted">
        La sauvegarde est un fichier que vous gardez. Elle est chiffrée par un
        mot de passe que vous seul connaissez : sans lui, le fichier est
        illisible, et nous ne pouvons pas le récupérer.
      </p>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Occupation du stockage
      </h2>
      <div className="rounded-card border border-line bg-surface p-4">
        <StorageMeter usage={usage} />
        <p className="mt-3 text-[13px] leading-[19px] text-muted">
          Le navigateur accorde environ 5 Mo à cette application. À 80 %, on
          vous prévient ; au-delà, une écriture peut échouer sans prévenir.
        </p>
      </div>

      <p className="mt-2 text-[13px] text-muted">
        {lastBackupAt
          ? `Dernière sauvegarde : ${formatDate(lastBackupAt)}`
          : "Aucune sauvegarde enregistrée pour l’instant."}
      </p>

      {report && (
        <section className="mt-4 rounded-card border border-accent bg-accent-soft p-4">
          <div className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-accent-ink">
            <CheckCircle size={18} weight="fill" />
            Restauration terminée
          </div>
          <p className="text-[14px] leading-[21px] text-accent-ink">
            {report.notes} notes, {report.cards} cartes, {report.zettel} cartes
            Zettelkasten, {report.lessons} leçons terminées. Sauvegarde du{" "}
            {formatDate(report.date)}.
          </p>
        </section>
      )}

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Créer une sauvegarde
      </h2>
      <div className="rounded-card border border-line bg-surface p-4">
        <label htmlFor="backup-password" className="mb-1.5 block text-[14px] text-muted">
          Mot de passe (8 caractères minimum)
        </label>
        <input
          id="backup-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          className="field h-12"
        />
        <label htmlFor="backup-confirm" className="mb-1.5 mt-3 block text-[14px] text-muted">
          Confirmer le mot de passe
        </label>
        <input
          id="backup-confirm"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          className="field h-12"
        />
        <button
          type="button"
          onClick={exportEncrypted}
          disabled={busy}
          className="btn-primary mt-4 w-full"
        >
          <LockKey size={18} weight="bold" />
          Exporter (chiffré)
        </button>
        <button type="button" onClick={exportReadable} className="btn-secondary mt-2 w-full">
          <DownloadSimple size={18} />
          Exporter en JSON lisible
        </button>
        <p className="mt-2.5 flex items-start gap-1.5 text-[13px] leading-[19px] text-muted">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent" />
          AES-GCM 256 bits, clé dérivée par PBKDF2-SHA256 (210 000 tours).
        </p>
      </div>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Exporter en Markdown
      </h2>
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="text-[14px] leading-[21px] text-muted">
          Une archive <code className="font-mono text-[13px]">.zip</code> :{" "}
          <strong className="font-semibold text-ink">un fichier par note</strong>{" "}
          (nommé de son titre), rangé par projet puis par coffre, avec un index.
          Les liens entre fiches deviennent des liens wiki{" "}
          <code className="font-mono text-[13px]">[[…]]</code> : on ouvre le
          dossier dans Obsidian, Logseq ou GitHub, et tout reste cliquable.
        </p>
        <label htmlFor="md-scope" className="mb-1.5 mt-3 block text-[14px] text-muted">
          Périmètre
        </label>
        <select
          id="md-scope"
          value={mdScope}
          onChange={(event) => setMdScope(event.target.value)}
          className="field h-12 appearance-none"
        >
          <option value="library">Toute la bibliothèque</option>
          {projects.map((project) => (
            <option key={project.id} value={`project:${project.id}`}>
              Projet — {project.name}
            </option>
          ))}
          {vaults.map((vault) => (
            <option key={vault.id} value={`vault:${vault.id}`}>
              Coffre — {vault.name}
            </option>
          ))}
        </select>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={exportMarkdown} className="btn-secondary flex-1">
            <FileText size={18} />
            Arborescence (.zip)
          </button>
          <button type="button" onClick={exportMarkdownFlat} className="btn-secondary flex-1">
            <FileText size={18} />
            Fichier unique (.md)
          </button>
        </div>
      </div>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">Restaurer</h2>
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="text-[14px] leading-[21px] text-muted">
          Choisissez un fichier de sauvegarde. Rien n’est écrasé avant la
          vérification du mot de passe.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => pickFile(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="btn-secondary mt-3 w-full"
        >
          <UploadSimple size={18} />
          Choisir un fichier
        </button>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-card border border-line bg-surface-2 p-3 text-[13px] leading-[19px] text-muted">
        <WarningCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Aucune récupération en ligne n’existe. Si le mot de passe est perdu, la
        sauvegarde reste chiffrée pour toujours.
      </p>

      <div className="h-10" aria-hidden="true" />

      <Sheet
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        title="Restaurer la sauvegarde"
      >
        {file && (
          <>
            <p className="mb-3 break-all text-[14px] text-muted">{file.name}</p>
            <div className="mb-3 rounded-card bg-surface-2 p-3 text-[14px] leading-[21px]">
              <div className="flex justify-between">
                <span className="text-muted">Créée le</span>
                <span className="font-medium">{formatDate(file.envelope.createdAt)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted">Chiffrement</span>
                <span className="font-medium">{file.envelope.cipher}</span>
              </div>
            </div>
            <label htmlFor="restore-password" className="mb-1.5 block text-[14px] text-muted">
              Mot de passe de la sauvegarde
            </label>
            <input
              id="restore-password"
              type="password"
              value={restorePassword}
              onChange={(event) => setRestorePassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              className="field h-12"
            />
            <p className="mt-2 text-[13px] leading-[19px] text-muted">
              La restauration remplace les notes et les cartes présentes sur cet
              appareil.
            </p>
            <button
              type="button"
              className="btn-primary mt-4 w-full"
              disabled={busy || restorePassword.length === 0}
              onClick={restore}
            >
              {busy ? "Vérification…" : "Restaurer"}
            </button>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
