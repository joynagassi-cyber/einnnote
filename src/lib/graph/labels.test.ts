import { describe, expect, it } from "vitest";
import { demoZettel as seedZettel } from "@/test/fixtures";
import type { ZettelCard } from "@/types";
import { citationIndex, linkLabel, relationCounts } from "@/lib/graph/labels";
import { zettelGraph } from "@/lib/graph/zettel";

const card = (code: string, refs: string[] = []): ZettelCard => ({
  id: `id-${code}`,
  code,
  vaultId: "v",
  title: code,
  body: "",
  source: "",
  refs,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("étiquettes de relation", () => {
  it("distingue cite, cité par, réciproque et simple lien", () => {
    const cards = [card("#1A", ["#1B"]), card("#1B", []), card("#1C", ["#1A"]), card("#1D")];
    expect(linkLabel(cards, "#1A", "#1B").label).toBe("cite");
    expect(linkLabel(cards, "#1B", "#1A").label).toBe("cité par");
    expect(linkLabel(cards, "#1A", "#1C").label).toBe("cité par");
    expect(linkLabel(cards, "#1D", "#1A").label).toBe("lié");
  });

  it("marque une citation réciproque des deux côtés", () => {
    const cards = [card("#1A", ["#1B"]), card("#1B", ["#1A"])];
    expect(linkLabel(cards, "#1A", "#1B").relation).toBe("reciproque");
    expect(linkLabel(cards, "#1B", "#1A").relation).toBe("reciproque");
    expect(citationIndex(cards).size).toBe(1);
  });

  it("ne prétend jamais qu’un lien de structure est une citation", () => {
    const cards = [card("#1A"), card("#1B")];
    expect(linkLabel(cards, "#1A", "#1B").relation).toBe("lie");
  });

  it("ignore les codes absents et les auto-références", () => {
    const cards = [card("#1A", ["#1A", "#9Z"])];
    expect(citationIndex(cards).size).toBe(0);
    expect(linkLabel(cards, "#1A", "#9Z").relation).toBe("lie");
  });

  it("compte les relations du vault de démonstration", () => {
    const counts = relationCounts(zettelGraph(seedZettel), seedZettel);
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(zettelGraph(seedZettel).links.length);
    expect(counts.cite + counts["cite-par"]).toBeGreaterThan(0);
  });
});
