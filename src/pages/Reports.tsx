import { useMemo } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { TrendingUp, Wallet, CreditCard, Users, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
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
  total: string;
  icon: React.ElementType;
  color: string;
}

function StatCardWithTooltip({ title, value, total, icon: Icon, color }: StatCardWithTooltipProps) {
  const metricInfo = metricsInfo[title];

  return (
    <Card className="relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm font-medium text-muted-foreground">
          {title}
        </p>
        <div className="flex items-center gap-1">
          {metricInfo && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-muted-foreground" aria-label={`${title}指标说明`}>
                  <Info className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" side="bottom" align="end">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{metricInfo.title}</p>
                      <p className="text-xs text-muted-foreground">{metricInfo.brief}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="font-medium text-xs text-muted-foreground mb-1">计算公式</p>
                      <p className="font-mono text-xs">{metricInfo.formula}</p>
                    </div>
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">示例</p>
                      <p className="text-xs">{metricInfo.example}</p>
                    </div>
                    <p className="text-xs text-muted-foreground/80 italic flex items-start gap-1">
                      <span>💡</span>
                      <span>{metricInfo.note}</span>
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{total}</p>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { transactions, members, getTodayStats } = useStore();
  const todayStats = getTodayStats();

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

      let revenue = dayTransactions
        .filter((t) => 
          t.type === "consume" && 
          t.paymentMethod !== "balance" &&
          t.paymentMethod !== undefined
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      dayTransactions.forEach((t) => {
        if (t.type !== 'refund' && t.subTransactions) {
          t.subTransactions.forEach((sub) => {
            if (sub.type === 'price_diff') {
              revenue += sub.amount;
            }
          });
        }
      });
      
      revenue += dayTransactions
        .filter((t) => t.type === "price_diff")
        .reduce((sum, t) => sum + t.amount, 0);

      const recharge = dayTransactions
        .filter((t) => t.type === "recharge")
        .reduce((sum, t) => sum + t.amount, 0);

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

  const totalStats = useMemo(() => {
    const validTransactions = transactions.filter(t => !t.voided);
    
    let revenue = validTransactions
      .filter((t) => 
        t.type === "consume" && 
        t.paymentMethod !== "balance" &&
        t.paymentMethod !== undefined
      )
      .reduce((sum, t) => sum + t.amount, 0);
    
    validTransactions.forEach((t) => {
      if (t.type !== 'refund' && t.subTransactions) {
        t.subTransactions.forEach((sub) => {
          if (sub.type === 'price_diff') {
            revenue += sub.amount;
          }
        });
      }
    });
    
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
        description="近30天营收趋势、充值消耗分析与会员增长统计"
      >
        <Badge variant="outline" className="font-normal">
          近30天
        </Badge>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCardWithTooltip
            key={stat.title}
            title={stat.title}
            value={stat.value}
            total={stat.total}
            icon={stat.icon}
            color={stat.color}
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full overflow-hidden">
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
                        width={50}
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full overflow-hidden">
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
                        width={50}
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
