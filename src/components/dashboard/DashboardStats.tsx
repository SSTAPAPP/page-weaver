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
}

interface DashboardStatsProps {
  stats: TodayStats | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  hidden: boolean;
}

function formatCurrency(n: number) {
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MetricSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-12" />
      <Skeleton className={cn("h-8", wide ? "w-28" : "w-16")} />
    </div>
  );
}

export function DashboardStats({ stats, isLoading, isError, refetch, hidden }: DashboardStatsProps) {
  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-sm text-destructive">统计数据加载失败</p>
        <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1.5 text-xs" onClick={refetch}>
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
    <div className={cn("transition-opacity duration-300", hidden && "opacity-30 select-none")}>
      {/* Hero metric — revenue */}
      <div className="mb-6">
        {isLoading ? (
          <MetricSkeleton wide />
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-1">今日实收</p>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {hidden ? "****" : `¥${formatCurrency(revenue)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">现金 · 微信 · 支付宝 · 补差价</p>
          </>
        )}
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-lg border bg-border overflow-hidden">
        <SecondaryMetric
          label="充值"
          value={hidden ? "****" : `¥${formatCurrency(recharge)}`}
          sub="储值/次卡"
          loading={isLoading}
        />
        <SecondaryMetric
          label="消耗"
          value={hidden ? "****" : `¥${formatCurrency(consumption)}`}
          sub="余额+次卡"
          loading={isLoading}
        />
        <SecondaryMetric
          label="新会员"
          value={hidden ? "**" : newMembers.toString()}
          sub="今日注册"
          loading={isLoading}
          highlight={newMembers > 0}
        />
        <SecondaryMetric
          label="预约"
          value={hidden ? "**" : appointments.toString()}
          sub="待服务"
          loading={isLoading}
          highlight={appointments > 0}
        />
      </div>
    </div>
  );
}

function SecondaryMetric({
  label,
  value,
  sub,
  loading,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card px-4 py-3">
      {loading ? (
        <MetricSkeleton />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn(
            "text-lg font-semibold tabular-nums mt-0.5",
            highlight && "text-primary"
          )}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </>
      )}
    </div>
  );
}
