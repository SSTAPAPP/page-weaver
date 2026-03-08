import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="打开导航菜单">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <AppSidebar forceExpanded onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
              <span className="text-xs font-black text-background" style={{ fontFamily: 'Lora, serif' }}>F</span>
            </div>
            <span className="font-bold text-foreground text-sm tracking-tight">FFk</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="container py-4 px-4">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container py-6">{children}</div>
      </main>
    </div>
  );
}
