import { useState, useMemo } from "react";
import { format, startOfDay, isSameDay, addDays, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/stores/useStore";
import { NewAppointmentDialog } from "@/components/dialogs/NewAppointmentDialog";

const statusMap = {
  pending: { label: "待确认", variant: "secondary" as const },
  confirmed: { label: "已确认", variant: "default" as const },
  cancelled: { label: "已取消", variant: "outline" as const },
  completed: { label: "已完成", variant: "default" as const },
  noshow: { label: "已爽约", variant: "destructive" as const },
};

export default function Appointments() {
  const { appointments, updateAppointment, services } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);

  const todayAppointments = useMemo(() => {
    return appointments
      .filter((a) => isSameDay(new Date(a.date), selectedDate))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  ];

  const getAppointmentForSlot = (time: string) => {
    return todayAppointments.find((a) => a.time === time);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">预约管理</h1>
          <p className="text-muted-foreground">管理客户预约</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增预约
        </Button>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">
              {format(selectedDate, "yyyy年M月d日 EEEE", { locale: zhCN })}
            </span>
            {isSameDay(selectedDate, new Date()) && (
              <Badge variant="secondary">今天</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Time Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {timeSlots.map((time) => {
          const appointment = getAppointmentForSlot(time);
          return (
            <Card
              key={time}
              className={`transition-colors ${
                appointment
                  ? "border-primary/50 bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{time}</span>
                  </div>
                  {appointment && (
                    <Badge variant={statusMap[appointment.status].variant}>
                      {statusMap[appointment.status].label}
                    </Badge>
                  )}
                </div>

                {appointment ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{appointment.memberName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {appointment.memberPhone}
                    </div>
                    <p className="text-sm">{appointment.serviceName}</p>

                    {/* 操作按钮 */}
                    {appointment.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            updateAppointment(appointment.id, { status: "confirmed" })
                          }
                        >
                          确认
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateAppointment(appointment.id, { status: "cancelled" })
                          }
                        >
                          取消
                        </Button>
                      </div>
                    )}
                    {appointment.status === "confirmed" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            updateAppointment(appointment.id, { status: "completed" })
                          }
                        >
                          完成服务
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateAppointment(appointment.id, { status: "noshow" })
                          }
                        >
                          标记爽约
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">空闲</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <NewAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedDate}
      />
    </div>
  );
}
