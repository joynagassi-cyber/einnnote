import { useNavigate, useLocation } from "react-router-dom";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

type IconComponent = ComponentType<{ weight?: string; className?: string; [key: string]: any }>;

interface NavItemProps {
  to: string;
  icon: IconComponent;
  label: string;
  badge?: number;
  isActive?: boolean;
}

export function NavItem({ to, icon: Icon, label, badge, isActive }: NavItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useAppStore();

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-inter transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2",
        isActive
          ? "bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent))]"
          : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon weight={isActive ? "fill" : "regular"} className="w-5 h-5 flex-shrink-0" />
      <span className="font-inter">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-inter font-semibold",
            isActive
              ? "bg-[hsl(var(--accent))] text-white"
              : "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
