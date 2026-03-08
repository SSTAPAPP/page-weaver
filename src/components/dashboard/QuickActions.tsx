import { UserPlus, Plus, Wallet, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onAddMember: () => void;
  onRecharge: () => void;
  onCashier: () => void;
  onSearchMember: () => void;
  onNewAppointment: () => void;
}

export function QuickActions({
  onAddMember,
  onRecharge,
  onCashier,
  onSearchMember,
  onNewAppointment,
}: QuickActionsProps) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2.5">快捷操作</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onAddMember}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          快速开卡
        </Button>
        <Button variant="outline" size="sm" onClick={onRecharge}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          会员充值
        </Button>
        <Button variant="outline" size="sm" onClick={onCashier}>
          <Wallet className="mr-1.5 h-3.5 w-3.5" />
          收银结账
        </Button>
        <Button variant="outline" size="sm" onClick={onSearchMember}>
          <Search className="mr-1.5 h-3.5 w-3.5" />
          查找会员
        </Button>
        <Button variant="outline" size="sm" onClick={onNewAppointment}>
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          新增预约
        </Button>
      </div>
    </div>
  );
}
