import { Cloud, CloudOff, RefreshCw, AlertCircle, Check, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCloudCounts, useManualSync } from "@/hooks/useCloudData";
import { syncManager } from "@/lib/syncManager";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface SyncStatusIndicatorProps {
  collapsed?: boolean;
}

export function SyncStatusIndicator({ collapsed }: SyncStatusIndicatorProps) {
  const { isOnline } = useOnlineStatus();
  const { data: cloudCounts, isLoading: isCountsLoading } = useCloudCounts();
  const manualSync = useManualSync();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncError, setSyncError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    setPendingCount(syncManager.getPendingCount());
  }, []);

  // Auto-sync on reconnect
  useEffect(() => {
    if (isOnline && !isSyncing) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Heartbeat every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && !isSyncing) {
        handleSync();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const handleSync = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    setSyncError(false);

    try {
      await manualSync();
      setPendingCount(syncManager.getPendingCount());
      setLastSyncTime(new Date());
    } catch {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, manualSync]);

  const getStatusColor = () => {
    if (!isOnline) return "text-muted-foreground";
    if (syncError) return "text-destructive";
    if (pendingCount > 0) return "text-chart-4";
    return "text-chart-2";
  };

  const getStatusIcon = () => {
    if (!isOnline) return <CloudOff className="h-4 w-4" />;
    if (isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncError) return <AlertCircle className="h-4 w-4" />;
    if (pendingCount > 0) return <Cloud className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return "离线";
    if (isSyncing) return "同步中...";
    if (syncError) return "同步失败";
    if (pendingCount > 0) return `待同步 ${pendingCount}`;
    return "已同步";
  };

  const cloudTotal = cloudCounts?.total ?? 0;

  const tooltipContent = (
    <div className="space-y-1.5">
      <p className="font-medium">{getStatusText()}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Database className="h-3 w-3" />
        <span>云端 {isCountsLoading ? "..." : cloudTotal} 条记录</span>
      </div>
      {pendingCount > 0 && (
        <p className="text-xs text-muted-foreground">
          本地 {pendingCount} 条待同步
        </p>
      )}
      {lastSyncTime && (
        <p className="text-xs text-muted-foreground">
          上次同步: {format(lastSyncTime, "HH:mm:ss", { locale: zhCN })}
        </p>
      )}
    </div>
  );

  // Collapsed mode
  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className={cn(
                "flex items-center justify-center rounded-lg border border-border/50 bg-background/50 p-2 transition-colors hover:bg-accent",
                getStatusColor()
              )}
            >
              {getStatusIcon()}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Expanded mode
  return (
    <div className="space-y-1">
      <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-2", getStatusColor())}>
            {getStatusIcon()}
            <span className="text-xs font-medium">{getStatusText()}</span>
          </div>
          {isOnline && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
            </Button>
          )}
        </div>

        {/* Cloud count */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Database className="h-3 w-3" />
          <span>云端 {isCountsLoading ? "..." : cloudTotal} 条</span>
          {pendingCount > 0 && (
            <span className="text-chart-4">· 本地 {pendingCount} 待同步</span>
          )}
        </div>
      </div>

      {/* Last sync time */}
      {lastSyncTime && (
        <p className="text-xs text-muted-foreground px-3">
          上次: {format(lastSyncTime, "HH:mm", { locale: zhCN })}
        </p>
      )}
    </div>
  );
}
