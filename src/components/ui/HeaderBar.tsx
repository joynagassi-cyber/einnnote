import { cn } from "@/lib/utils";

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function HeaderBar({ title, subtitle, action, className }: HeaderBarProps) {
  return (
    <div className={cn("flex items-center justify-between mb-6", className)}>
      <div>
        <h1 className="font-literata text-2xl font-bold text-[var(--ink)]">{title}</h1>
        {subtitle && <p className="font-inter text-sm text-[var(--muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
