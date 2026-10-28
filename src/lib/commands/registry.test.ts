import { describe, expect, it } from "vitest";
import {
  COMMANDS,
  GROUPS,
  commandById,
  isAvailable,
  knownIds,
  normalize,
  searchCommands,
  sortedCommands,
} from "@/lib/commands/registry";
import { EMPTY_SNAPSHOT } from "@/lib/editor/snapshot";
import { readRecent, pushRecent, clearRecent } from "@/lib/commands/recent";

describe("registre de commandes", () => {
  it("n’a aucun identifiant en double", () => {
    const ids = COMMANDS.map((command) => command.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("range chaque commande dans un groupe connu", () => {
    for (const command of COMMANDS) {
      expect(GROUPS).toContain(command.group as (typeof GROUPS)[number]);
    }
  });

  it("donne à chaque commande un libellé, une icône et un exécutant", () => {
    for (const command of COMMANDS) {
      expect(command.label.length).toBeGreaterThan(2);
      expect(typeof command.run).toBe("function");
      expect(command.icon).toBeTruthy();
    }
  });

  it("ne laisse une commande indisponible que si elle explique pourquoi", () => {
    for (const command of COMMANDS) {
      if (command.available) {
        expect(command.unavailable, `${command.id} doit dire pourquoi`).toBeTruthy();
      }
    }
  });

  it("ignore un identifiant retiré du registre", () => {
    expect(knownIds(["bold", "commande-disparue", "undo"])).toEqual(["bold", "undo"]);
    expect(commandById("commande-disparue")).toBeUndefined();
  });

  it("trie par groupe puis par libellé", () => {
    const groups = sortedCommands().map((command) => command.group);
    const rank = groups.map((group) => GROUPS.indexOf(group as (typeof GROUPS)[number]));
    expect(rank).toEqual([...rank].sort((a, b) => a - b));
  });

  it("cherche sans accent ni casse", () => {
    expect(searchCommands("surlign").map((command) => command.id)).toContain("highlight-jaune");
    expect(searchCommands("ENTETE").map((command) => command.id)).toContain("h1");
    expect(searchCommands("introuvable-xyz")).toHaveLength(0);
    expect(normalize("Éphémère")).toBe("ephemere");
  });

  it("garde plusieurs mots comme un « et »", () => {
    const ids = searchCommands("liste puces").map((command) => command.id);
    expect(ids).toContain("bullet");
    expect(ids).not.toContain("italic");
  });

  it("désactive ce qui ne s’applique pas, avec une raison", () => {
    const checked = commandById("checked");
    expect(checked).toBeTruthy();
    expect(isAvailable(checked!, EMPTY_SNAPSHOT)).toBe(false);

    const outdent = commandById("outdent");
    expect(isAvailable(outdent!, EMPTY_SNAPSHOT)).toBe(false);
    expect(isAvailable(outdent!, { ...EMPTY_SNAPSHOT, indent: 2 })).toBe(true);

    const indent = commandById("indent");
    expect(isAvailable(indent!, { ...EMPTY_SNAPSHOT, indent: 3 })).toBe(false);
  });

  it("ne désactive jamais une commande sans condition", () => {
    const bold = commandById("bold")!;
    expect(isAvailable(bold, EMPTY_SNAPSHOT)).toBe(true);
  });
});

describe("commandes récentes", () => {
  it("garde les cinq dernières, la plus récente d’abord, sans doublon", () => {
    clearRecent();
    ["bold", "italic", "undo", "redo", "code", "bold"].forEach(pushRecent);
    const recent = readRecent();
    expect(recent).toHaveLength(5);
    expect(recent[0]).toBe("bold");
    expect(recent.filter((id) => id === "bold")).toHaveLength(1);
  });

  it("oublie une commande qui n’existe plus", () => {
    clearRecent();
    window.localStorage.setItem(
      "engram.commands.recent.v1",
      JSON.stringify(["disparue", "italic"]),
    );
    expect(readRecent()).toEqual(["italic"]);
  });

  it("survit à un stockage corrompu", () => {
    window.localStorage.setItem("engram.commands.recent.v1", "{pas du json");
    expect(readRecent()).toEqual([]);
  });
});
