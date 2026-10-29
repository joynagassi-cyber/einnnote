import { describe, expect, it } from "vitest";
import {
  backlinksTo,
  linksInText,
  normalizeTitle,
  outgoingFrom,
  resolveLink,
} from "@/lib/links/notes";

const notes = [
  { id: "n1", title: "Contrats et validité" },
  { id: "n2", title: "Responsabilité civile" },
  { id: "n3", title: "  Contrats  et   Validité " },
];

describe("liens de notes", () => {
  it("extrait les titres cités, sans doublon ni casse", () => {
    const text = "Voir [[Contrats et validité]] et [[Responsabilité civile]], puis [[contrats et validité]].";
    expect(linksInText(text)).toEqual(["Contrats et validité", "Responsabilité civile"]);
  });

  it("ignore ce qui n’est pas un lien", () => {
    expect(linksInText("[[]]")).toEqual([]);
    expect(linksInText("[[a\nb]]")).toEqual([]);
    expect(linksInText("[ [pas un lien] ]")).toEqual([]);
    expect(linksInText("`[[code]]`")).toEqual(["code"]);
  });

  it("compare les titres sans se soucier des espaces ni de la casse", () => {
    expect(normalizeTitle("  ConTRats   et validité ")).toBe("contrats et validité");
  });

  it("résout un titre vers la note, accents et espaces compris", () => {
    expect(resolveLink("contrats  ET validité", notes)?.id).toBe("n1");
    expect(resolveLink("Note absente", notes)).toBeUndefined();
  });

  it("trouve les rétro-liens avec leur passage", () => {
    const sources = [
      { note: { id: "n2", title: "Responsabilité civile" }, text: "Au fond, voir [[Contrats et validité]] pour le détail." },
      { note: { id: "n9", title: "Sans rapport" }, text: "Rien ici." },
      { note: { id: "n1", title: "Contrats et validité" }, text: "[[Contrats et validité]]" },
    ];
    const back = backlinksTo({ id: "n1", title: "Contrats et validité" }, sources);
    expect(back).toHaveLength(1);
    expect(back[0].from.id).toBe("n2");
    expect(back[0].excerpt).toContain("Contrats et validité");
  });

  it("liste les liens sortants, et signale les morts", () => {
    const out = outgoingFrom("[[Contrats et validité]] [[Disparue]]", notes);
    expect(out[0].note?.id).toBe("n1");
    expect(out[1].note).toBeUndefined();
  });
});
