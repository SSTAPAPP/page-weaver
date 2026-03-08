import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { MobileMenuSheet } from "./MobileMenuSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "ffk-sidebar-collapsed";

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === "true";
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <main className="flex-1 overflow-auto">
          <div key={location.pathname} className="px-4 py-4 pb-20 page-enter">
            {children}
          </div>
        </main>
        <MobileNav onOpenMenu={() => setMenuOpen(true)} />
        <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen z-50",
          "transition-[width] duration-300 ease-[var(--ease-out)]",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <AppSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </aside>

      <main
        className={cn(
          "flex-1 overflow-auto",
          "transition-[margin] duration-300 ease-[var(--ease-out)]",
          collapsed ? "ml-14" : "ml-56"
        )}
      >
        <div key={location.pathname} className="mx-auto max-w-5xl px-6 py-6 page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
