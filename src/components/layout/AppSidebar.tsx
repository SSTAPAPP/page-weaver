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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { title: "仪表盘", url: "/", icon: LayoutDashboard },
  { title: "收银台", url: "/cashier", icon: ShoppingCart },
  { title: "会员", url: "/members", icon: Users },
  { title: "预约", url: "/appointments", icon: Calendar },
  { title: "服务", url: "/services", icon: Scissors },
  { title: "报表", url: "/reports", icon: BarChart3 },
  { title: "流水", url: "/transactions", icon: FileText },
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
          "group relative flex items-center gap-3 rounded-lg min-h-[40px] text-[13px] font-medium transition-colors duration-150",
          isCollapsed ? "justify-center w-10 h-10 mx-auto" : "px-3 py-2",
          isActive
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <item.icon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            isActive ? "text-background" : "text-muted-foreground group-hover:text-foreground"
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
          "flex h-screen flex-col bg-background transition-[width] duration-200 relative select-none",
          isCollapsed ? "w-[60px]" : "w-52"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-14 items-center shrink-0",
            isCollapsed ? "justify-center" : "px-4"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground shrink-0">
              <span
                className="text-sm font-black text-background"
                style={{ fontFamily: "Lora, serif" }}
              >
                F
              </span>
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-foreground text-[15px] tracking-tight">
                FFk
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto",
            isCollapsed ? "px-1.5 py-2" : "px-3 py-2"
          )}
          aria-label="主导航"
        >
          <div className={cn("space-y-1", isCollapsed && "flex flex-col items-center")}>
            {navItems.map((item) => (
              <NavItem key={item.url} item={item} />
            ))}
          </div>
        </nav>

        {/* Bottom: Settings + Collapse toggle */}
        <div
          className={cn(
            "shrink-0 pb-3",
            isCollapsed ? "px-1.5" : "px-3"
          )}
        >
          <div className={cn("space-y-1", isCollapsed && "flex flex-col items-center")}>
            <NavItem item={settingsItem} />

            {!forceExpanded && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCollapsed(!isCollapsed)}
                    aria-label={isCollapsed ? "展开导航栏" : "折叠导航栏"}
                    className={cn(
                      "flex items-center gap-3 rounded-lg min-h-[40px] text-[13px] font-medium transition-colors duration-150 text-muted-foreground hover:text-foreground hover:bg-accent",
                      isCollapsed
                        ? "justify-center w-10 h-10 mx-auto"
                        : "px-3 py-2 w-full"
                    )}
                  >
                    {isCollapsed ? (
                      <ChevronsRight className="h-[18px] w-[18px] shrink-0" />
                    ) : (
                      <>
                        <ChevronsLeft className="h-[18px] w-[18px] shrink-0" />
                        <span className="truncate">收起</span>
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="text-xs font-medium"
                  >
                    展开
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
