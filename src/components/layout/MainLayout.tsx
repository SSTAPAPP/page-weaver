import { ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";

interface MainLayoutProps {
  children: ReactNode;
}

// 移动端底部导航项
const bottomNavItems = [
  { title: "首页", url: "/", icon: LayoutDashboard },
  { title: "收银", url: "/cashier", icon: ShoppingCart },
  { title: "会员", url: "/members", icon: Users },
  { title: "预约", url: "/appointments", icon: Calendar },
];

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // 移动端布局 - 底部导航栏
  if (isMobile) {
    return (
      <div className="flex h-[100dvh] w-full flex-col bg-background">
        {/* Mobile top bar - 简化版 */}
        <header className="shrink-0 flex h-12 items-center justify-center border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 safe-area-inset-top">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
              <span className="text-xs font-black text-background" style={{ fontFamily: 'Lora, serif' }}>F</span>
            </div>
            <span className="font-bold text-foreground text-sm tracking-tight" style={{ fontFamily: 'Lora, serif' }}>FFk</span>
          </div>
        </header>

        {/* 内容区域 - 可滚动 */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="px-4 py-4">{children}</div>
        </main>

        {/* 底部导航栏 */}
        <nav className="shrink-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-safe">
          <div className="flex items-stretch h-14">
            {bottomNavItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 min-h-[44px]",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground active:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-foreground" : "text-muted-foreground/70"
                    )}
                  />
                  <span className={cn(
                    "text-[10px] font-medium",
                    isActive && "font-semibold"
                  )}>
                    {item.title}
                  </span>
                </NavLink>
              );
            })}

            {/* 更多按钮 - 打开侧边栏 */}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 min-h-[44px]",
                    moreOpen
                      ? "text-foreground"
                      : "text-muted-foreground active:text-foreground"
                  )}
                >
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground/70" />
                  <span className="text-[10px] font-medium">更多</span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] max-w-[85vw] p-0">
                <AppSidebar forceExpanded onNavigate={() => setMoreOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </nav>
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
