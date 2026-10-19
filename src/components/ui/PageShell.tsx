import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

export function PageShell({ children, className, padding = "px-4 sm:px-6 lg:px-8" }: PageShellProps) {
  return (
    <main className={cn("min-h-screen pb-24 md:pb-8", padding, className)}>
      <div className="max-w-3xl mx-auto">{children}</div>
    </main>
  );
}
