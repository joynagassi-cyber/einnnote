/**
 * Écriture d’une archive ZIP sans dépendance.
 *
 * Pourquoi c’est ici : l’export Markdown doit produire **une arborescence de
 * fichiers** (un fichier par note, rangé par catégorie, par projet, par coffre),
 * et un navigateur ne sait pas écrire un dossier. Le seul format que tous les
 * systèmes ouvrent d’un double-clic est le ZIP ; ajouter `jszip` (~100 ko) pour
 * poser des fichiers tels quels serait payer une bibliothèque de compression
 * dont on n’a pas besoin.
 *
 * On écrit donc une archive **en méthode 0 (stored)** : les octets sont
 * recopiés, aucune compression. Un export Markdown fait quelques centaines de
 * kilo-octets ; le gagner en temps de calcul vaut mieux que le perdre en
 * dépendance. La structure (en-têtes locaux + répertoire central) est celle de
 * la spécification PKWARE, et le CRC-32 est vérifié par test.
 */

/** Table du CRC-32 (polynôme 0xEDB88320), calculée une fois. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** chemin dans l’archive, séparateur « / » */
  path: string;
  content: string;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

/** Date et heure au format MS-DOS (deux mots de 16 bits). */
function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    (Math.floor(date.getHours()) << 11) |
    (Math.floor(date.getMinutes()) << 5) |
    Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, date: day };
}

/**
 * Construit l’archive. Les entrées sont écrites dans l’ordre donné ; les
 * chemins utilisent « / » et les dossiers n’ont pas besoin d’entrée propre
 * (les décompresseurs les créent à la demande), mais on en ajoute une pour
 * que l’arborescence soit visible dans les outils qui n’affichent que les
 * entrées.
 */
export function buildZip(entries: ZipEntry[], now = new Date()): Uint8Array {
  const { time, date } = dosDateTime(now);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = utf8(entry.path);
    const data = utf8(entry.content);
    const checksum = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); // signature
    localView.setUint16(4, 20, true); // version requise
    localView.setUint16(6, 0x0800, true); // noms en UTF-8
    localView.setUint16(8, 0, true); // méthode 0 : stored
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);

    locals.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true); // signature du répertoire
    centralView.setUint16(4, 20, true); // version d’écriture
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true); // attributs externes
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length + data.length;
  }

  const centralSize = centrals.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  const chunks = [...locals, ...centrals, end];
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const zip = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    zip.set(chunk, cursor);
    cursor += chunk.length;
  }
  return zip;
}
