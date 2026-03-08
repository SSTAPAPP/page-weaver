import { useMemo } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useTodayStats, useTransactions, useMembers } from "@/hooks/useCloudData";
import { printReport } from "@/lib/print";
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
  TrendingUp,
} from "recharts";

const metricsInfo: Record<string, { title: string; brief: string; formula: string; note: string }> = {
  "今日实收": {
    title: "实收金额",
    brief: "真实进账现金流",
    formula: "现金 + 微信 + 支付宝 + 补差价",
    note: "余额消费不计入（已在充值时收过）",
  },
  "今日充值": {
    title: "充值金额",
    brief: "储值/次卡销售额",
    formula: "储值卡销售 + 次卡销售",
    note: "预收款项，体现客户信任度",
  },
  "今日消耗": {
    title: "消耗金额",
    brief: "余额/次卡核销值",
    formula: "余额消费 + 次卡消费（按原价）",
    note: "补差价不计入（已在实收统计）",
  },
};

function StatMetric({ label, value, sub, loading, infoKey }: {
  label: string; value: string; sub: string; loading?: boolean; infoKey?: string;
}) {
  const info = infoKey ? metricsInfo[infoKey] : undefined;
  const content = (
    <div className="flex-1 min-w-0 py-1 cursor-default">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold tracking-tight tabular-nums">
        {loading ? <Skeleton className="h-7 w-20" /> : value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );

  if (info) {
    return (
      <HoverCard openDelay={100} closeDelay={50}>
        <HoverCardTrigger asChild>{content}</HoverCardTrigger>
        <HoverCardContent className="w-72 text-sm" side="bottom" align="start">
          <p className="font-medium mb-1">{info.title}</p>
          <p className="text-xs text-muted-foreground mb-2">{info.brief}</p>
          <div className="rounded-md bg-muted/50 p-2 mb-2">
            <p className="text-xs text-muted-foreground mb-0.5">计算公式</p>
            <p className="font-mono text-xs">{info.formula}</p>
          </div>
          <p className="text-xs text-muted-foreground/80 italic">{info.note}</p>
        </HoverCardContent>
      </HoverCard>
    );
  }
  return content;
}

export default function Reports() {
  const { data: todayStats, isLoading: isStatsLoading } = useTodayStats();
  const { data: transactions = [], isLoading: isTxLoading } = useTransactions();
  const { data: members = [] } = useMembers();

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
        .filter((t) => t.type === "consume" && t.paymentMethod !== "balance" && t.paymentMethod !== undefined)
        .reduce((sum, t) => sum + t.amount, 0);
      dayTransactions.forEach((t) => {
        if (t.type !== 'refund' && t.subTransactions) {
          t.subTransactions.forEach((sub) => { if (sub.type === 'price_diff') revenue += sub.amount; });
        }
      });
      revenue += dayTransactions.filter((t) => t.type === "price_diff").reduce((sum, t) => sum + t.amount, 0);
      const recharge = dayTransactions.filter((t) => t.type === "recharge").reduce((sum, t) => sum + t.amount, 0);
      const consumption = dayTransactions
        .filter((t) => (t.type === "consume" && t.paymentMethod === "balance") || t.type === "card_deduct")
        .reduce((sum, t) => sum + t.amount, 0);

      days.push({ date: format(date, "M/d", { locale: zhCN }), 实收: revenue, 充值: recharge, 消耗: consumption });
    }
    return days;
  }, [transactions]);

  const totalStats = useMemo(() => {
    const valid = transactions.filter(t => !t.voided);
    let revenue = valid.filter((t) => t.type === "consume" && t.paymentMethod !== "balance" && t.paymentMethod !== undefined).reduce((sum, t) => sum + t.amount, 0);
    valid.forEach((t) => {
      if (t.type !== 'refund' && t.subTransactions) {
        t.subTransactions.forEach((sub) => { if (sub.type === 'price_diff') revenue += sub.amount; });
      }
    });
    revenue += valid.filter((t) => t.type === "price_diff").reduce((sum, t) => sum + t.amount, 0);
    const recharge = valid.filter((t) => t.type === "recharge").reduce((sum, t) => sum + t.amount, 0);
    const consumption = valid.filter((t) => (t.type === "consume" && t.paymentMethod === "balance") || t.type === "card_deduct").reduce((sum, t) => sum + t.amount, 0);
    return { revenue, recharge, consumption };
  }, [transactions]);

  const isLoading = isStatsLoading || isTxLoading;
  const hasData = transactions.length > 0;

  return (
    <div className="space-y-8 print-report">
      <PageHeader title="数据报表" description="经营数据分析 · 鼠标移至指标查看说明">
        <Button variant="outline" size="sm" onClick={printReport} className="no-print">
          <Printer className="mr-1.5 h-3.5 w-3.5" />打印报表
        </Button>
        <Badge variant="outline" className="font-normal text-xs">近30天</Badge>
      </PageHeader>

      {/* Stats — horizontal strip, consistent with Dashboard */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
            <div className="px-5 py-4">
              <StatMetric label="今日实收" value={`¥${(todayStats?.revenue ?? 0).toFixed(0)}`} sub={`累计 ¥${totalStats.revenue.toFixed(0)}`} loading={isLoading} infoKey="今日实收" />
            </div>
            <div className="px-5 py-4">
              <StatMetric label="今日充值" value={`¥${(todayStats?.recharge ?? 0).toFixed(0)}`} sub={`累计 ¥${totalStats.recharge.toFixed(0)}`} loading={isLoading} infoKey="今日充值" />
            </div>
            <div className="px-5 py-4">
              <StatMetric label="今日消耗" value={`¥${(todayStats?.consumption ?? 0).toFixed(0)}`} sub={`累计 ¥${totalStats.consumption.toFixed(0)}`} loading={isLoading} infoKey="今日消耗" />
            </div>
            <div className="px-5 py-4">
              <StatMetric label="会员总数" value={members.length.toString()} sub={`今日新增 ${todayStats?.newMembers ?? 0}`} loading={isLoading} />
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <EmptyState icon={Printer} title="暂无数据" description="产生交易后将自动生成报表" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base font-serif">30天收入趋势</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `¥${value}`} className="fill-muted-foreground" />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} formatter={(value: number) => [`¥${value}`, ""]} />
                    <Legend />
                    <Line type="monotone" dataKey="实收" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="充值" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base font-serif">30天消耗趋势</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `¥${value}`} className="fill-muted-foreground" />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} formatter={(value: number) => [`¥${value}`, ""]} />
                    <Bar dataKey="消耗" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
