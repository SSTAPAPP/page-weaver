import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 移动端布局
  if (isMobile) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col bg-background">
        {/* Mobile top bar - 安全区适配 */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 safe-area-inset-top">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 -ml-2" aria-label="打开导航菜单">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0">
              <AppSidebar forceExpanded onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <span className="text-sm font-black text-background" style={{ fontFamily: 'Lora, serif' }}>F</span>
            </div>
            <span className="font-bold text-foreground text-base tracking-tight" style={{ fontFamily: 'Lora, serif' }}>FFk</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="px-4 py-4 pb-safe">{children}</div>
        </main>
      </div>
    );
  }

  // 平板布局 - 默认折叠侧边栏
  if (isTablet) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar defaultCollapsed />
        <main className="flex-1 overflow-auto">
          <div className="container py-5 px-5">{children}</div>
        </main>
      </div>
    );
  }

  // 桌面布局
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container py-6 px-6">{children}</div>
      </main>
    </div>
  );
}
