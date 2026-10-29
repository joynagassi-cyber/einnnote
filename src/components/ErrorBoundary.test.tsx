import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Bomb(): React.ReactElement {
  throw new Error("boum");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React journalise l’erreur attrapée : on garde la sortie lisible.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("affiche un écran de secours au lieu d’une page blanche", () => {
    render(
      <ErrorBoundary route="/test">
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Cet écran n’a pas pu s’afficher")).toBeTruthy();
    expect(screen.getByText("boum")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });

  it("garde une trace locale de l’erreur", () => {
    render(
      <ErrorBoundary route="/note/n1">
        <Bomb />
      </ErrorBoundary>,
    );
    const trace = JSON.parse(sessionStorage.getItem("engram.lastError") ?? "{}");
    expect(trace.route).toBe("/note/n1");
    expect(trace.message).toBe("boum");
  });

  it("propose de réessayer et signale l’essai au parent", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <ErrorBoundary route="/test" onReset={onReset}>
        <Bomb />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onReset).toHaveBeenCalledTimes(1);

    /* La cause est toujours là : la frontière ne ment pas, elle réaffiche
       l’écran de secours au lieu d’un écran blanc. */
    expect(screen.getByText("Cet écran n’a pas pu s’afficher")).toBeTruthy();
  });

  it("ramène à la bibliothèque sans perdre les données", () => {
    render(
      <ErrorBoundary route="/test">
        <Bomb />
      </ErrorBoundary>,
    );
    const link = screen.getByRole("link", { name: /Retour à la bibliothèque/ });
    expect(link.getAttribute("href")).toBe("/");
  });
});
