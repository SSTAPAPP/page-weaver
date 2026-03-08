import { useState, useMemo } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useAppointments } from "@/hooks/useCloudData";
import { NewAppointmentDialog } from "@/components/dialogs/NewAppointmentDialog";
import { AppointmentDetailDialog } from "@/components/dialogs/AppointmentDetailDialog";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待确认", color: "bg-muted-foreground/30" },
  confirmed: { label: "已确认", color: "bg-foreground" },
  cancelled: { label: "已取消", color: "bg-muted-foreground/15" },
  completed: { label: "已完成", color: "bg-foreground/50" },
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
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
    });
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
    return appointmentsByDate.get(format(selectedDate, "yyyy-MM-dd")) || [];
  }, [selectedDate, appointmentsByDate]);

  const monthStats = useMemo(() => {
    const ms = startOfMonth(currentMonth);
    const me = endOfMonth(currentMonth);
    let total = 0, pending = 0;
    appointments.forEach((apt) => {
      const d = new Date(apt.date);
      if (d >= ms && d <= me) {
        total++;
        if (apt.status === "pending") pending++;
      }
    });
    return { total, pending };
  }, [appointments, currentMonth]);

  const getAppointmentsForDay = (date: Date) => {
    return appointmentsByDate.get(format(date, "yyyy-MM-dd")) || [];
  };

  return (
    <div className="space-y-6">
      <PageHeader title="预约管理" description={`本月 ${monthStats.total} 预约${monthStats.pending > 0 ? ` · ${monthStats.pending} 待确认` : ""}`}>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />新增预约
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold tracking-tight">
              {format(currentMonth, "yyyy年 M月", { locale: zhCN })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className={cn(
                "py-2.5 text-center text-xs font-medium",
                (i === 0 || i === 6) ? "text-muted-foreground/40" : "text-muted-foreground"
              )}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => { setSelectedDate(day); setDetailDialogOpen(true); }}
                  className={cn(
                    "min-h-[72px] sm:min-h-[80px] cursor-pointer border-b border-r border-border p-1.5 transition-colors hover:bg-accent/30",
                    !isCurrentMonth && "opacity-25",
                    isSelected && "bg-accent/40"
                  )}
                >
                  <span className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs",
                    isToday(day) ? "bg-foreground text-background font-semibold" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div key={apt.id} className={cn(
                        "truncate rounded-md px-1 py-0.5 text-2xs text-background",
                        statusMap[apt.status]?.color || "bg-muted"
                      )}>
                        {apt.time} {apt.memberName}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-2xs text-muted-foreground px-1">+{dayAppointments.length - 2}</div>
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
        onAddAppointment={() => { setDetailDialogOpen(false); setDialogOpen(true); }}
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
