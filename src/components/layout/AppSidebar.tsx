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
  ChevronLeft,
  ChevronRight,
  Settings,
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

const navGroups = [
  {
    label: "工作台",
    items: [
      { title: "仪表盘", url: "/", icon: LayoutDashboard },
      { title: "收银台", url: "/cashier", icon: ShoppingCart },
    ],
  },
  {
    label: "业务管理",
    items: [
      { title: "会员管理", url: "/members", icon: Users },
      { title: "预约管理", url: "/appointments", icon: Calendar },
      { title: "服务管理", url: "/services", icon: Scissors },
    ],
  },
  {
    label: "数据与分析",
    items: [
      { title: "数据报表", url: "/reports", icon: BarChart3 },
      { title: "交易流水", url: "/transactions", icon: FileText },
    ],
  },
];

const settingsItem = { title: "设置", url: "/settings", icon: Settings };

interface AppSidebarProps {
  forceExpanded?: boolean;
  onNavigate?: () => void;
}

export function AppSidebar({ forceExpanded, onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isCollapsed = forceExpanded ? false : collapsed;

  const NavItem = ({ item }: { item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> } }) => {
    const isActive = location.pathname === item.url;

    const content = (
      <NavLink
        to={item.url}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-[13px] font-medium transition-colors duration-150",
          "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
          isActive && "bg-sidebar-accent text-sidebar-foreground font-semibold",
          isCollapsed && "justify-center px-0"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
        )}
        <item.icon className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
        )} />
        {!isCollapsed && <span className="truncate">{item.title}</span>}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
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
          "flex h-screen flex-col border-r border-border bg-sidebar transition-[width] duration-200 relative select-none",
          isCollapsed ? "w-[60px]" : "w-56"
        )}
      >
        {/* Brand header */}
        <div className={cn(
          "flex h-14 items-center border-b border-sidebar-border shrink-0",
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground shrink-0">
              <span className="text-sm font-black text-background" style={{ fontFamily: 'Lora, serif' }}>F</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sidebar-foreground text-[15px] leading-tight tracking-tight">FFk</span>
                <span className="text-[10px] text-sidebar-foreground/40 leading-tight">Management</span>
              </div>
            )}
          </div>
          {!isCollapsed && !forceExpanded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              aria-label="折叠导航栏"
              className="h-8 w-8 shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Expand toggle when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center pt-2 pb-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              aria-label="展开导航栏"
              className="h-8 w-8 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="主导航">
          {navGroups.map((group, idx) => (
            <div key={group.label} className={cn(idx > 0 && "mt-5")}>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 px-3 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/35">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-sidebar-border/60" />
                </div>
              ) : (
                idx > 0 && <div className="mx-auto my-2 w-6 h-px bg-sidebar-border" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom settings */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <NavItem item={settingsItem} />
        </div>
      </aside>
    </TooltipProvider>
  );
}
