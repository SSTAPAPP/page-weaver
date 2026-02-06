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
  Sparkles,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useStore } from "@/stores/useStore";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const metricsInfo: Record<string, { title: string; brief: string; formula: string; example: string; note: string }> = {
  "今日实收": {
    title: "实收金额",
    brief: "真实进账现金流",
    formula: "现金 + 微信 + 支付宝 + 补差价",
    example: "余额50元消费80元，补差价30元现金 → 实收30元",
    note: "余额消费不计入（已在充值时收过）",
  },
  "今日充值": {
    title: "充值金额",
    brief: "储值/次卡销售额",
    formula: "储值卡销售 + 次卡销售",
    example: "会员充值500元储值卡 → 充值500元",
    note: "预收款项，体现客户信任度",
  },
  "今日消耗": {
    title: "消耗金额",
    brief: "余额/次卡核销值",
    formula: "余额消费 + 次卡消费（按原价）",
    example: "用余额支付38元洗剪吹 → 消耗38元",
    note: "补差价不计入（已在实收统计）",
  },
};

interface StatCardWithTooltipProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  hidden?: boolean;
}

function StatCardWithTooltip({ title, value, description, icon: Icon, color, bgColor, hidden }: StatCardWithTooltipProps) {
  const metricInfo = metricsInfo[title];

  const cardContent = (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {title}
            </p>
            <div className="text-2xl font-bold tracking-tight">{hidden ? "****" : value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
      {metricInfo && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Card>
  );

  if (metricInfo) {
    return (
      <HoverCard openDelay={100} closeDelay={50}>
        <HoverCardTrigger asChild>
          {cardContent}
        </HoverCardTrigger>
        <HoverCardContent className="w-80" side="bottom" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgColor}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="font-semibold">{metricInfo.title}</p>
                <p className="text-xs text-muted-foreground">{metricInfo.brief}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="rounded-lg bg-muted/50 p-2.5">
                <p className="font-medium text-xs text-muted-foreground mb-1">计算公式</p>
                <p className="font-mono text-xs">{metricInfo.formula}</p>
              </div>
              <div>
                <p className="font-medium text-xs text-muted-foreground mb-1">示例</p>
                <p className="text-xs">{metricInfo.example}</p>
              </div>
              <p className="text-xs text-muted-foreground/80 italic">
                {metricInfo.note}
              </p>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return cardContent;
}

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
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      id: "recharge",
      title: "今日充值",
      value: `¥${stats.recharge.toFixed(2)}`,
      icon: CreditCard,
      description: "储值卡/次卡入账",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      id: "consumption",
      title: "今日消耗",
      value: `¥${stats.consumption.toFixed(2)}`,
      icon: TrendingUp,
      description: "余额+次卡消费",
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      id: "newMembers",
      title: "新增会员",
      value: stats.newMembers.toString(),
      icon: Users,
      description: "今日新注册",
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      id: "appointments",
      title: "今日预约",
      value: stats.appointments.toString(),
      icon: Calendar,
      description: "待服务预约",
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
  ];

  const quickActions = [
    {
      title: "快速开卡",
      description: "新增会员",
      icon: UserPlus,
      onClick: () => setMemberDialogOpen(true),
      variant: "default" as const,
    },
    {
      title: "会员充值",
      description: "储值/次卡",
      icon: Plus,
      onClick: () => setRechargeDialogOpen(true),
      variant: "outline" as const,
    },
    {
      title: "收银结账",
      description: "服务结算",
      icon: Wallet,
      onClick: () => navigate("/cashier"),
      variant: "outline" as const,
    },
    {
      title: "查找会员",
      description: "搜索查询",
      icon: Search,
      onClick: () => navigate("/members"),
      variant: "outline" as const,
    },
    {
      title: "新增预约",
      description: "预约登记",
      icon: Calendar,
      onClick: () => navigate("/appointments"),
      variant: "outline" as const,
    },
  ];

  // 最近交易 - 显示包括已退款的订单，退款订单加删除线
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">仪表盘</h1>
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">今日经营数据一览 · 鼠标移至卡片查看指标说明</p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Badge variant="outline" className="font-normal text-xs px-3 py-1">
            {format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`transition-all duration-300 ${isHidden("stats") ? "opacity-30" : ""}`}>
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
            <StatCardWithTooltip
              key={stat.title}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
              hidden={isHidden("stats")}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">快捷操作</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant={action.variant}
                onClick={action.onClick}
                className="h-auto flex-col gap-1.5 py-4 transition-all hover:scale-[1.02]"
              >
                <action.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{action.title}</span>
                <span className="text-[10px] opacity-60">{action.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Members */}
        <Card className={`transition-all duration-300 ${isHidden("members") ? "opacity-30" : ""}`}>
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
                className="gap-1 text-primary hover:text-primary"
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
              <div className="space-y-2">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    onClick={() => navigate("/members")}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-border/50 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{isHidden("members") ? "***" : member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isHidden("members") ? "****" : member.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {isHidden("members") ? "****" : `¥${member.balance.toFixed(2)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
        <Card className={`transition-all duration-300 ${isHidden("transactions") ? "opacity-30" : ""}`}>
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
                className="gap-1 text-primary hover:text-primary"
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
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between rounded-xl border border-border/50 p-3 transition-all duration-200 hover:bg-accent/50 ${
                      tx.voided ? "opacity-50" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm truncate ${tx.voided ? "line-through" : ""}`}>
                          {isHidden("transactions") ? "****" : tx.description}
                        </p>
                        {tx.voided && (
                          <Badge variant="destructive" className="text-[10px] shrink-0">已作废</Badge>
                        )}
                      </div>
                      <p className={`text-xs text-muted-foreground ${tx.voided ? "line-through" : ""}`}>
                        {isHidden("transactions") ? "***" : tx.memberName} · {format(new Date(tx.createdAt), "HH:mm")}
                      </p>
                    </div>
                    <span
                      className={`font-semibold text-sm shrink-0 ml-2 ${
                        tx.voided ? "line-through text-muted-foreground" :
                        tx.type === "recharge" || tx.type === "refund" ? "text-success" : "text-foreground"
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
