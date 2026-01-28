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
  Eye,
  EyeOff,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/stores/useStore";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const metricsExplanation = {
  revenue: {
    title: "今日实收",
    description: "统计当天通过现金、微信、支付宝等方式收到的真实金额，包括补差价收入",
    example: "例：会员余额50元，消费80元，补差价30元现金 → 实收30元",
  },
  recharge: {
    title: "今日充值",
    description: "统计当天售出的储值卡和次卡金额，属于预收款",
    example: "例：会员充值500元 → 充值500元",
  },
  consumption: {
    title: "今日消耗",
    description: "统计当天会员使用余额或次卡消费的金额，反映实际服务量",
    example: "例：会员用余额支付38元洗剪吹 → 消耗38元",
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { getTodayStats, members, transactions, hiddenSections, toggleSectionVisibility } = useStore();
  const stats = getTodayStats();
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

  const isHidden = (sectionId: string) => hiddenSections.includes(sectionId);

  const statCards = [
    {
      id: "revenue",
      title: "今日实收",
      value: `¥${stats.revenue.toFixed(2)}`,
      icon: Wallet,
      description: "现金+微信+支付宝+补差价",
      color: "text-chart-1",
    },
    {
      id: "recharge",
      title: "今日充值",
      value: `¥${stats.recharge.toFixed(2)}`,
      icon: CreditCard,
      description: "储值卡/次卡入账",
      color: "text-chart-2",
    },
    {
      id: "consumption",
      title: "今日消耗",
      value: `¥${stats.consumption.toFixed(2)}`,
      icon: TrendingUp,
      description: "余额+次卡消费",
      color: "text-chart-3",
    },
    {
      id: "newMembers",
      title: "新增会员",
      value: stats.newMembers.toString(),
      icon: Users,
      description: "今日新注册",
      color: "text-chart-4",
    },
    {
      id: "appointments",
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
  const recentTransactions = transactions.filter(t => !t.voided).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">仪表盘</h1>
            <p className="text-muted-foreground">今日经营数据一览</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-40 hover:opacity-100">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm space-y-3 p-4">
              {Object.values(metricsExplanation).map((metric) => (
                <div key={metric.title} className="space-y-1">
                  <p className="font-medium">{metric.title}</p>
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                  <p className="text-xs text-muted-foreground/80">{metric.example}</p>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Badge variant="outline" className="font-normal">
            {format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`transition-all ${isHidden("stats") ? "opacity-30" : ""}`}>
        <div className="mb-2 flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-30 hover:opacity-100"
            onClick={() => toggleSectionVisibility("stats")}
          >
            {isHidden("stats") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={isHidden("stats") ? "****" : stat.value}
              description={stat.description}
              icon={stat.icon}
              iconColor={stat.color}
            />
          ))}
        </div>
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
        <Card className={`transition-all ${isHidden("members") ? "opacity-30" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">最近会员</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-30 hover:opacity-100"
                onClick={() => toggleSectionVisibility("members")}
              >
                {isHidden("members") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => navigate("/members")}
              >
                查看全部
                <ArrowRight className="h-4 w-4" />
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
                        <p className="font-medium">{isHidden("members") ? "***" : member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {isHidden("members") ? "****" : member.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {isHidden("members") ? "****" : `¥${member.balance.toFixed(2)}`}
                      </p>
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
        <Card className={`transition-all ${isHidden("transactions") ? "opacity-30" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">最近交易</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-30 hover:opacity-100"
                onClick={() => toggleSectionVisibility("transactions")}
              >
                {isHidden("transactions") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => navigate("/transactions")}
              >
                查看全部
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
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
                      <p className="font-medium">
                        {isHidden("transactions") ? "****" : tx.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isHidden("transactions") ? "***" : tx.memberName} • {format(new Date(tx.createdAt), "HH:mm")}
                      </p>
                    </div>
                    <span
                      className={`font-semibold ${
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
