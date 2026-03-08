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
import { Separator } from "@/components/ui/separator";

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
    label: "数据 & 系统",
    items: [
      { title: "数据报表", url: "/reports", icon: BarChart3 },
      { title: "交易流水", url: "/transactions", icon: FileText },
    ],
  },
];

const settingsItem = { title: "设置", url: "/settings", icon: Settings };

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const renderNavItem = (item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = location.pathname === item.url;
    return (
      <NavLink
        key={item.url}
        to={item.url}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent text-sidebar-primary font-semibold"
        )}
        title={collapsed ? item.title : undefined}
      >
        <item.icon className={cn("h-4.5 w-4.5 shrink-0", isActive && "text-sidebar-primary")} />
        {!collapsed && <span>{item.title}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300 relative",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <span className="text-base font-black text-background" style={{ fontFamily: 'Lora, serif' }}>F</span>
            </div>
            <span className="font-bold text-sidebar-foreground text-base tracking-tight">FFk</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground mx-auto">
            <span className="text-base font-black text-background" style={{ fontFamily: 'Lora, serif' }}>F</span>
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-7 w-7 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Grouped Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navGroups.map((group, idx) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </div>
            )}
            {collapsed && idx > 0 && (
              <Separator className="my-2 mx-auto w-8 bg-sidebar-border" />
            )}
            <div className="space-y-0.5">
              {group.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="border-t border-sidebar-border p-2">
        {renderNavItem(settingsItem)}
      </div>
    </aside>
  );
}
