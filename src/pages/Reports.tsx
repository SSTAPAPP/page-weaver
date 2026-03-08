import { useMemo } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { TrendingUp, Wallet, CreditCard, Users, Receipt, Activity, PiggyBank, CreditCardIcon } from "lucide-react";
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


interface StatCardWithTooltipProps {
  title: string;
  value: string;
  total: string;
  icon: React.ElementType;
  color: string;
}

function StatCardWithTooltip({ title, value, total, icon: Icon, color }: StatCardWithTooltipProps) {
  return (
    <Card className="relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm font-medium text-muted-foreground">
          {title}
        </p>
        <Icon className={`h-4 w-4 ${color}`} />
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

  const extraStats = useMemo(() => {
    const validTx = transactions.filter(t => !t.voided);
    const consumeTx = validTx.filter(
      (t) => t.type === "consume" || t.type === "card_deduct"
    );
    const totalTxCount = consumeTx.length;
    const avgSpend = totalTxCount > 0
      ? consumeTx.reduce((s, t) => s + t.amount, 0) / totalTxCount
      : 0;
    const totalBalance = members.reduce((s, m) => s + m.balance, 0);
    const totalCards = members.reduce((s, m) => s + m.cards.filter(c => c.remainingCount > 0).length, 0);

    const todayTx = validTx.filter(t => {
      const d = new Date(t.createdAt);
      const now = new Date();
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const todayConsumeTx = todayTx.filter(t => t.type === "consume" || t.type === "card_deduct");
    const todayTxCount = todayConsumeTx.length;
    const todayAvg = todayTxCount > 0
      ? todayConsumeTx.reduce((s, t) => s + t.amount, 0) / todayTxCount
      : 0;

    return { totalTxCount, avgSpend, totalBalance, totalCards, todayTxCount, todayAvg };
  }, [transactions, members]);

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
      title: "交易笔数",
      value: extraStats.todayTxCount.toString(),
      total: `累计: ${extraStats.totalTxCount}笔`,
      icon: Receipt,
      color: "text-chart-5",
    },
    {
      title: "客单价",
      value: `¥${extraStats.todayAvg.toFixed(0)}`,
      total: `平均: ¥${extraStats.avgSpend.toFixed(0)}`,
      icon: Activity,
      color: "text-chart-1",
    },
    {
      title: "会员总数",
      value: members.length.toString(),
      total: `今日新增: ${todayStats.newMembers}`,
      icon: Users,
      color: "text-chart-4",
    },
    {
      title: "储值总余额",
      value: `¥${extraStats.totalBalance.toFixed(0)}`,
      total: `${members.length}位会员`,
      icon: PiggyBank,
      color: "text-chart-2",
    },
    {
      title: "有效次卡",
      value: `${extraStats.totalCards}张`,
      total: `${members.filter(m => m.cards.some(c => c.remainingCount > 0)).length}位会员持有`,
      icon: CreditCardIcon,
      color: "text-chart-3",
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
