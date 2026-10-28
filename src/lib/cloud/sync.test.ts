import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useContentStore } from "@/stores/useContentStore";

/**
 * Test d’orchestration, pas de fusion : la fusion est déjà couverte par
 * `merge.test.ts`. Ici on vérifie **l’ordre des opérations** et les décisions
 * qui ne se voient qu’au niveau du moteur :
 *
 * - appliquer le local **avant** de pousser (un refus serveur ne doit rien
 *   casser) ;
 * - envoyer une tombe quand une entité a disparu depuis la dernière synchro ;
 * - traduire `subscription required` en refus explicite, jamais en silence ;
 * - persister `known` pour pouvoir détecter la suppression suivante.
 */

const harness = vi.hoisted(() => ({
  client: null as unknown,
  calls: [] as { name: string; args: Record<string, unknown> }[],
  handlers: {} as Record<string, (args: Record<string, unknown>) => unknown>,
}));

vi.mock("@/lib/cloud/client", () => ({
  getSupabase: async () => harness.client,
  resetSupabaseClient: () => undefined,
}));

const { syncNow } = await import("@/lib/cloud/sync");

const CONFIGURED = () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://demo-test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "cle-publique-de-demo");
};

const NOTE = (id: string, title: string, updatedAt: string) => ({
  id,
  projectId: "p1",
  method: "cornell" as const,
  title,
  collection: "Droit",
  blocks: [],
  status: "captured" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt,
});

function useNotes(notes: ReturnType<typeof NOTE>[]) {
  useContentStore.getState().replaceAll({
    projects: [{ id: "p1", name: "Projet", createdAt: "2026-01-01T00:00:00.000Z" }],
    notes,
    questions: [],
    links: [],
    cards: [],
    logs: [],
    vaults: [],
    zettel: [],
    mindmaps: [],
    progress: [],
  });
}

/** Réponse serveur d’une ligne d’entité. */
const row = (
  collection: string,
  entityId: string,
  payload: Record<string, unknown>,
  stamp: number,
  deleted = false,
) => ({
  collection,
  entity_id: entityId,
  payload,
  stamp,
  deleted,
  updated_at: new Date(stamp).toISOString(),
});

