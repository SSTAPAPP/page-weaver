import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = 'ffk-sidebar-collapsed';

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Fixed Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen z-50 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}>
        <AppSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </aside>

      {/* Main content with margin to account for fixed sidebar */}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300",
        collapsed ? "ml-16" : "ml-60"
      )}>
        <div key={location.pathname} className="container py-6 page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
