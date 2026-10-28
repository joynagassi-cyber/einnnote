import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  SearchHighlight,
  currentSearch,
  findMatches,
  focusMatch,
  replaceAll,
  replaceCurrent,
  setSearchQuery,
  stepMatch,
} from "@/lib/editor/search";

/**
 * Rechercher dans une note : on vérifie le comptage, le parcours circulaire,
 * le remplacement (qui reste une transaction, donc annulable) et le fait que
 * la recherche n’écrit **jamais** dans le document.
 */

let editor: Editor | null = null;

function mount(html: string) {
  editor = new Editor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
      }),
      SearchHighlight,
    ],
    content: html,
  });
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("recherche dans la note", () => {
  it("trouve toutes les occurrences, casse et accents respectés", () => {
    const instance = mount("<p>Le contrat et le Contrat</p><p>Un contrat de vente</p>");
    const matches = findMatches(instance.state.doc, "contrat");
    expect(matches).toHaveLength(3);
    expect(findMatches(instance.state.doc, "CONTRAT")).toHaveLength(3);
    expect(findMatches(instance.state.doc, "échéance")).toHaveLength(0);
  });

  it("ne traverse pas deux blocs", () => {
    const instance = mount("<p>fin du</p><p>contrat</p>");
    expect(findMatches(instance.state.doc, "du contrat")).toHaveLength(0);
  });

  it("ne modifie jamais le document", () => {
    const instance = mount("<p>Texte à chercher</p>");
    const before = instance.getHTML();
    setSearchQuery(instance, "chercher");
    focusMatch(instance, 0);
    expect(instance.getHTML()).toBe(before);
    expect(currentSearch(instance).query).toBe("chercher");
  });

  it("parcourt les occurrences circulairement", () => {
    const instance = mount("<p>mot mot mot</p>");
    setSearchQuery(instance, "mot");
    const first = focusMatch(instance, 0);
    expect(first?.index).toBe(0);
    expect(first?.total).toBe(3);
    expect(stepMatch(instance, 1)?.index).toBe(1);
    expect(stepMatch(instance, 1)?.index).toBe(2);
    expect(stepMatch(instance, 1)?.index).toBe(0);
    expect(stepMatch(instance, -1)?.index).toBe(2);
  });

  it("remplace l’occurrence courante, une transaction annulable", () => {
    const instance = mount("<p>un chat et un chat</p>");
    setSearchQuery(instance, "chat");
    focusMatch(instance, 0);
    replaceCurrent(instance, "chien");
    expect(instance.getText()).toBe("un chien et un chat");
    instance.commands.undo();
    expect(instance.getText()).toBe("un chat et un chat");
  });

  it("remplace toutes les occurrences d’un coup", () => {
    const instance = mount("<p>chat chat</p><p>chat</p>");
    setSearchQuery(instance, "chat");
    const count = replaceAll(instance, "chien");
    expect(count).toBe(3);
    expect(instance.getText().replace(/\s+/g, " ").trim()).toBe("chien chien chien");
  });

  it("ignore une requête vide", () => {
    const instance = mount("<p>Texte</p>");
    setSearchQuery(instance, "   ");
    expect(findMatches(instance.state.doc, "   ")).toHaveLength(0);
    expect(focusMatch(instance, 0)).toBeNull();
  });
});