beforeEach(() => {
  window.localStorage.clear();
  harness.calls = [];
  harness.handlers = { pull_entities: () => [] };
  harness.client = {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    rpc: async (name: string, args: Record<string, unknown>) => {
      harness.calls.push({ name, args });
      const handler = harness.handlers[name];
      if (!handler) return { data: null, error: null };
      const result = handler(args);
      if (result && typeof result === "object" && "error" in result) {
        return result as { error: { message: string } };
      }
      return { data: result, error: null };
    },
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const pushed = () =>
  harness.calls
    .filter((call) => call.name === "push_entities")
    .flatMap((call) => call.args.rows as Record<string, unknown>[]);

describe("sans backend", () => {
  it("le dit, et ne tente aucun appel", async () => {
    const result = await syncNow();
    expect(result.reason).toBe("not-configured");
    expect(harness.calls).toHaveLength(0);
  });
});

describe("avec backend, sans session", () => {
  it("demande de se connecter plutôt que d’échouer", async () => {
    CONFIGURED();
    harness.client = {
      ...(harness.client as object),
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    };

    const result = await syncNow();
    expect(result.reason).toBe("not-signed-in");
    expect(harness.calls).toHaveLength(0);
  });
});

describe("première synchronisation", () => {
  it("envoie le contenu local et mémorise ce qui a été vu", async () => {
    CONFIGURED();
    harness.handlers.push_entities = (args) => ({
      accepted: (args.rows as unknown[]).length,
      skipped: 0,
    });
    useNotes([NOTE("n1", "Une", "2026-02-01T00:00:00.000Z")]);

    const result = await syncNow();

    expect(result.ok).toBe(true);
    const notes = pushed().filter((row) => row.collection === "notes");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ entity_id: "n1", deleted: false, stamp: Date.parse("2026-02-01T00:00:00.000Z") });

    const state = JSON.parse(window.localStorage.getItem("engram.cloud.state.v1")!);
    expect(state.known.notes).toEqual(["n1"]);
    expect(state.lastSyncAt).toBeTypeOf("string");
  });
});

describe("le serveur a plus récent", () => {
  it("applique la version distante au local", async () => {
    CONFIGURED();
    useNotes([NOTE("n1", "Locale", "2026-02-01T00:00:00.000Z")]);
    harness.handlers.pull_entities = () => [
      row("notes", "n1", NOTE("n1", "Distante", "2026-03-01T00:00:00.000Z"), Date.parse("2026-03-01T00:00:00.000Z")),
    ];

    const result = await syncNow();

    expect(result.ok).toBe(true);
    expect(useContentStore.getState().notes[0].title).toBe("Distante");
    // Rien à envoyer : le local était plus ancien.
    expect(pushed().filter((row) => row.collection === "notes")).toHaveLength(0);
  });
});

describe("tombes", () => {
  it("applique une suppression venue d’ailleurs", async () => {
    CONFIGURED();
    useNotes([NOTE("n1", "À supprimer", "2026-02-01T00:00:00.000Z")]);
    window.localStorage.setItem(
      "engram.cloud.state.v1",
      JSON.stringify({
        userId: "u1",
        lastSyncAt: "2026-02-02T00:00:00.000Z",
        tombstones: [],
        known: { notes: ["n1"] },
      }),
    );
    harness.handlers.pull_entities = () => [
      row("notes", "n1", {}, Date.parse("2026-03-01T00:00:00.000Z"), true),
    ];

    const result = await syncNow();

    expect(result.ok).toBe(true);
    expect(useContentStore.getState().notes).toHaveLength(0);
    expect(result.report?.deleted).toBe(1);
  });

  it("propage une suppression locale au serveur", async () => {
    CONFIGURED();
    /* La note était connue à la synchro précédente… */
    window.localStorage.setItem(
      "engram.cloud.state.v1",
      JSON.stringify({
        userId: "u1",
        lastSyncAt: "2026-02-02T00:00:00.000Z",
        tombstones: [],
        known: { notes: ["n1", "n2"] },
      }),
    );
    /* …et n2 a disparu du store : personne ne l’a « annoncé ». */
    useNotes([NOTE("n1", "Reste", "2026-02-01T00:00:00.000Z")]);
    harness.handlers.pull_entities = () => [
      row("notes", "n1", NOTE("n1", "Reste", "2026-02-01T00:00:00.000Z"), Date.parse("2026-02-01T00:00:00.000Z")),
      row("notes", "n2", NOTE("n2", "Partie", "2026-02-01T00:00:00.000Z"), Date.parse("2026-02-01T00:00:00.000Z")),
    ];

    await syncNow();

    const stones = pushed().filter((row) => row.deleted === true);
    expect(stones).toHaveLength(1);
    expect(stones[0]).toMatchObject({ collection: "notes", entity_id: "n2", deleted: true });
  });
});

describe("refus de paiement", () => {
  it("fusionne quand même le local, puis explique", async () => {
    CONFIGURED();
    useNotes([NOTE("n1", "Locale", "2026-02-01T00:00:00.000Z")]);
    harness.handlers.pull_entities = () => [
      row("notes", "n2", NOTE("n2", "Distante", "2026-03-01T00:00:00.000Z"), Date.parse("2026-03-01T00:00:00.000Z")),
    ];
    harness.handlers.push_entities = () => ({
      error: { message: "subscription required", code: "42501" },
    });

    const result = await syncNow();

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("payment-required");
    // Le contenu distant est déjà appliqué : rien n’est perdu côté local.
    const titles = useContentStore.getState().notes.map((note) => note.title).sort();
    expect(titles).toEqual(["Distante", "Locale"]);
  });
});

describe("erreur serveur", () => {
  it("signale un schéma absent au lieu d’un échec muet", async () => {
    CONFIGURED();
    harness.handlers.pull_entities = () => ({
      error: { message: "function public.pull_entities(bigint) does not exist" },
    });

    const result = await syncNow();

    expect(result.ok).toBe(false);
    expect(result.message).toContain("0001_cloud_sync.sql");
  });
});
