import { ReactNode, useState } from "react";
import { UpdateChecker } from "@/components/UpdateChecker";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Calendar,
  Scissors,
  BarChart3,
  FileText,
  Settings,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";

interface MainLayoutProps {
  children: ReactNode;
}

// 移动端底部导航项 - 核心4个
const bottomNavItems = [
  { title: "首页", url: "/", icon: LayoutDashboard },
  { title: "收银", url: "/cashier", icon: ShoppingCart },
  { title: "会员", url: "/members", icon: Users },
  { title: "预约", url: "/appointments", icon: Calendar },
];

// 更多菜单项
const moreMenuItems = [
  { title: "服务管理", url: "/services", icon: Scissors },
  { title: "数据报表", url: "/reports", icon: BarChart3 },
  { title: "交易流水", url: "/transactions", icon: FileText },
  { title: "系统设置", url: "/settings", icon: Settings },
];

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  // 检查当前页面是否在更多菜单中
  const isInMoreMenu = moreMenuItems.some(item => item.url === location.pathname);

  // 移动端布局 - 底部导航栏
  if (isMobile) {
    return (
      <div className="flex h-[100dvh] w-full flex-col bg-background">
        {/* Mobile top bar - 极简 */}
        <header className="shrink-0 flex h-11 items-center justify-between border-b border-border bg-background px-4 safe-area-inset-top">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground">
              <span className="text-[10px] font-black text-background" style={{ fontFamily: 'Lora, serif' }}>F</span>
            </div>
            <span className="font-semibold text-foreground text-xs tracking-tight" style={{ fontFamily: 'Lora, serif' }}>FFk</span>
          </div>
          {/* 当前页面标题 */}
          <span className="text-xs font-medium text-muted-foreground">
            {[...bottomNavItems, ...moreMenuItems].find(item => item.url === location.pathname)?.title || ''}
          </span>
        </header>

        {/* 内容区域 - 可滚动 */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="px-3 py-3">{children}</div>
        </main>

        {/* 底部导航栏 - 专业设计 */}
        <nav className="shrink-0 border-t border-border bg-background pb-safe">
          <div className="grid grid-cols-5 h-[52px]">
            {bottomNavItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 transition-colors duration-100",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground/60 active:text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-10 h-6 rounded-full transition-colors",
                    isActive && "bg-foreground/10"
                  )}>
                    <item.icon className={cn("h-[18px] w-[18px]", isActive && "stroke-[2.5]")} />
                  </div>
                  <span className={cn(
                    "text-[10px] leading-none",
                    isActive ? "font-semibold" : "font-medium"
                  )}>
                    {item.title}
                  </span>
                </NavLink>
              );
            })}

            {/* 更多按钮 */}
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-colors duration-100",
                isInMoreMenu
                  ? "text-foreground"
                  : "text-muted-foreground/60 active:text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-6 rounded-full transition-colors",
                isInMoreMenu && "bg-foreground/10"
              )}>
                {/* 四宫格图标 */}
                <svg className={cn("h-[18px] w-[18px]", isInMoreMenu && "stroke-[2.5]")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <span className={cn(
                "text-[10px] leading-none",
                isInMoreMenu ? "font-semibold" : "font-medium"
              )}>
                更多
              </span>
            </button>
          </div>
        </nav>

        {/* 更多菜单弹窗 */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-2xl p-0">
            <div className="p-4 pb-safe">
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
              <div className="grid grid-cols-4 gap-3">
                {moreMenuItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <button
                      key={item.url}
                      onClick={() => {
                        setMoreOpen(false);
                        navigate(item.url);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                        isActive 
                          ? "bg-foreground/10 text-foreground" 
                          : "text-muted-foreground hover:bg-muted active:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-11 h-11 rounded-xl",
                        isActive ? "bg-foreground text-background" : "bg-muted"
                      )}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className={cn(
                        "text-xs",
                        isActive ? "font-semibold" : "font-medium"
                      )}>
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
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
