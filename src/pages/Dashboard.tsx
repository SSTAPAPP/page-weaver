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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useStore } from "@/stores/useStore";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";


interface StatCardWithTooltipProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: string;
  hidden?: boolean;
}

function StatCardWithTooltip({ title, value, description, icon: Icon, color, hidden }: StatCardWithTooltipProps) {
  const bgColor = color.replace("text-", "bg-") + "/10";
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
            {title}
          </p>
          <div className={`flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ${bgColor} transition-transform duration-200 group-hover:scale-110`}>
            <Icon className={`h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 ${color}`} />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-lg sm:text-2xl font-bold tracking-tight tabular-nums">{hidden ? "****" : value}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{description}</p>
        </div>
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
      variant: "outline" as const,
    },
    {
      title: "收银结账",
      icon: Wallet,
      onClick: () => navigate("/cashier"),
      variant: "outline" as const,
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

  const recentTransactions = transactions.filter(t => !t.voided).slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - 移动端更紧凑 */}
      <div className="flex flex-col gap-1 sm:gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">仪表盘</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">实时掌握今日营收、会员动态与预约概况</p>
        </div>
        <Badge variant="outline" className="font-normal text-xs self-start sm:self-auto">
          {format(new Date(), "M月d日 EEEE", { locale: zhCN })}
        </Badge>
      </div>

      {/* Stats Grid - 移动端2列紧凑 */}
      <div className={`transition-opacity duration-200 ${isHidden("stats") ? "opacity-30" : ""}`}>
        <div className="mb-1.5 flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-30 hover:opacity-100"
            onClick={() => toggleSectionVisibility("stats")}
            aria-label={isHidden("stats") ? "显示统计数据" : "隐藏统计数据"}
          >
            {isHidden("stats") ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        </div>
        <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat) => (
            <StatCardWithTooltip
              key={stat.title}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              color={stat.color}
              hidden={isHidden("stats")}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions - 移动端横向滚动 */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-base sm:text-lg">快捷操作</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant={action.variant}
                onClick={action.onClick}
                className="gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm whitespace-nowrap shrink-0"
                size="sm"
              >
                <action.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {action.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 最近会员 & 最近交易 - 移动端纵向堆叠 */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Recent Members */}
        <Card className={`transition-opacity duration-200 ${isHidden("members") ? "opacity-30" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-0 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">最近会员</CardTitle>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7 opacity-30 hover:opacity-100"
                onClick={() => toggleSectionVisibility("members")}
                aria-label={isHidden("members") ? "显示会员列表" : "隐藏会员列表"}
              >
                {isHidden("members") ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-0.5 h-6 sm:h-7 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground px-1.5"
                onClick={() => navigate("/members")}
              >
                全部
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2 sm:pt-3 px-3 sm:px-6 pb-3 sm:pb-6">
            {members.length === 0 ? (
              <EmptyState
                icon={Users}
                title="暂无会员"
                description='点击"快速开卡"添加第一位会员'
                action={
                  <Button size="sm" onClick={() => setMemberDialogOpen(true)}>
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    快速开卡
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    onClick={() => navigate("/members")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/members"); } }}
                    className="flex cursor-pointer items-center justify-between py-2 sm:py-3 first:pt-0 last:pb-0 transition-colors duration-150 hover:bg-muted/30 -mx-1.5 px-1.5 rounded-md"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground shrink-0">
                        {isHidden("members") ? "*" : member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{isHidden("members") ? "***" : member.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {isHidden("members") ? "****" : member.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs sm:text-sm font-medium tabular-nums">
                        {isHidden("members") ? "****" : `¥${member.balance.toFixed(0)}`}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {member.cards.length > 0 ? `${member.cards.length}张卡` : "无次卡"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className={`transition-opacity duration-200 ${isHidden("transactions") ? "opacity-30" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-0 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">最近交易</CardTitle>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7 opacity-30 hover:opacity-100"
                onClick={() => toggleSectionVisibility("transactions")}
                aria-label={isHidden("transactions") ? "显示交易列表" : "隐藏交易列表"}
              >
                {isHidden("transactions") ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-0.5 h-6 sm:h-7 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground px-1.5"
                onClick={() => navigate("/transactions")}
              >
                全部
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2 sm:pt-3 px-3 sm:px-6 pb-3 sm:pb-6">
            {recentTransactions.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="暂无交易"
                description="交易记录将在这里显示"
              />
            ) : (
              <div className="divide-y divide-border">
                {recentTransactions.map((tx) => {
                  const isIncome = tx.type === "recharge" || tx.type === "refund";
                  const typeLabel = tx.type === "recharge" ? "充值" : tx.type === "consume" ? "消费" : tx.type === "card_deduct" ? "次卡" : tx.type === "refund" ? "退款" : "其他";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2 sm:py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={cn(
                          "flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full text-[10px] sm:text-xs font-medium shrink-0",
                          isIncome ? "bg-chart-2/10 text-chart-2" : "bg-muted text-muted-foreground"
                        )}>
                          {isIncome ? "+" : "−"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">
                              {isHidden("transactions") ? "****" : tx.description}
                            </p>
                            <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 py-0 h-3.5 sm:h-4 font-normal shrink-0">
                              {typeLabel}
                            </Badge>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {isHidden("transactions") ? "***" : tx.memberName}
                            <span className="mx-0.5 sm:mx-1">·</span>
                            {format(new Date(tx.createdAt), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium tabular-nums shrink-0 ml-2",
                          isIncome ? "text-chart-2" : "text-foreground"
                        )}
                      >
                        {isHidden("transactions") 
                          ? "****" 
                          : `${isIncome ? "+" : "-"}¥${tx.amount.toFixed(0)}`
                        }
                      </span>
                    </div>
                  );
                })}
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
