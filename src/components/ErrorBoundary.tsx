import { Component, type ErrorInfo, type ReactNode } from "react";
import { ArrowClockwise, ArrowLeft, WarningDiamond } from "@phosphor-icons/react";

/**
 * Un écran qui plante ne doit pas emporter l’application entière : chaque
 * route est enveloppée, la navigation et les données restent accessibles.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void; route?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Journal local : utile pour diagnostiquer sans serveur.
    console.error("[Engram] écran en erreur", this.props.route, error, info);
    try {
      sessionStorage.setItem(
        "engram.lastError",
        JSON.stringify({
          at: new Date().toISOString(),
          route: this.props.route,
          message: error.message,
          stack: error.stack?.slice(0, 2000),
        }),
      );
    } catch {
      /* stockage plein ou bloqué : on n’ajoute pas de panne */
    }
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="screen items-center justify-center px-6 text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger"
          aria-hidden
        >
          <WarningDiamond size={28} weight="duotone" />
        </span>
        <h1 className="mt-4 font-serif text-[22px] font-semibold">
          Cet écran n’a pas pu s’afficher
        </h1>
        <p className="mt-2 max-w-[38ch] text-[15px] leading-[22px] text-muted">
          Vos notes sont intactes : elles restent dans le stockage de
          l’appareil. Vous pouvez réessayer, ou revenir à la bibliothèque.
        </p>
        <p className="mt-2 max-w-[38ch] break-words text-[12.5px] text-muted">
          {error.message}
        </p>
        <div className="mt-5 flex w-full max-w-[320px] flex-col gap-2">
          <button type="button" className="btn-primary" onClick={this.reset}>
            <ArrowClockwise size={18} weight="bold" />
            Réessayer
          </button>
          <a href="/" className="btn-secondary">
            <ArrowLeft size={18} />
            Retour à la bibliothèque
          </a>
        </div>
      </div>
    );
  }
}
