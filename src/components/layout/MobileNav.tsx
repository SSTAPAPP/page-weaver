import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  BarChart3,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "首页", url: "/", icon: LayoutDashboard },
  { title: "收银", url: "/cashier", icon: ShoppingCart },
  { title: "会员", url: "/members", icon: Users },
  { title: "报表", url: "/reports", icon: BarChart3 },
  { title: "更多", url: "##menu", icon: Menu },
];

interface MobileNavProps {
  onOpenMenu: () => void;
}

export function MobileNav({ onOpenMenu }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isMenu = tab.url === "##menu";
          const isActive = !isMenu && location.pathname === tab.url;

          return (
            <button
              key={tab.url}
              type="button"
              onClick={() => {
                if (isMenu) {
                  onOpenMenu();
                } else {
                  navigate(tab.url);
                }
              }}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[52px]",
                "text-muted-foreground transition-colors duration-[var(--duration-fast)]",
                "active:bg-muted/40",
                isActive && "text-primary"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-2xs font-medium">{tab.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
