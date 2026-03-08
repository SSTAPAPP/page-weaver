import { useMemo } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useTodayStats, useTransactions, useMembers } from "@/hooks/useCloudData";
import { printReport } from "@/lib/print";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

const metricsInfo: Record<string, { title: string; formula: string; note: string }> = {
  "今日实收": { title: "实收金额", formula: "现金 + 微信 + 支付宝 + 补差价", note: "余额消费不计入" },
  "今日充值": { title: "充值金额", formula: "储值卡 + 次卡销售", note: "预收款项" },
  "今日消耗": { title: "消耗金额", formula: "余额消费 + 次卡消费", note: "补差价不计入" },
};

function Metric({ label, value, sub, loading, infoKey }: {
  label: string; value: string; sub: string; loading?: boolean; infoKey?: string;
}) {
  const info = infoKey ? metricsInfo[infoKey] : undefined;
  const content = (
    <div className="px-4 py-3 cursor-default">
      <p className="text-xs text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="h-6 w-20 mt-1" /> : (
        <p className="text-lg font-semibold tabular-nums mt-0.5">{value}</p>
      )}
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );

  if (info) {
    return (
      <HoverCard openDelay={100} closeDelay={50}>
        <HoverCardTrigger asChild>{content}</HoverCardTrigger>
        <HoverCardContent className="w-64 text-sm" side="bottom" align="start">
          <p className="font-medium text-xs mb-1">{info.title}</p>
          <div className="rounded bg-muted/50 p-2 mb-1.5">
            <p className="font-mono text-xs">{info.formula}</p>
          </div>
          <p className="text-xs text-muted-foreground">{info.note}</p>
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
      const dayTx = transactions.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= dayStart && d <= dayEnd && !t.voided;
      });

      let revenue = dayTx.filter((t) => t.type === "consume" && t.paymentMethod !== "balance" && t.paymentMethod !== undefined)
        .reduce((s, t) => s + t.amount, 0);
      dayTx.forEach((t) => {
        if (t.type !== 'refund' && t.subTransactions) {
          t.subTransactions.forEach((sub) => { if (sub.type === 'price_diff') revenue += sub.amount; });
        }
      });
      revenue += dayTx.filter((t) => t.type === "price_diff").reduce((s, t) => s + t.amount, 0);
      const recharge = dayTx.filter((t) => t.type === "recharge").reduce((s, t) => s + t.amount, 0);
      const consumption = dayTx.filter((t) => (t.type === "consume" && t.paymentMethod === "balance") || t.type === "card_deduct")
        .reduce((s, t) => s + t.amount, 0);

      days.push({ date: format(date, "M/d", { locale: zhCN }), 实收: revenue, 充值: recharge, 消耗: consumption });
    }
    return days;
  }, [transactions]);

  const totalStats = useMemo(() => {
    const v = transactions.filter(t => !t.voided);
    let revenue = v.filter((t) => t.type === "consume" && t.paymentMethod !== "balance" && t.paymentMethod !== undefined).reduce((s, t) => s + t.amount, 0);
    v.forEach((t) => {
      if (t.type !== 'refund' && t.subTransactions) {
        t.subTransactions.forEach((sub) => { if (sub.type === 'price_diff') revenue += sub.amount; });
      }
    });
    revenue += v.filter((t) => t.type === "price_diff").reduce((s, t) => s + t.amount, 0);
    const recharge = v.filter((t) => t.type === "recharge").reduce((s, t) => s + t.amount, 0);
    const consumption = v.filter((t) => (t.type === "consume" && t.paymentMethod === "balance") || t.type === "card_deduct").reduce((s, t) => s + t.amount, 0);
    return { revenue, recharge, consumption };
  }, [transactions]);

  const isLoading = isStatsLoading || isTxLoading;
  const hasData = transactions.length > 0;

  return (
    <div className="space-y-6 print-report">
      <PageHeader title="数据报表" description="近30天经营数据">
        <Button variant="outline" size="sm" className="h-8 text-xs no-print" onClick={printReport}>
          <Printer className="mr-1 h-3 w-3" />打印
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
            <Metric label="今日实收" value={`¥${(todayStats?.revenue ?? 0).toFixed(0)}`} sub={`累计 ¥${totalStats.revenue.toFixed(0)}`} loading={isLoading} infoKey="今日实收" />
            <Metric label="今日充值" value={`¥${(todayStats?.recharge ?? 0).toFixed(0)}`} sub={`累计 ¥${totalStats.recharge.toFixed(0)}`} loading={isLoading} infoKey="今日充值" />
            <Metric label="今日消耗" value={`¥${(todayStats?.consumption ?? 0).toFixed(0)}`} sub={`累计 ¥${totalStats.consumption.toFixed(0)}`} loading={isLoading} infoKey="今日消耗" />
            <Metric label="会员总数" value={members.length.toString()} sub={`今日新增 ${todayStats?.newMembers ?? 0}`} loading={isLoading} />
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <EmptyState icon={Printer} title="暂无数据" description="产生交易后自动生成报表" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">30天收入趋势</p>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${v}`} className="fill-muted-foreground" />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "12px" }} formatter={(v: number) => [`¥${v}`, ""]} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Line type="monotone" dataKey="实收" stroke="hsl(var(--chart-1))" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="充值" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">30天消耗趋势</p>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${v}`} className="fill-muted-foreground" />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "12px" }} formatter={(v: number) => [`¥${v}`, ""]} />
                    <Bar dataKey="消耗" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
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
