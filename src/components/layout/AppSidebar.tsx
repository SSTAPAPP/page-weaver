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
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  item,
  isActive,
  collapsed,
}: {
  item: { title: string; url: string; icon: React.ElementType };
  isActive: boolean;
  collapsed: boolean;
}) {
  const link = (
    <NavLink
      to={item.url}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-accent text-sidebar-primary font-medium",
        collapsed && "justify-center px-0"
      )}
    >
      <item.icon className={cn(
        "h-[18px] w-[18px] shrink-0",
        isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
      )} />
      {!collapsed && <span>{item.title}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
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
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("退出失败，请重试");
    }
  };

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex h-full flex-col bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Brand */}
        <div className={cn(
          "flex h-14 items-center border-b border-sidebar-border/50",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent border border-sidebar-border font-serif font-bold text-sm text-sidebar-primary">
                F
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-sidebar-accent-foreground text-sm leading-tight">FFk Barber</span>
                <span className="text-[10px] text-sidebar-foreground/40 leading-tight tracking-wide">经营管理系统</span>
              </div>
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent border border-sidebar-border font-serif font-bold text-sm text-sidebar-primary">
              F
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(!collapsed)}
              className="h-7 w-7 shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Collapsed expand */}
        {collapsed && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(false)}
              className="h-7 w-7 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/30">
              主要功能
            </p>
          )}
          <div className="space-y-0.5">
            {mainMenuItems.map((item) => (
              <SidebarNavItem
                key={item.url}
                item={item}
                isActive={location.pathname === item.url}
                collapsed={collapsed}
              />
            ))}
          </div>

          <div className={cn("my-3", collapsed ? "mx-2" : "mx-3")}>
            <Separator className="bg-sidebar-border/40" />
          </div>

          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/30">
              经营管理
            </p>
          )}
          <div className="space-y-0.5">
            {manageMenuItems.map((item) => (
              <SidebarNavItem
                key={item.url}
                item={item}
                isActive={location.pathname === item.url}
                collapsed={collapsed}
              />
            ))}
          </div>

          <div className={cn("my-3", collapsed ? "mx-2" : "mx-3")}>
            <Separator className="bg-sidebar-border/40" />
          </div>

          <SidebarNavItem
            item={{ title: "设置", url: "/settings", icon: Settings }}
            isActive={location.pathname === "/settings"}
            collapsed={collapsed}
          />
        </nav>

        {/* Bottom */}
        <div className="p-2 space-y-2">
          <SyncStatusIndicator collapsed={collapsed} />

          <div className={cn(
            "rounded-md bg-sidebar-accent/40 p-2",
            collapsed && "flex flex-col items-center gap-1"
          )}>
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/15 text-xs font-medium text-sidebar-primary">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-sidebar-accent-foreground truncate">
                    {user?.email || "管理员"}
                  </p>
                </div>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="h-7 w-7 shrink-0 text-sidebar-foreground/40 hover:text-destructive hover:bg-sidebar-accent"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">退出登录</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-8 w-8 text-sidebar-foreground/40 hover:text-destructive hover:bg-sidebar-accent"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">退出登录</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
