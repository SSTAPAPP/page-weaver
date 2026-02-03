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
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { title: "仪表盘", url: "/", icon: LayoutDashboard },
  { title: "收银台", url: "/cashier", icon: ShoppingCart },
  { title: "会员管理", url: "/members", icon: Users },
  { title: "预约管理", url: "/appointments", icon: Calendar },
  { title: "服务管理", url: "/services", icon: Scissors },
  { title: "数据报表", url: "/reports", icon: BarChart3 },
  { title: "交易流水", url: "/transactions", icon: FileText },
  { title: "设置", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const location = useLocation();

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <span className="text-lg font-black text-background">F</span>
            </div>
            <span className="font-bold text-sidebar-foreground text-lg">FFk</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground mx-auto">
            <span className="text-lg font-black text-background">F</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn("h-8 w-8 shrink-0", collapsed && "absolute right-1 top-4")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent text-sidebar-primary"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Sync Status */}
      <div className="p-2">
        <Separator className="mb-2" />
        <SyncStatusIndicator collapsed={collapsed} />
      </div>
    </div>
  );
}
