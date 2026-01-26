import { useMemo } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/stores/useStore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function Reports() {
  const { transactions, members, appointments, getTodayStats } = useStore();
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
        return txDate >= dayStart && txDate <= dayEnd;
      });

      const revenue = dayTransactions
        .filter((t) => t.type === "consume" && t.paymentMethod !== "balance")
        .reduce((sum, t) => sum + t.amount, 0);

      const recharge = dayTransactions
        .filter((t) => t.type === "recharge")
        .reduce((sum, t) => sum + t.amount, 0);

      const consumption = dayTransactions
        .filter((t) => t.type === "consume" || t.type === "card_deduct")
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
    const revenue = transactions
      .filter((t) => t.type === "consume" && t.paymentMethod !== "balance")
      .reduce((sum, t) => sum + t.amount, 0);

    const recharge = transactions
      .filter((t) => t.type === "recharge")
      .reduce((sum, t) => sum + t.amount, 0);

    const consumption = transactions
      .filter((t) => t.type === "consume" || t.type === "card_deduct")
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
      value: members.length,
      total: `今日新增: ${todayStats.newMembers}`,
      icon: Users,
      color: "text-chart-4",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">数据报表</h1>
        <p className="text-muted-foreground">经营数据分析</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.total}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 收入趋势 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">30天收入趋势</CardTitle>
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
                  <Tooltip
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
                  />
                  <Line
                    type="monotone"
                    dataKey="充值"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 消耗趋势 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">30天消耗趋势</CardTitle>
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => [`¥${value}`, ""]}
                  />
                  <Bar dataKey="消耗" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">指标说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>实收金额：</strong>真正进账的钱（现金+微信+支付宝），会员余额扣费不属于实收。
          </p>
          <p>
            <strong>充值金额：</strong>今天卖了多少储值卡/次卡入账的钱。
          </p>
          <p>
            <strong>消耗金额：</strong>会员用了多少余额或次卡，反映店里的实际服务量。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
