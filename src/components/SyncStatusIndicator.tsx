import { Cloud, CloudOff, RefreshCw, AlertCircle, Check, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCloudCounts, useManualSync } from "@/hooks/useCloudData";
import { cn } from "@/lib/utils";
import { useState, useRef, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface SyncStatusIndicatorProps {
  collapsed?: boolean;
}

export function SyncStatusIndicator({ collapsed }: SyncStatusIndicatorProps) {
  const { isOnline } = useOnlineStatus();
  const { data: cloudCounts, isLoading: isCountsLoading } = useCloudCounts();
  const manualSync = useManualSync();
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncLockRef = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doSync = useCallback(async () => {
    if (syncLockRef.current || !navigator.onLine) return;
    syncLockRef.current = true;
    setSyncState('syncing');

    try {
      await manualSync();
      setLastSyncTime(new Date());
      setSyncState('idle');
    } catch {
      setSyncState('error');
    } finally {
      syncLockRef.current = false;
    }
  }, [manualSync]);

  // Auto-sync on reconnect
  useEffect(() => {
    if (isOnline) {
      doSync();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heartbeat every 5 minutes
  useEffect(() => {
    heartbeatRef.current = setInterval(() => {
      if (navigator.onLine) doSync();
    }, 5 * 60 * 1000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [doSync]);

  const isSyncing = syncState === 'syncing';
  const syncError = syncState === 'error';

  const statusColor = !isOnline
    ? "text-muted-foreground"
    : syncError
      ? "text-destructive"
      : "text-chart-2";

  const statusIcon = !isOnline
    ? <CloudOff className="h-4 w-4" />
    : isSyncing
      ? <RefreshCw className="h-4 w-4 animate-spin" />
      : syncError
        ? <AlertCircle className="h-4 w-4" />
        : <Check className="h-4 w-4" />;

  const statusText = !isOnline
    ? "离线"
    : isSyncing
      ? "同步中..."
      : syncError
        ? "同步失败"
        : "已同步";

  const cloudTotal = cloudCounts?.total ?? 0;

  const tooltipContent = (
    <div className="space-y-1.5">
      <p className="font-medium">{statusText}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Database className="h-3 w-3" />
        <span>云端 {isCountsLoading ? "..." : cloudTotal} 条记录</span>
      </div>
      {lastSyncTime && (
        <p className="text-xs text-muted-foreground">
          上次同步: {format(lastSyncTime, "HH:mm:ss", { locale: zhCN })}
        </p>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={doSync}
              disabled={isSyncing || !isOnline}
              className={cn(
                "flex items-center justify-center rounded-lg border border-sidebar-border/50 bg-sidebar-accent/50 p-2 transition-colors hover:bg-sidebar-accent",
                statusColor
              )}
            >
              {statusIcon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1">
      <div className="rounded-lg border border-sidebar-border/50 bg-sidebar-accent/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-2", statusColor)}>
            {statusIcon}
            <span className="text-xs font-medium">{statusText}</span>
          </div>
          {isOnline && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={doSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
            </Button>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Database className="h-3 w-3" />
          <span>云端 {isCountsLoading ? "..." : cloudTotal} 条</span>
        </div>
      </div>

      {lastSyncTime && (
        <p className="text-xs text-muted-foreground px-3">
          上次: {format(lastSyncTime, "HH:mm", { locale: zhCN })}
        </p>
      )}
    </div>
  );
}
