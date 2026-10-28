import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CloudSettingsPage from "@/pages/CloudSettings";

/**
 * L’état par défaut, celui que voit la majorité des utilisateurs : aucune
 * variable d’environnement, donc aucun backend. L’écran doit expliquer quoi
 * faire sans promettre un service qui n’existe pas.
 */
describe("Réglages cloud — installation sans backend", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("annonce l’absence de serveur au lieu d’afficher un faux état", async () => {
    /* Un `.env.local` peut exister sur la machine de développement : ce cas
       décrit une installation nue, on la reconstitue donc explicitement. */
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    render(
      <MemoryRouter>
        <CloudSettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Aucun serveur associé")).toBeDefined();
    expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeDefined();
    // Aucun bouton de paiement tant qu’il n’y a pas de backend : on ne vend
    // pas une fonction qui ne peut pas fonctionner.
    await waitFor(() => {
      expect(screen.queryByText(/S’abonner/)).toBeNull();
    });
  });

  it("propose la connexion dès qu’un backend est configuré", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://demo-test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "cle-publique-de-demo");

    render(
      <MemoryRouter>
        <CloudSettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Se connecter")).toBeDefined();
    expect(screen.getByPlaceholderText("vous@exemple.com")).toBeDefined();
    expect(screen.queryByText("Aucun serveur associé")).toBeNull();
    // Pas encore connecté : on ne vend rien.
    expect(screen.queryByText(/S’abonner/)).toBeNull();
  });

  it("rappelle que le local reste gratuit", () => {
    render(
      <MemoryRouter>
        <CloudSettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Optionnel et payant/)).toBeDefined();
  });
});
