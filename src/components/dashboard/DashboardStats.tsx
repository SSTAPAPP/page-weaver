import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TodayStats {
  revenue: number;
  recharge: number;
  consumption: number;
  newMembers: number;
  appointments: number;
  yesterdayRevenue?: number;
  yesterdayRecharge?: number;
  yesterdayConsumption?: number;
  yesterdayNewMembers?: number;
}

interface DashboardStatsProps {
  stats: TodayStats | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  hidden: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TrendLabel({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined || (previous === 0 && current === 0)) return null;
  if (previous === 0 && current > 0) return <span className="text-xs text-foreground/50 ml-1.5">新增</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-xs text-muted-foreground ml-1.5">持平</span>;
  return (
    <span className={cn("text-xs font-medium ml-1.5", pct > 0 ? "text-foreground/70" : "text-muted-foreground")}>
      {pct > 0 ? `↑${pct}%` : `↓${Math.abs(pct)}%`}
    </span>
  );
}

export function DashboardStats({ stats, isLoading, isError, refetch, hidden }: DashboardStatsProps) {
  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border px-5 py-4">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-sm text-muted-foreground">数据加载失败</p>
        <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={refetch}>
          <RefreshCw className="h-3.5 w-3.5" />重试
        </Button>
      </div>
    );
  }

  const revenue = stats?.revenue ?? 0;
  const recharge = stats?.recharge ?? 0;
  const consumption = stats?.consumption ?? 0;
  const newMembers = stats?.newMembers ?? 0;
  const appointments = stats?.appointments ?? 0;

  return (
    <div className={cn("transition-opacity duration-500", hidden && "opacity-15 select-none pointer-events-none")}>
      {/* Hero: revenue */}
      <div className="mb-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-40" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-1">今日实收</p>
            <div className="flex items-baseline">
              <p className="text-4xl font-bold tabular-nums tracking-tighter">
                {hidden ? "****" : `¥${fmt(revenue)}`}
              </p>
              {!hidden && <TrendLabel current={revenue} previous={stats?.yesterdayRevenue} />}
            </div>
          </>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "充值", value: `¥${fmt(recharge)}`, prev: stats?.yesterdayRecharge, cur: recharge },
          { label: "消耗", value: `¥${fmt(consumption)}`, prev: stats?.yesterdayConsumption, cur: consumption },
          { label: "新会员", value: newMembers.toString(), prev: stats?.yesterdayNewMembers, cur: newMembers },
          { label: "预约", value: appointments.toString() },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border bg-card p-4 shadow-xs">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-12" />
                <Skeleton className="h-6 w-20" />
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                <div className="flex items-baseline">
                  <p className="text-lg font-semibold tabular-nums">
                    {hidden ? "****" : m.value}
                  </p>
                  {!hidden && m.cur !== undefined && m.prev !== undefined && (
                    <TrendLabel current={m.cur} previous={m.prev} />
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
