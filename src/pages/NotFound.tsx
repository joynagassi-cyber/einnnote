import { useNavigate } from "react-router-dom";
import { Screen } from "@/components/Layout";
import { Compass } from "@phosphor-icons/react";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Screen className="px-5">
      <div className="flex flex-1 flex-col items-center justify-center pb-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-accent-soft text-accent">
          <Compass size={28} weight="duotone" />
        </div>
        <h1 className="font-serif text-[24px] font-semibold">Page introuvable</h1>
        <p className="mt-2 max-w-[32ch] text-[15px] leading-[22px] text-muted">
          Cette adresse ne correspond à aucun écran. Rien n’a été perdu.
        </p>
        <button type="button" className="btn-primary mt-6" onClick={() => navigate("/")}>
          Retour à la bibliothèque
        </button>
      </div>
    </Screen>
  );
}
