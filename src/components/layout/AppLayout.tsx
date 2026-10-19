import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  ClockCounterClockwise,
  Gear,
  GraduationCap,
  House,
  NotePencil,
  ArrowLeft,
} from "@phosphor-icons/react";
import { useReviewStore } from "@/stores/useReviewStore";
import { useNoteStore } from "@/stores/useNoteStore";
import { NavItem } from "./NavItem";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
  const location = useLocation();
  const dueToday = useReviewStore((s) => s.getDueToday().length);

  const navItems = [
    { to: "/", icon: House, label: "Accueil" },
    { to: "/library", icon: BookOpen, label: "Bibliothèque" },
    { to: "/new", icon: NotePencil, label: "Nouvelle" },
    { to: "/review", icon: ClockCounterClockwise, label: "Réviser", badge: dueToday },
    { to: "/learn", icon: GraduationCap, label: "Apprendre" },
    { to: "/settings/appearance", icon: Gear, label: "Apparence" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[240px] flex-shrink-0 h-screen sticky top-0 border-r border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--line)]">
        <div className="w-8 h-8 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center">
          <span className="text-white font-literata font-bold text-lg leading-none">É</span>
        </div>
        <span className="font-literata text-lg font-semibold text-[var(--ink)]">Einnote</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            isActive={location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))}
          />
        ))}
      </nav>

      <div className="px-3 pb-4">
        <Link
          to="/library"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[hsl(var(--accent))] text-white font-inter text-sm font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
        >
          <NotePencil weight="fill" className="w-4 h-4" />
          Nouvelle note
        </Link>
      </div>
    </aside>
  );
}

export function AppLayoutMobile() {
  const location = useLocation();
  const dueToday = useReviewStore((s) => s.getDueToday().length);

  const items = [
    { to: "/library", icon: BookOpen, label: "Biblio" },
    { to: "/review", icon: ClockCounterClockwise, label: dueToday > 0 ? `${dueToday}` : "Réviser", badge: dueToday },
    { to: "/new", icon: NotePencil, label: "+", isPrimary: true },
    { to: "/learn", icon: GraduationCap, label: "Apprendre" },
    { to: "/settings/appearance", icon: Gear, label: "Réglages" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--line)] px-2 pb-safe z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          if (item.isPrimary) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center w-12 h-12 -mt-5"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-150",
                  "bg-[hsl(var(--accent))] text-white"
                )}>
                  <item.icon weight="fill" className="w-6 h-6" />
                </div>
              </Link>
            );
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors",
                isActive ? "text-[hsl(var(--accent))]" : "text-[var(--muted)]"
              )}
            >
              <div className="relative">
                <item.icon weight={isActive ? "fill" : "regular"} className="w-6 h-6" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[hsl(var(--accent))] text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-inter font-medium">{typeof item.label === "number" ? `${item.label}` : item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
