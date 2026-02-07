import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { syncManager } from "@/lib/syncManager";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface SyncStatusIndicatorProps {
  collapsed?: boolean;
  lastSyncTime?: Date | null;
  onSync?: () => Promise<void>;
}

export function SyncStatusIndicator({ collapsed, lastSyncTime, onSync }: SyncStatusIndicatorProps) {
  const { isOnline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    const count = syncManager.getPendingCount();
    setPendingCount(count);
  }, []);

  const handleSync = async () => {
    if (!onSync || isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    setSyncError(false);
    
    try {
      await onSync();
      setPendingCount(syncManager.getPendingCount());
    } catch {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return "text-muted-foreground";
    if (syncError) return "text-destructive";
    if (pendingCount > 0) return "text-amber-500";
    return "text-emerald-500";
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

  const content = (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-background/50",
      collapsed && "justify-center px-2"
    )}>
      <div className={cn("flex items-center gap-2", getStatusColor())}>
        {getStatusIcon()}
        {!collapsed && (
          <span className="text-xs font-medium">{getStatusText()}</span>
        )}
      </div>
      
      {!collapsed && isOnline && onSync && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 ml-auto"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
        </Button>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="space-y-1">
              <p className="font-medium">{getStatusText()}</p>
              {lastSyncTime && (
                <p className="text-xs text-muted-foreground">
                  上次同步: {format(lastSyncTime, 'HH:mm', { locale: zhCN })}
                </p>
              )}
              {pendingCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {pendingCount} 条待同步
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1">
      {content}
      {lastSyncTime && (
        <p className="text-xs text-muted-foreground px-3">
          上次: {format(lastSyncTime, 'HH:mm', { locale: zhCN })}
        </p>
      )}
    </div>
  );
}
