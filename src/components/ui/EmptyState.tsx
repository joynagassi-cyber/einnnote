import { Icon, IconProps } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: Icon | React.ElementType<IconProps>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--accent-soft))] flex items-center justify-center mb-4">
          <Icon weight="fill" className="w-8 h-8 text-[hsl(var(--accent))]" />
        </div>
      )}
      <h3 className="font-literata text-xl font-semibold text-[var(--ink)] mb-2">{title}</h3>
      <p className="font-inter text-[var(--muted)] text-sm max-w-xs mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--accent))] text-white font-inter text-sm font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
