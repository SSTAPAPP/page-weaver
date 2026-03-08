import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  Scissors,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "预约管理", url: "/appointments", icon: Calendar },
  { title: "服务管理", url: "/services", icon: Scissors },
  { title: "交易流水", url: "/transactions", icon: FileText },
  { title: "设置", url: "/settings", icon: Settings },
];

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleNav = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("已退出登录");
    } catch {
      toast.error("退出失败");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl pb-8">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base font-serif">更多功能</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-4 gap-3 py-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <button
                key={item.url}
                type="button"
                onClick={() => handleNav(item.url)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg p-3 min-h-[64px]",
                  "transition-colors active:bg-muted/60",
                  isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/40"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.title}</span>
              </button>
            );
          })}
        </div>

        <Separator />

        <div className="pt-4 space-y-3">
          <SyncStatusIndicator collapsed={false} />

          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || "管理员"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              退出
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
