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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { useStore } from "@/stores/useStore";
import { NewAppointmentDialog } from "@/components/dialogs/NewAppointmentDialog";
import { AppointmentDetailDialog } from "@/components/dialogs/AppointmentDetailDialog";
import type { Appointment } from "@/types";

const statusMap = {
  pending: { label: "待确认", color: "bg-chart-4" },
  confirmed: { label: "已确认", color: "bg-primary" },
  cancelled: { label: "已取消", color: "bg-muted-foreground" },
  completed: { label: "已完成", color: "bg-chart-2" },
  noshow: { label: "已爽约", color: "bg-destructive" },
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function Appointments() {
  const { appointments } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 获取当月日历格子（包括前后补齐的日期）
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // 按日期分组预约
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const dateKey = format(new Date(apt.date), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, apt].sort((a, b) => a.time.localeCompare(b.time)));
    });
    return map;
  }, [appointments]);

  // 选中日期的预约
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return appointmentsByDate.get(dateKey) || [];
  }, [selectedDate, appointmentsByDate]);

  // 统计本月预约
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    let total = 0;
    let pending = 0;
    let confirmed = 0;
    let completed = 0;

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
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="预约管理"
        description="按月查看与管理客户预约，跟踪待确认、已确认及已完成状态"
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增预约
        </Button>
      </PageHeader>

      {/* 月度统计 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="本月预约"
          value={monthStats.total}
          icon={Calendar}
          iconColor="text-primary"
        />
        <StatCard
          title="待确认"
          value={monthStats.pending}
          icon={AlertCircle}
          iconColor="text-chart-4"
        />
        <StatCard
          title="已确认"
          value={monthStats.confirmed}
          icon={CheckCircle}
          iconColor="text-primary"
        />
        <StatCard
          title="已完成"
          value={monthStats.completed}
          icon={CheckCircle}
          iconColor="text-chart-2"
        />
      </div>

      {/* 日历 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              aria-label="上个月"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg">
              {format(currentMonth, "yyyy年 M月", { locale: zhCN })}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              aria-label="下个月"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 星期标题 */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((day, i) => (
              <div
                key={day}
                className={`py-2 text-center text-sm font-medium ${
                  i === 0 || i === 6 ? "text-destructive/70" : "text-muted-foreground"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDateClick(day); } }}
                  className={`min-h-[80px] cursor-pointer border-b border-r border-border p-1.5 transition-colors duration-150 hover:bg-muted/50 ${
                    !isCurrentMonth ? "bg-muted/20" : ""
                  } ${isSelected ? "bg-primary/10 ring-2 ring-inset ring-primary" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                        isToday(day)
                          ? "bg-primary text-primary-foreground"
                          : !isCurrentMonth
                          ? "text-muted-foreground/50"
                          : "text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayAppointments.length > 0 && (
                      <div className="flex items-center gap-1">
                        {pendingCount > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-chart-4 text-xs text-primary-foreground">
                            {pendingCount}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {dayAppointments.length}个
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* 显示最多2条预约 */}
                  <div className="mt-1 space-y-0.5">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className={`truncate rounded px-1 py-0.5 text-xs text-primary-foreground ${statusMap[apt.status].color}`}
                      >
                        {apt.time} {apt.memberName}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayAppointments.length - 2} 更多
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 预约详情弹窗 */}
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
