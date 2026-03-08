import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Calendar,
  Scissors,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { title: "仪表盘", url: "/", icon: LayoutDashboard },
  { title: "收银台", url: "/cashier", icon: ShoppingCart },
  { title: "会员管理", url: "/members", icon: Users },
  { title: "预约管理", url: "/appointments", icon: Calendar },
  { title: "服务管理", url: "/services", icon: Scissors },
  { title: "数据报表", url: "/reports", icon: BarChart3 },
  { title: "交易流水", url: "/transactions", icon: FileText },
];

const settingsItem = { title: "系统设置", url: "/settings", icon: Settings };

interface AppSidebarProps {
  forceExpanded?: boolean;
  onNavigate?: () => void;
}

export function AppSidebar({ forceExpanded, onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isCollapsed = forceExpanded ? false : collapsed;

  const NavItem = ({
    item,
  }: {
    item: {
      title: string;
      url: string;
      icon: React.ComponentType<{ className?: string }>;
    };
  }) => {
    const isActive = location.pathname === item.url;

    const content = (
      <NavLink
        to={item.url}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg min-h-[44px] text-[15px] font-semibold tracking-wide transition-colors duration-150",
          isCollapsed ? "justify-center w-10 h-10 mx-auto" : "px-3 py-2",
          isActive
            ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
        )}
      >
        <item.icon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            isActive
              ? "text-sidebar-foreground"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
          )}
        />
        {!isCollapsed && <span className="truncate">{item.title}</span>}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={8}
            className="text-xs font-medium"
          >
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-muted transition-[width] duration-200 relative select-none",
          isCollapsed ? "w-[60px]" : "w-52"
        )}
      >
        {/* Brand + collapse toggle */}
        <div
          className={cn(
            "flex items-center shrink-0",
            isCollapsed ? "justify-center h-16 px-2" : "justify-between h-16 px-4"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground shrink-0 shadow-sm">
              <span
                className="text-base font-black text-background"
                style={{ fontFamily: "Lora, serif" }}
              >
                F
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-[15px] leading-tight tracking-tight">
                  FFk
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Management System
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && !forceExpanded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              aria-label="折叠导航栏"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Expand toggle when collapsed */}
        {isCollapsed && !forceExpanded && (
          <div className="flex justify-center pt-1 pb-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              aria-label="展开导航栏"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto",
            isCollapsed ? "px-1.5 py-2" : "px-3 py-2"
          )}
          aria-label="主导航"
        >
          <div
            className={cn(
              "space-y-0.5",
              isCollapsed && "flex flex-col items-center"
            )}
          >
            {navItems.map((item) => (
              <NavItem key={item.url} item={item} />
            ))}
          </div>
        </nav>

        {/* Bottom settings */}
        <div
          className={cn(
            "shrink-0 pb-3",
            isCollapsed ? "px-1.5" : "px-3"
          )}
        >
          <div
            className={cn(
              "space-y-0.5",
              isCollapsed && "flex flex-col items-center"
            )}
          >
            <NavItem item={settingsItem} />
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
