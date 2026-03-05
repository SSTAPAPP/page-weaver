import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { useUpdateAppointment } from "@/hooks/useCloudData";
import { toast } from "sonner";
import { Clock, User, Phone, Plus, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { Appointment } from "@/types";
import { useState } from "react";

const statusMap = {
  pending: { label: "待确认", variant: "secondary" as const, color: "bg-chart-4", icon: AlertCircle },
  confirmed: { label: "已确认", variant: "default" as const, color: "bg-primary", icon: CheckCircle },
  cancelled: { label: "已取消", variant: "outline" as const, color: "bg-muted-foreground", icon: XCircle },
  completed: { label: "已完成", variant: "default" as const, color: "bg-chart-2", icon: CheckCircle },
  noshow: { label: "已爽约", variant: "destructive" as const, color: "bg-destructive", icon: XCircle },
};

interface AppointmentDetailDialogProps {
  selectedDate: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAppointment: () => void;
  appointments: Appointment[];
}

export function AppointmentDetailDialog({
  selectedDate,
  open,
  onOpenChange,
  onAddAppointment,
  appointments,
}: AppointmentDetailDialogProps) {
  const updateAppointment = useUpdateAppointment();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleUpdateStatus = async (id: string, status: Appointment["status"]) => {
    setIsUpdating(id);
    try {
      await updateAppointment.mutateAsync({ id, updates: { status } });
      toast.success("状态已更新", {
        description: `预约已${statusMap[status].label}`,
      });
    } catch {
      toast.error("更新失败", { description: "请检查网络连接" });
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {selectedDate && format(selectedDate, "M月d日 EEEE", { locale: zhCN })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            查看和管理当天预约
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <Button className="mb-4 w-full" onClick={onAddAppointment}>
            <Plus className="mr-2 h-4 w-4" />
            添加预约
          </Button>

          {appointments.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="当天暂无预约"
              description="点击上方按钮添加预约"
            />
          ) : (
            <ScrollArea className="h-[calc(85vh-200px)]">
              <div className="space-y-3 pr-4">
                {appointments.map((apt) => {
                  const StatusIcon = statusMap[apt.status].icon;
                  return (
                    <div
                      key={apt.id}
                      className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{apt.memberName}</p>
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {apt.memberPhone}
                            </p>
                          </div>
                        </div>
                        <Badge variant={statusMap[apt.status].variant}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusMap[apt.status].label}
                        </Badge>
                      </div>

                      <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/50 p-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{apt.time}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">{apt.serviceName}</span>
                      </div>

                      {apt.status === "pending" && (
                        <div className="mt-4 flex gap-2">
                          <LoadingButton
                            size="sm"
                            className="flex-1"
                            loading={isUpdating === apt.id}
                            onClick={() => handleUpdateStatus(apt.id, "confirmed")}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            确认
                          </LoadingButton>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={isUpdating === apt.id}
                            onClick={() => handleUpdateStatus(apt.id, "cancelled")}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            取消
                          </Button>
                        </div>
                      )}
                      {apt.status === "confirmed" && (
                        <div className="mt-4 flex gap-2">
                          <LoadingButton
                            size="sm"
                            className="flex-1"
                            loading={isUpdating === apt.id}
                            onClick={() => handleUpdateStatus(apt.id, "completed")}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            完成服务
                          </LoadingButton>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            disabled={isUpdating === apt.id}
                            onClick={() => handleUpdateStatus(apt.id, "noshow")}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            标记爽约
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
