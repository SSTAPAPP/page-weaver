import { useState } from "react";
import {
  Users,
  Wallet,
  CreditCard,
  TrendingUp,
  Calendar,
  Plus,
  Search,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/stores/useStore";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function Dashboard() {
  const navigate = useNavigate();
  const { getTodayStats, members, transactions, appointments } = useStore();
  const stats = getTodayStats();
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

  const statCards = [
    {
      title: "今日实收",
      value: `¥${stats.revenue.toFixed(2)}`,
      icon: Wallet,
      description: "现金+微信+支付宝",
      color: "text-chart-1",
    },
    {
      title: "今日充值",
      value: `¥${stats.recharge.toFixed(2)}`,
      icon: CreditCard,
      description: "储值卡/次卡入账",
      color: "text-chart-2",
    },
    {
      title: "今日消耗",
      value: `¥${stats.consumption.toFixed(2)}`,
      icon: TrendingUp,
      description: "余额+次卡消费",
      color: "text-chart-3",
    },
    {
      title: "新增会员",
      value: stats.newMembers.toString(),
      icon: Users,
      description: "今日新注册",
      color: "text-chart-4",
    },
    {
      title: "今日预约",
      value: stats.appointments.toString(),
      icon: Calendar,
      description: "待服务预约",
      color: "text-chart-5",
    },
  ];

  const quickActions = [
    {
      title: "快速开卡",
      icon: UserPlus,
      onClick: () => setMemberDialogOpen(true),
      variant: "default" as const,
    },
    {
      title: "会员充值",
      icon: Plus,
      onClick: () => setRechargeDialogOpen(true),
      variant: "secondary" as const,
    },
    {
      title: "收银结账",
      icon: Wallet,
      onClick: () => navigate("/cashier"),
      variant: "secondary" as const,
    },
    {
      title: "查找会员",
      icon: Search,
      onClick: () => navigate("/members"),
      variant: "outline" as const,
    },
    {
      title: "新增预约",
      icon: Calendar,
      onClick: () => navigate("/appointments"),
      variant: "outline" as const,
    },
  ];

  // 最近交易
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">仪表盘</h1>
          <p className="text-muted-foreground">今日经营数据一览</p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Badge variant="outline" className="font-normal">
            {format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            iconColor={stat.color}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant={action.variant}
                onClick={action.onClick}
                className="gap-2 transition-all hover:scale-105"
              >
                <action.icon className="h-4 w-4" />
                {action.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">最近会员</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => navigate("/members")}
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <EmptyState
                icon={Users}
                title="暂无会员"
                description='点击"快速开卡"添加第一位会员'
                action={
                  <Button onClick={() => setMemberDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    快速开卡
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    onClick={() => navigate("/members")}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">¥{member.balance.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.cards.length}张次卡
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">最近交易</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => navigate("/transactions")}
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="暂无交易"
                description="交易记录将在这里显示"
              />
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {tx.memberName} • {format(new Date(tx.createdAt), "HH:mm")}
                      </p>
                    </div>
                    <span
                      className={`font-semibold ${
                        tx.type === "recharge" ? "text-chart-2" : "text-destructive"
                      }`}
                    >
                      {tx.type === "recharge" ? "+" : "-"}¥{tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <QuickMemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} />
      <QuickRechargeDialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen} />
    </div>
  );
}
