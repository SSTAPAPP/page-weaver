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
          <div key={location.pathname} className="px-5 py-5 pb-24 page-enter">
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
          "transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        <AppSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </aside>

      <main
        className={cn(
          "flex-1 overflow-auto",
          "transition-[margin] duration-[var(--duration-slow)] ease-[var(--ease-out)]",
          collapsed ? "ml-[60px]" : "ml-[220px]"
        )}
      >
        <div key={location.pathname} className="mx-auto max-w-5xl px-8 py-8 page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
