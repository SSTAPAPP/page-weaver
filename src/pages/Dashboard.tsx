import { useState, useMemo } from "react";
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
  Eye,
  EyeOff,
  ShoppingBag,
  PiggyBank,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore } from "@/stores/useStore";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface StatCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  hidden?: boolean;
}

function StatCard({ title, value, sub, icon: Icon, color, hidden }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-muted`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
        <p className="text-2xl font-bold tabular-nums">{hidden ? "****" : value}</p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-1">{hidden ? "****" : sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { getTodayStats, members, transactions, hiddenSections, toggleSectionVisibility } = useStore();
  const stats = getTodayStats();
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

  const isHidden = (sectionId: string) => hiddenSections.includes(sectionId);

  // 额外统计
  const extraStats = useMemo(() => {
    const totalBalance = members.reduce((s, m) => s + m.balance, 0);
    const totalCards = members.reduce((s, m) => s + m.cards.filter(c => c.remainingCount > 0).length, 0);
    const todayOrders = transactions.filter(t =>
      !t.voided && (t.type === 'consume' || t.type === 'card_deduct') &&
      (() => {
        const d = new Date(t.createdAt);
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      })()
    ).length;
    return { totalBalance, totalCards, todayOrders };
  }, [members, transactions]);

  const statCards = [
    {
      title: "今日实收",
      value: `¥${stats.revenue.toFixed(2)}`,
      icon: Wallet,
      sub: "现金 · 微信 · 支付宝",
      color: "text-chart-1",
    },
    {
      title: "今日充值",
      value: `¥${stats.recharge.toFixed(2)}`,
      icon: PiggyBank,
      sub: "储值卡 · 次卡销售",
      color: "text-chart-2",
    },
    {
      title: "今日消耗",
      value: `¥${stats.consumption.toFixed(2)}`,
      icon: TrendingUp,
      sub: "余额 · 次卡核销",
      color: "text-chart-3",
    },
    {
      title: "今日订单",
      value: extraStats.todayOrders.toString(),
      icon: ShoppingBag,
      sub: `新增 ${stats.newMembers} 位会员`,
      color: "text-chart-4",
    },
    {
      title: "今日预约",
      value: stats.appointments.toString(),
      icon: Calendar,
      sub: "待服务预约",
      color: "text-chart-5",
    },
  ];

  const summaryCards = [
    {
      title: "会员总数",
      value: members.length.toString(),
      icon: Users,
      sub: `活跃次卡 ${extraStats.totalCards} 张`,
      color: "text-chart-3",
    },
    {
      title: "储值总余额",
      value: `¥${extraStats.totalBalance.toFixed(0)}`,
      icon: CreditCard,
      sub: `人均 ¥${members.length > 0 ? (extraStats.totalBalance / members.length).toFixed(0) : '0'}`,
      color: "text-chart-1",
    },
  ];

  const quickActions = [
    { title: "快速开卡", icon: UserPlus, onClick: () => setMemberDialogOpen(true), variant: "default" as const },
    { title: "会员充值", icon: Plus, onClick: () => setRechargeDialogOpen(true), variant: "outline" as const },
    { title: "收银结账", icon: Wallet, onClick: () => navigate("/cashier"), variant: "outline" as const },
    { title: "查找会员", icon: Search, onClick: () => navigate("/members"), variant: "outline" as const },
    { title: "新增预约", icon: Calendar, onClick: () => navigate("/appointments"), variant: "outline" as const },
  ];

  const recentTransactions = transactions.filter(t => !t.voided).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">仪表盘</h1>
          <p className="text-muted-foreground">实时掌握今日营收、会员动态与预约概况</p>
        </div>
        <Badge variant="outline" className="font-normal w-fit">
          {format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}
        </Badge>
      </div>

      {/* Today Stats */}
      <div className={`transition-opacity duration-200 ${isHidden("stats") ? "opacity-30" : ""}`}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">今日经营</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-30 hover:opacity-100"
            onClick={() => toggleSectionVisibility("stats")}
            aria-label={isHidden("stats") ? "显示统计数据" : "隐藏统计数据"}
          >
            {isHidden("stats") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat) => (
            <StatCard key={stat.title} {...stat} hidden={isHidden("stats")} />
          ))}
        </div>
      </div>

      {/* Summary + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Summary cards */}
        <div className="grid gap-3 grid-cols-2 lg:col-span-1">
          {summaryCards.map((stat) => (
            <StatCard key={stat.title} {...stat} hidden={isHidden("stats")} />
          ))}
        </div>
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.title}
                  variant={action.variant}
                  onClick={action.onClick}
                  className="gap-2 min-h-[44px]"
                >
                  <action.icon className="h-4 w-4" />
                  {action.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Members */}
        <Card className={`transition-opacity duration-200 ${isHidden("members") ? "opacity-30" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">最近会员</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-30 hover:opacity-100"
                onClick={() => toggleSectionVisibility("members")}
                aria-label={isHidden("members") ? "显示会员列表" : "隐藏会员列表"}
              >
                {isHidden("members") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 min-h-[44px]" onClick={() => navigate("/members")}>
                查看全部 <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <EmptyState
                icon={Users}
                title="暂无会员"
                description='点击"快速开卡"添加第一位会员'
                action={
                  <Button onClick={() => setMemberDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> 快速开卡
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    onClick={() => navigate("/members")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/members"); } }}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-border p-3 min-h-[44px] transition-colors duration-150 hover:border-primary/50 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{isHidden("members") ? "***" : member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isHidden("members") ? "****" : member.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">
                        {isHidden("members") ? "****" : `¥${member.balance.toFixed(2)}`}
                      </p>
                      {member.cards.length > 0 && (
                        <p className="text-xs text-muted-foreground">{member.cards.length}张次卡</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className={`transition-opacity duration-200 ${isHidden("transactions") ? "opacity-30" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">最近交易</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-30 hover:opacity-100"
                onClick={() => toggleSectionVisibility("transactions")}
                aria-label={isHidden("transactions") ? "显示交易列表" : "隐藏交易列表"}
              >
                {isHidden("transactions") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 min-h-[44px]" onClick={() => navigate("/transactions")}>
                查看全部 <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <EmptyState icon={CreditCard} title="暂无交易" description="交易记录将在这里显示" />
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-md border border-border p-3 min-h-[44px] transition-colors duration-150 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {isHidden("transactions") ? "****" : tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isHidden("transactions") ? "***" : tx.memberName} · {format(new Date(tx.createdAt), "HH:mm")}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums shrink-0 ml-3 ${
                        tx.type === "recharge" || tx.type === "refund" ? "text-chart-2" : "text-destructive"
                      }`}
                    >
                      {isHidden("transactions")
                        ? "****"
                        : `${tx.type === "recharge" || tx.type === "refund" ? "+" : "-"}¥${tx.amount.toFixed(2)}`
                      }
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
