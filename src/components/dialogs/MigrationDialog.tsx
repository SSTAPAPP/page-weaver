import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Cloud, Check, AlertCircle, Loader2 } from "lucide-react";
import { migrationService, MigrationProgress } from "@/lib/migration";
import { useToast } from "@/hooks/use-toast";

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function MigrationDialog({ open, onOpenChange, onComplete }: MigrationDialogProps) {
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    
    const result = await migrationService.migrateToCloud((p) => {
      setProgress(p);
    });

    setIsMigrating(false);

    if (result.success) {
      setCompleted(true);
      toast({
        title: "迁移完成",
        description: "所有数据已成功迁移到云端",
      });
      onComplete?.();
    } else {
      setError(result.error || "迁移过程中发生未知错误");
    }
  };

  const handleClose = () => {
    if (!isMigrating) {
      onOpenChange(false);
      if (completed) {
        setCompleted(false);
        setProgress(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            数据迁移到云端
          </DialogTitle>
          <DialogDescription>
            将本地存储的数据迁移到云端数据库，实现多设备同步
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isMigrating && !completed && !error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                迁移过程将把本地数据上传到云端数据库。迁移完成后，您可以在任何设备上访问您的数据。
              </AlertDescription>
            </Alert>
          )}

          {isMigrating && progress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">正在迁移: {progress.stage}</span>
                <span className="font-medium">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                已处理 {progress.current} / {progress.total} 条记录
              </p>
            </div>
          )}

          {completed && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <p className="text-center font-medium">迁移完成！</p>
              <p className="text-sm text-muted-foreground text-center">
                所有数据已成功迁移到云端数据库
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {!completed && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isMigrating}>
                取消
              </Button>
              <Button onClick={handleMigrate} disabled={isMigrating}>
                {isMigrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    迁移中...
                  </>
                ) : (
                  <>
                    <Cloud className="mr-2 h-4 w-4" />
                    开始迁移
                  </>
                )}
              </Button>
            </>
          )}
          {completed && (
            <Button onClick={handleClose}>
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
