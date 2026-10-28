import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { changeCase, currentBlockText, todayLabel } from "@/lib/editor/transform";

/**
 * Changer la casse : le passage change de forme, **jamais** de mise en forme.
 * On vérifie les quatre modes, la conservation des marques, et le fait qu’une
 * sélection vide ne touche à rien.
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
      Highlight.configure({ multicolor: true }),
    ],
    content: html,
  });
  return editor;
}

const selectAll = (instance: Editor) =>
  instance.commands.setTextSelection({
    from: 1,
    to: instance.state.doc.content.size - 1,
  });

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("casse du texte", () => {
  it("met en majuscules et en minuscules", () => {
    const instance = mount("<p>Bonjour le monde</p>");
    selectAll(instance);
    changeCase(instance, "upper");
    expect(instance.getText()).toBe("BONJOUR LE MONDE");
    selectAll(instance);
    changeCase(instance, "lower");
    expect(instance.getText()).toBe("bonjour le monde");
  });

  it("remet une capitale en tête de phrase", () => {
    const instance = mount("<p>BONJOUR LE MONDE</p>");
    selectAll(instance);
    changeCase(instance, "sentence");
    expect(instance.getText()).toBe("Bonjour le monde");
  });

  it("capitalise chaque mot", () => {
    const instance = mount("<p>un contrat  de vente</p>");
    selectAll(instance);
    changeCase(instance, "capitalize");
    expect(instance.getText()).toBe("Un Contrat De Vente");
  });

  it("conserve les marques du passage transformé", () => {
    const instance = mount("<p><strong>mot</strong> simple</p>");
    selectAll(instance);
    changeCase(instance, "upper");
    expect(instance.getHTML()).toContain("<strong>MOT</strong>");
  });

  it("ne fait rien sur une sélection vide", () => {
    const instance = mount("<p>Texte</p>");
    instance.commands.setTextSelection(2);
    expect(changeCase(instance, "upper")).toBe(false);
    expect(instance.getText()).toBe("Texte");
  });

  it("extrait le texte du bloc courant pour le copier", () => {
    const instance = mount("<p>Premier</p><p>Deuxième bloc</p>");
    instance.commands.setTextSelection(12);
    expect(currentBlockText(instance)).toBe("Deuxième bloc");
  });

  it("écrit la date du jour en français, jamais au format machine", () => {
    expect(todayLabel(new Date(2026, 9, 28))).toBe("28 octobre 2026");
  });
});
