import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useAppointments } from "@/hooks/useCloudData";
import { NewAppointmentDialog } from "@/components/dialogs/NewAppointmentDialog";
import { AppointmentDetailDialog } from "@/components/dialogs/AppointmentDetailDialog";
import type { Appointment } from "@/types";

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待确认", color: "bg-chart-4" },
  confirmed: { label: "已确认", color: "bg-primary" },
  cancelled: { label: "已取消", color: "bg-muted-foreground" },
  completed: { label: "已完成", color: "bg-chart-2" },
  noshow: { label: "已爽约", color: "bg-destructive" },
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function Appointments() {
  const { data: appointments = [] } = useAppointments();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const dateKey = format(new Date(apt.date), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, apt].sort((a, b) => a.time.localeCompare(b.time)));
    });
    return map;
  }, [appointments]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return appointmentsByDate.get(dateKey) || [];
  }, [selectedDate, appointmentsByDate]);

  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    let total = 0, pending = 0, confirmed = 0, completed = 0;
    appointments.forEach((apt) => {
      const aptDate = new Date(apt.date);
      if (aptDate >= monthStart && aptDate <= monthEnd) {
        total++;
        if (apt.status === "pending") pending++;
        if (apt.status === "confirmed") confirmed++;
        if (apt.status === "completed") completed++;
      }
    });
    return { total, pending, confirmed, completed };
  }, [appointments, currentMonth]);

  const getAppointmentsForDay = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return appointmentsByDate.get(dateKey) || [];
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setDetailDialogOpen(true);
  };

  const handleAddAppointment = () => {
    setDetailDialogOpen(false);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="预约管理" description="管理客户预约">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />新增预约
        </Button>
      </PageHeader>

      {/* Month stats — inline text, consistent with Dashboard style */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">本月：</span>
        <Badge variant="secondary" className="font-normal">{monthStats.total} 预约</Badge>
        {monthStats.pending > 0 && <Badge variant="outline" className="font-normal">{monthStats.pending} 待确认</Badge>}
        {monthStats.confirmed > 0 && <Badge variant="outline" className="font-normal">{monthStats.confirmed} 已确认</Badge>}
        {monthStats.completed > 0 && <Badge variant="outline" className="font-normal">{monthStats.completed} 已完成</Badge>}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-base font-serif">
              {format(currentMonth, "yyyy年 M月", { locale: zhCN })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className={`py-2 text-center text-xs font-medium ${i === 0 || i === 6 ? "text-destructive/70" : "text-muted-foreground"}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const pendingCount = dayAppointments.filter((a) => a.status === "pending").length;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[72px] cursor-pointer border-b border-r border-border p-1.5 transition-colors hover:bg-muted/40 ${
                    !isCurrentMonth ? "bg-muted/20" : ""
                  } ${isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium ${
                      isToday(day)
                        ? "bg-primary text-primary-foreground"
                        : !isCurrentMonth
                        ? "text-muted-foreground/40"
                        : "text-foreground"
                    }`}>
                      {format(day, "d")}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-xs text-muted-foreground">{dayAppointments.length}</span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div key={apt.id} className={`truncate rounded px-1 py-0.5 text-xs text-primary-foreground ${statusMap[apt.status]?.color || "bg-muted"}`}>
                        {apt.time} {apt.memberName}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-muted-foreground">+{dayAppointments.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AppointmentDetailDialog
        selectedDate={selectedDate}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onAddAppointment={handleAddAppointment}
        appointments={selectedDayAppointments}
      />
      <NewAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedDate || new Date()}
      />
    </div>
  );
}
