import { useMemo, useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { TrendingUp, Wallet, CreditCard, Users, HelpCircle, DollarSign, PiggyBank, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useStore } from "@/stores/useStore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const metricsInfo = [
  {
    id: "revenue",
    title: "实收金额",
    icon: DollarSign,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
    brief: "真实进账现金流",
    formula: "现金 + 微信 + 支付宝 + 补差价",
    example: "余额50元消费80元，补差价30元现金 → 实收30元",
    note: "余额消费不计入（已在充值时收过）",
  },
  {
    id: "recharge",
    title: "充值金额",
    icon: PiggyBank,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    brief: "储值/次卡销售额",
    formula: "储值卡销售 + 次卡销售",
    example: "会员充值500元储值卡 → 充值500元",
    note: "预收款项，体现客户信任度",
  },
  {
    id: "consumption",
    title: "消耗金额",
    icon: Activity,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
    brief: "余额/次卡核销值",
    formula: "余额消费 + 次卡消费（按原价）",
    example: "用余额支付38元洗剪吹 → 消耗38元",
    note: "补差价不计入（已在实收统计）",
  },
];

export default function Reports() {
  const { transactions, members, getTodayStats } = useStore();
  const todayStats = getTodayStats();

  // 计算30天趋势数据
  const trendData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayTransactions = transactions.filter((t) => {
        const txDate = new Date(t.createdAt);
        return txDate >= dayStart && txDate <= dayEnd && !t.voided;
      });

      // 实收 = 现金/微信/支付宝支付 + subTransactions中的补差价
      let revenue = dayTransactions
        .filter((t) => 
          t.type === "consume" && 
          t.paymentMethod !== "balance" &&
          t.paymentMethod !== undefined
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      // 加上subTransactions中的补差价
      dayTransactions.forEach((t) => {
        if (t.subTransactions) {
          t.subTransactions.forEach((sub) => {
            if (sub.type === 'price_diff') {
              revenue += sub.amount;
            }
          });
        }
      });
      
      // 兼容旧的price_diff交易
      revenue += dayTransactions
        .filter((t) => t.type === "price_diff")
        .reduce((sum, t) => sum + t.amount, 0);

      const recharge = dayTransactions
        .filter((t) => t.type === "recharge")
        .reduce((sum, t) => sum + t.amount, 0);

      // 消耗 = 储值卡/次卡消费（不包括补差价）
      const consumption = dayTransactions
        .filter((t) => 
          (t.type === "consume" && t.paymentMethod === "balance") || 
          t.type === "card_deduct"
        )
        .reduce((sum, t) => sum + t.amount, 0);

      days.push({
        date: format(date, "M/d", { locale: zhCN }),
        实收: revenue,
        充值: recharge,
        消耗: consumption,
      });
    }
    return days;
  }, [transactions]);

  // 计算总计数据
  const totalStats = useMemo(() => {
    const validTransactions = transactions.filter(t => !t.voided);
    
    let revenue = validTransactions
      .filter((t) => 
        t.type === "consume" && 
        t.paymentMethod !== "balance" &&
        t.paymentMethod !== undefined
      )
      .reduce((sum, t) => sum + t.amount, 0);
    
    // 加上subTransactions中的补差价
    validTransactions.forEach((t) => {
      if (t.subTransactions) {
        t.subTransactions.forEach((sub) => {
          if (sub.type === 'price_diff') {
            revenue += sub.amount;
          }
        });
      }
    });
    
    // 兼容旧的price_diff交易
    revenue += validTransactions
      .filter((t) => t.type === "price_diff")
      .reduce((sum, t) => sum + t.amount, 0);

    const recharge = validTransactions
      .filter((t) => t.type === "recharge")
      .reduce((sum, t) => sum + t.amount, 0);

    const consumption = validTransactions
      .filter((t) => 
        (t.type === "consume" && t.paymentMethod === "balance") || 
        t.type === "card_deduct"
      )
      .reduce((sum, t) => sum + t.amount, 0);

    return { revenue, recharge, consumption };
  }, [transactions]);

  const statCards = [
    {
      title: "今日实收",
      value: `¥${todayStats.revenue.toFixed(0)}`,
      total: `累计: ¥${totalStats.revenue.toFixed(0)}`,
      icon: Wallet,
      color: "text-chart-1",
    },
    {
      title: "今日充值",
      value: `¥${todayStats.recharge.toFixed(0)}`,
      total: `累计: ¥${totalStats.recharge.toFixed(0)}`,
      icon: CreditCard,
      color: "text-chart-2",
    },
    {
      title: "今日消耗",
      value: `¥${todayStats.consumption.toFixed(0)}`,
      total: `累计: ¥${totalStats.consumption.toFixed(0)}`,
      icon: TrendingUp,
      color: "text-chart-3",
    },
    {
      title: "会员总数",
      value: members.length.toString(),
      total: `今日新增: ${todayStats.newMembers}`,
      icon: Users,
      color: "text-chart-4",
    },
  ];

  const hasData = transactions.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="数据报表"
        description="经营数据分析"
      >
        <Badge variant="outline" className="font-normal">
          近30天
        </Badge>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.total}
            icon={stat.icon}
            iconColor={stat.color}
          />
        ))}
      </div>

      {/* 指标说明 - 紧凑横向卡片 */}
      <div className="grid gap-3 md:grid-cols-3">
        {metricsInfo.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <HoverCard key={metric.id} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${metric.bgColor}`}>
                      <MetricIcon className={`h-5 w-5 ${metric.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{metric.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{metric.brief}</p>
                    </div>
                    <HelpCircle className="h-4 w-4 text-muted-foreground/50 shrink-0 ml-auto" />
                  </CardContent>
                </Card>
              </HoverCardTrigger>
              <HoverCardContent className="w-80" side="bottom" align="start">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.bgColor}`}>
                      <MetricIcon className={`h-4 w-4 ${metric.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold">{metric.title}</p>
                      <p className="text-xs text-muted-foreground">{metric.brief}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="font-medium text-xs text-muted-foreground mb-1">计算公式</p>
                      <p className="font-mono text-xs">{metric.formula}</p>
                    </div>
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">示例</p>
                      <p className="text-xs">{metric.example}</p>
                    </div>
                    <p className="text-xs text-muted-foreground/80 italic flex items-start gap-1">
                      <span>💡</span>
                      <span>{metric.note}</span>
                    </p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>

      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title="暂无数据"
          description="产生交易后将自动生成报表"
        />
      ) : (
        <>
          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 收入趋势 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  30天收入趋势
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>实收：现金/微信/支付宝+补差价</p>
                      <p>充值：储值卡/次卡入账</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        className="fill-muted-foreground"
                      />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `¥${value}`}
                        className="fill-muted-foreground"
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number) => [`¥${value}`, ""]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="实收"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="充值"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 消耗趋势 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  30天消耗趋势
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>消耗：余额+次卡实际服务金额</p>
                      <p>不含补差价部分</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        className="fill-muted-foreground"
                      />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `¥${value}`}
                        className="fill-muted-foreground"
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number) => [`¥${value}`, ""]}
                      />
                      <Bar
                        dataKey="消耗"
                        fill="hsl(var(--chart-3))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
