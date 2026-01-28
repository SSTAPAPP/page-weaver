import { useMemo, useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { TrendingUp, Wallet, CreditCard, Users, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const metricsDetails = [
  {
    id: "revenue",
    title: "实收金额",
    color: "bg-chart-1",
    description: "统计通过现金、微信、支付宝等方式实际收到的金额。包括散客消费、会员补差价等真实进账。",
    calculation: "实收 = 现金收款 + 微信收款 + 支付宝收款 + 补差价收入",
    example: "例：会员A余额50元，消费80元，补差价30元现金 → 计入实收30元",
    note: "会员使用储值余额消费不计入实收，因为余额是之前充值时已经收过的钱。",
  },
  {
    id: "recharge",
    title: "充值金额",
    color: "bg-chart-2",
    description: "统计售出储值卡和次卡的金额，属于预收款项，反映店铺的现金流入。",
    calculation: "充值 = 储值卡销售额 + 次卡销售额",
    example: "例：会员B充值500元储值卡 → 计入充值500元",
    note: "充值金额在会员消费时会转化为消耗金额。",
  },
  {
    id: "consumption",
    title: "消耗金额",
    color: "bg-chart-3",
    description: "统计会员使用余额或次卡消费的金额，反映店铺的实际服务量和会员活跃度。",
    calculation: "消耗 = 余额消费 + 次卡消费（按服务原价计算）",
    example: "例：会员C用余额支付38元洗剪吹 → 计入消耗38元",
    note: "补差价部分不计入消耗，因为补差价是实际收款，应计入实收。",
  },
];

export default function Reports() {
  const { transactions, members, getTodayStats } = useStore();
  const todayStats = getTodayStats();
  const [metricsOpen, setMetricsOpen] = useState(false);

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

      // 实收 = 现金/微信/支付宝支付（包括补差价）
      const revenue = dayTransactions
        .filter((t) => 
          (t.type === "consume" || t.type === "price_diff") && 
          t.paymentMethod !== "balance" &&
          t.paymentMethod !== undefined
        )
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
    
    const revenue = validTransactions
      .filter((t) => 
        (t.type === "consume" || t.type === "price_diff") && 
        t.paymentMethod !== "balance" &&
        t.paymentMethod !== undefined
      )
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
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
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
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
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

          {/* 指标说明 - 可折叠 */}
          <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer pb-3 transition-colors hover:bg-muted/30">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      指标说明
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {metricsOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {metricsDetails.map((metric) => (
                      <div
                        key={metric.id}
                        className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-3 w-3 rounded-full ${metric.color}`} />
                          <p className="font-semibold">{metric.title}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground">{metric.description}</p>
                          <div className="rounded bg-muted/50 p-2">
                            <p className="font-medium text-foreground">{metric.calculation}</p>
                          </div>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">示例：</span>
                            {metric.example}
                          </p>
                          <p className="text-xs text-muted-foreground/80 italic">
                            💡 {metric.note}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}
    </div>
  );
}
