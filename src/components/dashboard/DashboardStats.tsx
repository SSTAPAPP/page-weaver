import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  if (previous === 0 && current > 0) return <span className="text-2xs text-foreground/60 ml-1">新增</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-2xs text-muted-foreground ml-1">持平</span>;
  return (
    <span className={cn("text-2xs font-medium ml-1", pct > 0 ? "text-foreground" : "text-muted-foreground")}>
      {pct > 0 ? `↑${pct}%` : `↓${Math.abs(pct)}%`}
    </span>
  );
}

export function DashboardStats({ stats, isLoading, isError, refetch, hidden }: DashboardStatsProps) {
  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
        <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
        <p className="text-xs text-muted-foreground">数据加载失败</p>
        <Button variant="ghost" size="sm" className="ml-auto h-6 gap-1 text-xs" onClick={refetch}>
          <RefreshCw className="h-3 w-3" />重试
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
    <div className={cn("transition-opacity duration-300", hidden && "opacity-20 select-none pointer-events-none")}>
      {/* Hero: revenue */}
      <div className="mb-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-9 w-32" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-0.5">今日实收</p>
            <div className="flex items-baseline">
              <p className="text-3xl font-bold tabular-nums tracking-tighter">
                {hidden ? "****" : `¥${fmt(revenue)}`}
              </p>
              {!hidden && <TrendLabel current={revenue} previous={stats?.yesterdayRevenue} />}
            </div>
          </>
        )}
      </div>

      {/* Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
            {[
              { label: "充值", value: `¥${fmt(recharge)}`, prev: stats?.yesterdayRecharge, cur: recharge },
              { label: "消耗", value: `¥${fmt(consumption)}`, prev: stats?.yesterdayConsumption, cur: consumption },
              { label: "新会员", value: newMembers.toString(), prev: stats?.yesterdayNewMembers, cur: newMembers },
              { label: "预约", value: appointments.toString() },
            ].map((m) => (
              <div key={m.label} className="px-4 py-3">
                {isLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <div className="flex items-baseline mt-0.5">
                      <p className="text-base font-semibold tabular-nums">
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
        </CardContent>
      </Card>
    </div>
  );
}
