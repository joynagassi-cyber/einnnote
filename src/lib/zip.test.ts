import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "@/lib/zip";

/**
 * Un ZIP faux ne se voit pas : il s’ouvre à moitié, ou pas du tout, chez
 * l’utilisateur. On vérifie donc la structure binaire elle-même (signatures,
 * offsets, répertoire central) et pas seulement « ça produit des octets ».
 */

const u16 = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer).getUint16(at, true);
const u32 = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer).getUint32(at, true);
const latin = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("CRC-32", () => {
  it("retombe sur les valeurs de référence", () => {
    // valeurs publiées par la spécification (test vector classique)
    expect(crc32(new TextEncoder().encode(""))).toBe(0);
    expect(crc32(new TextEncoder().encode("a"))).toBe(0xe8b7be43);
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("change dès qu’un octet change", () => {
    expect(crc32(new TextEncoder().encode("note"))).not.toBe(
      crc32(new TextEncoder().encode("Note")),
    );
  });
});

describe("archive ZIP", () => {
  const files = [
    { path: "Engram/Notes/Thèse/Plan.md", content: "# Plan\n\nContenu accentué : éàü\n" },
    { path: "Engram/Vaults/Thèse/Économie/#1A - Inflation.md", content: "corps" },
  ];

  it("écrit un en-tête local par fichier, avec la bonne taille", () => {
    const zip = buildZip(files);
    expect(u32(zip, 0)).toBe(0x04034b50);
    const nameLength = u16(zip, 26);
    const name = latin(zip.slice(30, 30 + nameLength));
    expect(name).toBe(files[0].path);
    expect(u32(zip, 18)).toBe(new TextEncoder().encode(files[0].content).length);
    // le contenu suit immédiatement le nom
    const start = 30 + nameLength;
    expect(latin(zip.slice(start, start + 8))).toBe("# Plan\n\n");
  });

  it("ferme l’archive par un répertoire central cohérent", () => {
    const zip = buildZip(files);
    const endAt = zip.length - 22;
    expect(u32(zip, endAt)).toBe(0x06054b50);
    expect(u16(zip, endAt + 8)).toBe(files.length);
    expect(u16(zip, endAt + 10)).toBe(files.length);

    const centralOffset = u32(zip, endAt + 16);
    expect(u32(zip, centralOffset)).toBe(0x02014b50);
    // l’offset enregistré pointe bien sur l’en-tête local du premier fichier
    const firstLocal = u32(zip, centralOffset + 42);
    expect(u32(zip, firstLocal)).toBe(0x04034b50);
    expect(u32(zip, endAt + 12)).toBe(endAt - centralOffset);
  });

  it("accepte un fichier vide et une archive vide", () => {
    const zip = buildZip([{ path: "vide.md", content: "" }]);
    expect(u32(zip, 0)).toBe(0x04034b50);
    expect(buildZip([]).length).toBe(22);
  });

  it("marque les noms comme UTF-8 (accents et « # » lisibles)", () => {
    const zip = buildZip(files);
    // bit 11 du drapeau général : noms encodés en UTF-8
    expect(u16(zip, 6) & 0x0800).toBe(0x0800);
  });
});
