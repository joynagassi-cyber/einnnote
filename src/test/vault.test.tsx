import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { demoContent } from "@/test/fixtures";
import { useAppStore, DEFAULT_SETTINGS } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import { useDisplayStore } from "@/stores/useDisplayStore";

/**
 * Le vault est **une catégorie**, pas une méthode.
 *
 * Ce fichier verrouille le modèle que l’écran doit raconter : un projet
 * (« Ordinateur quantique ») se découpe en vaults (« Superposition
 * quantique », « Intrication quantique »), et chaque vault range des notes.
 * Les fiches de révision existent toujours, mais elles ne définissent plus la
 * page : elles sont un second niveau.
 */

function open(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAppStore.setState({ settings: DEFAULT_SETTINGS });
  useDisplayStore.getState().resetAll();
  useContentStore.setState({ ...demoContent });
});

describe("Un vault se lit comme une catégorie", () => {
  it("montre le projet, la description, la date et les notes en premier", () => {
    open("/vault/v-superposition");

    expect(screen.getByRole("heading", { name: "Superposition quantique" })).toBeTruthy();
    expect(screen.getByText("Définition, expériences, paradoxes")).toBeTruthy();
    // la catégorie dit d’où elle vient
    expect(screen.getByRole("button", { name: /Ordinateur quantique/ })).toBeTruthy();
    expect(screen.getByText(/Créée le/)).toBeTruthy();
    // ses notes, pas des codes de fiches
    expect(screen.getByRole("heading", { name: /^Notes/ })).toBeTruthy();
    expect(screen.getByText("Superposition : définition")).toBeTruthy();
    expect(screen.getByText("L’expérience des deux fentes")).toBeTruthy();
    // et ses fiches, en second
    expect(screen.getByRole("heading", { name: /Fiches de révision/ })).toBeTruthy();
  });

  it("range chaque note dans son vault, et pas dans un autre", () => {
    open("/vault/v-intrication");
    expect(screen.getByText("Le paradoxe EPR")).toBeTruthy();
    expect(screen.queryByText("L’expérience des deux fentes")).toBeNull();
  });

  it("ouvre la note du vault dans son éditeur", async () => {
    const user = userEvent.setup();
    open("/vault/v-intrication");
    await user.click(screen.getByRole("button", { name: /Le paradoxe EPR/ }));
    await waitFor(() => expect(window.location.pathname).toBe("/note/n-epr"));
  });

  it("ne présente plus la page comme une méthode de graphe", () => {
    open("/vault/v-superposition");
    // le graphe reste accessible, en action secondaire
    expect(screen.getByRole("button", { name: /Graphe du vault/ })).toBeTruthy();
    // mais la page ne s’appelle plus « Vault · X » avec une pile de fiches
    expect(screen.queryByText(/Glissez la carte/)).toBeNull();
  });
});

describe("Créer un vault = créer une carte, rien de plus", () => {
  it("ne propose plus de modèle de graphe dans le formulaire", async () => {
    const user = userEvent.setup();
    open("/spaces/p-quantum");
    await user.click(screen.getByRole("button", { name: /Nouveau vault/ }));

    expect(screen.getAllByText(/Un vault est une/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Partir d’un modèle/)).toBeNull();
    expect(screen.queryByText(/Carte conceptuelle/)).toBeNull();
  });

  it("crée une catégorie vide et l’ouvre sur ses notes", async () => {
    const user = userEvent.setup();
    open("/spaces/p-quantum");
    await user.click(screen.getByRole("button", { name: /Nouveau vault/ }));
    await user.type(screen.getByLabelText("Nom de la catégorie"), "Décohérence");
    await user.click(screen.getByRole("button", { name: "Créer et ouvrir" }));

    const vault = useContentStore
      .getState()
      .vaults.find((entry) => entry.name === "Décohérence");
    expect(vault?.projectId).toBe("p-quantum");
    expect(vault?.createdAt).toBeTruthy();
    expect(
      useContentStore.getState().zettel.filter((card) => card.vaultId === vault?.id),
    ).toHaveLength(0);
    await waitFor(() => expect(window.location.pathname).toBe(`/vault/${vault?.id}`));
    expect(screen.getByText(/Aucune note dans cette catégorie/)).toBeTruthy();
  });

  it("affiche sur la carte du projet les compteurs de la catégorie", () => {
    open("/spaces/p-quantum");
    expect(screen.getByRole("button", { name: "Ouvrir le vault Superposition quantique" })).toBeTruthy();
    // deux notes dans « Superposition quantique », une dans « Intrication »
    expect(screen.getByText("2 notes")).toBeTruthy();
    expect(screen.getByText("1 note")).toBeTruthy();
  });

  it("écrit directement une note dans la catégorie depuis sa carte", async () => {
    const user = userEvent.setup();
    open("/spaces/p-quantum");
    await user.click(
      screen.getByRole("button", { name: "Écrire une note dans Intrication quantique" }),
    );
    await waitFor(() =>
      expect(window.location.pathname + window.location.search).toBe(
        "/new?vault=v-intrication",
      ),
    );
    expect(screen.getByText(/Nouvelle note dans le vault/)).toBeTruthy();
  });
});

describe("Une note créée dans un vault y naît rangée", () => {
  it("rattache la note au vault et au projet du vault", async () => {
    const user = userEvent.setup();
    open("/new?vault=v-intrication");

    await user.click(screen.getByRole("button", { name: /Cornell/ }));
    await user.click(screen.getByRole("button", { name: /Partir d’une page blanche/ }));

    const note = useContentStore
      .getState()
      .notes.find((entry) => entry.vaultId === "v-intrication" && entry.id !== "n-epr");
    expect(note).toBeTruthy();
    expect(note?.projectId).toBe("p-quantum");
    await waitFor(() => expect(window.location.pathname).toBe(`/note/${note?.id}`));
  });

  it("laisse l’éditeur ranger une note libre dans une catégorie", async () => {
    const user = userEvent.setup();
    open("/note/n-plan");

    await user.click(screen.getByRole("button", { name: "Options de la note" }));
    await user.selectOptions(screen.getByLabelText(/Vault/), "v-eco");

    expect(
      useContentStore.getState().notes.find((note) => note.id === "n-plan")?.vaultId,
    ).toBe("v-eco");
  });
});

describe("Les fiches de révision gardent leur adresse", () => {
  it("sert la pile de fiches sur /vault/:id/fiches", () => {
    open("/vault/v-eco/fiches");
    expect(screen.getByText(/Glissez la carte/)).toBeTruthy();
  });

  it("redirige l’ancienne adresse /zettel/:id vers les fiches", async () => {
    open("/zettel/v-eco");
    await waitFor(() => expect(window.location.pathname).toBe("/vault/v-eco/fiches"));
  });
});
