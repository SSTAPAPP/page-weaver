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
  ChevronsLeft,
  ChevronsRight,
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
    label: "日常",
    items: [
      { title: "仪表盘", url: "/", icon: LayoutDashboard },
      { title: "收银台", url: "/cashier", icon: ShoppingCart },
    ],
  },
  {
    label: "管理",
    items: [
      { title: "会员管理", url: "/members", icon: Users },
      { title: "预约管理", url: "/appointments", icon: Calendar },
      { title: "服务管理", url: "/services", icon: Scissors },
    ],
  },
  {
    label: "统计",
    items: [
      { title: "数据报表", url: "/reports", icon: BarChart3 },
      { title: "交易流水", url: "/transactions", icon: FileText },
    ],
  },
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
          "group relative flex items-center gap-3 rounded-md min-h-9 text-[13px] font-medium transition-all duration-150",
          isCollapsed ? "justify-center w-9 h-9 mx-auto rounded-lg" : "px-2.5 py-1.5",
          isActive
            ? "bg-background/80 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
        )}
      >
        {isActive && !isCollapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-[2px] rounded-r-full bg-foreground/70" />
        )}
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors duration-150",
            isActive
              ? "text-foreground"
              : "text-muted-foreground/50 group-hover:text-foreground/70"
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
          "flex h-screen flex-col border-r border-border bg-muted/50 transition-[width] duration-200 relative select-none",
          isCollapsed ? "w-[56px]" : "w-[200px]"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex items-center shrink-0",
            isCollapsed ? "justify-center h-14 px-2" : "h-14 px-3.5"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground shrink-0">
              <span
                className="text-[13px] font-black text-background leading-none"
                style={{ fontFamily: "Lora, serif" }}
              >
                F
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span
                  className="font-bold text-foreground text-[14px] leading-tight tracking-tight"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  FFk
                </span>
                <span className="text-[9px] text-muted-foreground/60 leading-tight tracking-wide">
                  MANAGEMENT
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto",
            isCollapsed ? "px-1.5 pt-2" : "px-2 pt-1"
          )}
          aria-label="主导航"
        >
          <div className="space-y-4">
            {navGroups.map((group, idx) => (
              <div key={group.label}>
                {!isCollapsed && (
                  <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/40">
                    {group.label}
                  </p>
                )}
                {isCollapsed && idx > 0 && (
                  <div className="mx-auto mb-2 mt-1 h-px w-4 bg-border/50" />
                )}
                <div
                  className={cn(
                    "space-y-0.5",
                    isCollapsed && "flex flex-col items-center gap-0.5"
                  )}
                >
                  {group.items.map((item) => (
                    <NavItem key={item.url} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom: settings + collapse */}
        <div
          className={cn(
            "shrink-0 border-t border-border/60 py-2",
            isCollapsed ? "px-1.5" : "px-2"
          )}
        >
          <div
            className={cn(
              isCollapsed && "flex flex-col items-center gap-1"
            )}
          >
            <NavItem item={settingsItem} />
            {!forceExpanded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!isCollapsed)}
                aria-label={isCollapsed ? "展开导航栏" : "折叠导航栏"}
                className={cn(
                  "h-8 w-8 text-muted-foreground/40 hover:text-muted-foreground hover:bg-transparent",
                  !isCollapsed && "w-full justify-start px-2.5 gap-3"
                )}
              >
                {isCollapsed ? (
                  <ChevronsRight className="h-3.5 w-3.5" />
                ) : (
                  <>
                    <ChevronsLeft className="h-3.5 w-3.5" />
                    <span className="text-[13px] font-medium">收起</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
