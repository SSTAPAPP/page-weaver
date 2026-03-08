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
  const actions = [
    { label: "快速开卡", icon: UserPlus, onClick: onAddMember, primary: true },
    { label: "会员充值", icon: Plus, onClick: onRecharge },
    { label: "收银结账", icon: Wallet, onClick: onCashier },
    { label: "查找会员", icon: Search, onClick: onSearchMember },
    { label: "新增预约", icon: Calendar, onClick: onNewAppointment },
  ];

  return (
    <div className="flex flex-wrap gap-2.5">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.primary ? "default" : "outline"}
          size="sm"
          className="h-9 text-[13px] gap-2"
          onClick={action.onClick}
        >
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
