import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, ShoppingCart, Calendar, Scissors,
  BarChart3, FileText, PanelLeftClose, PanelLeft, Settings, LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const mainMenuItems = [
  { title: "仪表盘", url: "/", icon: LayoutDashboard },
  { title: "收银台", url: "/cashier", icon: ShoppingCart },
  { title: "会员管理", url: "/members", icon: Users },
  { title: "预约管理", url: "/appointments", icon: Calendar },
];

const manageMenuItems = [
  { title: "服务管理", url: "/services", icon: Scissors },
  { title: "数据报表", url: "/reports", icon: BarChart3 },
  { title: "交易流水", url: "/transactions", icon: FileText },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function SidebarNavItem({
  item, isActive, collapsed,
}: {
  item: { title: string; url: string; icon: React.ElementType };
  isActive: boolean;
  collapsed: boolean;
}) {
  const link = (
    <NavLink
      to={item.url}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200",
        "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
        collapsed && "justify-center px-0"
      )}
    >
      <item.icon className={cn(
        "h-[18px] w-[18px] shrink-0 transition-colors",
        isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/40"
      )} />
      {!collapsed && <span className="tracking-tight">{item.title}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={14} className="text-xs font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("已退出登录");
    } catch {
      toast.error("退出失败");
    }
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "flex h-full flex-col bg-sidebar border-r border-sidebar-border/40 transition-all duration-[var(--duration-slow)]",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}>
        {/* Brand */}
        <div className={cn("flex h-14 items-center shrink-0", collapsed ? "justify-center" : "justify-between px-4")}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-bold text-sm">
                F
              </div>
              <span className="font-semibold text-sidebar-accent-foreground text-sm tracking-tight">FFk Barber</span>
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-bold text-sm">
              F
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(true)}
              className="h-7 w-7 text-sidebar-foreground/25 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center py-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(false)}
              className="h-7 w-7 text-sidebar-foreground/25 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4">
          <div className="space-y-1">
            {mainMenuItems.map((item) => (
              <SidebarNavItem key={item.url} item={item} isActive={location.pathname === item.url} collapsed={collapsed} />
            ))}
          </div>

          <div className={cn("my-4", collapsed ? "mx-2" : "mx-3")}>
            <div className="h-px bg-sidebar-border/25" />
          </div>

          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-medium text-sidebar-foreground/20 uppercase tracking-widest">
              管理
            </p>
          )}
          <div className="space-y-1">
            {manageMenuItems.map((item) => (
              <SidebarNavItem key={item.url} item={item} isActive={location.pathname === item.url} collapsed={collapsed} />
            ))}
          </div>

          <div className={cn("my-4", collapsed ? "mx-2" : "mx-3")}>
            <div className="h-px bg-sidebar-border/25" />
          </div>

          <SidebarNavItem
            item={{ title: "设置", url: "/settings", icon: Settings }}
            isActive={location.pathname === "/settings"}
            collapsed={collapsed}
          />
        </nav>

        {/* Bottom */}
        <div className="p-2.5 space-y-2 shrink-0">
          <SyncStatusIndicator collapsed={collapsed} />

          <div className={cn(
            "rounded-xl bg-sidebar-accent/30 p-2.5",
            collapsed && "flex justify-center"
          )}>
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-foreground/8 text-[11px] font-medium text-sidebar-foreground/50">
                  {user?.email?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <p className="text-[11px] text-sidebar-foreground/45 truncate flex-1 min-w-0">
                  {user?.email || "管理员"}
                </p>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="h-7 w-7 shrink-0 text-sidebar-foreground/25 hover:text-destructive hover:bg-sidebar-accent/50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">退出</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-8 w-8 text-sidebar-foreground/25 hover:text-destructive hover:bg-sidebar-accent/50"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">退出</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
