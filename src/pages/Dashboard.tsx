import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores/useStore";
import { useTodayStats, useMembers, useTransactions } from "@/hooks/useCloudData";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentMembers } from "@/components/dashboard/RecentMembers";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function Dashboard() {
  const navigate = useNavigate();
  const { hiddenSections, toggleSectionVisibility } = useStore();
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError, refetch: refetchStats } = useTodayStats();
  const { data: members = [], isLoading: isMembersLoading } = useMembers();
  const { data: transactions = [], isLoading: isTxLoading } = useTransactions();
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

  const isHidden = (id: string) => hiddenSections.includes(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            仪表盘
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
          onClick={() => toggleSectionVisibility("stats")}
          title={isHidden("stats") ? "显示数据" : "隐藏数据"}
        >
          {isHidden("stats") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Stats */}
      <DashboardStats
        stats={stats}
        isLoading={isStatsLoading}
        isError={isStatsError}
        refetch={refetchStats}
        hidden={isHidden("stats")}
      />

      {/* Quick Actions */}
      <QuickActions
        onAddMember={() => setMemberDialogOpen(true)}
        onRecharge={() => setRechargeDialogOpen(true)}
        onCashier={() => navigate("/cashier")}
        onSearchMember={() => navigate("/members")}
        onNewAppointment={() => navigate("/appointments")}
      />

      {/* Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentMembers
          members={members}
          isLoading={isMembersLoading}
          hidden={isHidden("members")}
          onToggleHidden={() => toggleSectionVisibility("members")}
          onViewAll={() => navigate("/members")}
          onAddMember={() => setMemberDialogOpen(true)}
        />
        <RecentTransactions
          transactions={transactions}
          isLoading={isTxLoading}
          hidden={isHidden("transactions")}
          onViewAll={() => navigate("/transactions")}
        />
      </div>

      <QuickMemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} />
      <QuickRechargeDialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen} />
    </div>
  );
}
