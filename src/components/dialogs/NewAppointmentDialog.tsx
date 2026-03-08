import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingButton } from "@/components/ui/loading-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { matchMemberSearch } from "@/lib/pinyin";

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];

export function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultDate = new Date(),
}: NewAppointmentDialogProps) {
  const { toast } = useToast();
  const { members, services, addAppointment } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [date, setDate] = useState<Date>(defaultDate);
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 实时搜索
  const searchResults = useMemo(() => {
    if (searchQuery.length < 1) return [];
    return members.filter((m) => matchMemberSearch(m.name, m.phone, searchQuery)).slice(0, 5);
  }, [members, searchQuery]);

  const resetForm = () => {
    setSearchQuery("");
    setSelectedMember(null);
    setSelectedService("");
    setDate(new Date());
    setTime("");
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedMember) newErrors.member = "请选择会员";
    if (!selectedService) newErrors.service = "请选择服务";
    if (!time) newErrors.time = "请选择时间";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedMember) return;

    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 300));

      const service = services.find((s) => s.id === selectedService);
      if (!service) return;

      addAppointment({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        memberPhone: selectedMember.phone,
        serviceId: service.id,
        serviceName: service.name,
        date,
        time,
        status: "pending",
      });

      toast({
        title: "预约成功",
        description: `${selectedMember.name} - ${format(date, "M月d日")} ${time}`,
      });

      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增预约</DialogTitle>
          <DialogDescription>为会员创建新的预约</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索会员 */}
          <div className="space-y-2">
            <Label className={errors.member ? "text-destructive" : ""}>
              选择会员 <span className="text-destructive">*</span>
            </Label>
            {selectedMember ? (
              <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedMember.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedMember.phone}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMember(null)}
                >
                  更换
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索姓名、拼音首字母或手机号"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchResults.length > 0 && (
                  <ScrollArea className="max-h-32 rounded-lg border border-border">
                    {searchResults.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          setSelectedMember(member);
                          setSearchQuery("");
                          setErrors({ ...errors, member: "" });
                        }}
                        className="cursor-pointer p-2 transition-colors hover:bg-muted/50"
                      >
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                      </div>
                    ))}
                  </ScrollArea>
                )}
                {errors.member && (
                  <p className="text-sm text-destructive">{errors.member}</p>
                )}
              </>
            )}
          </div>

          {/* 选择服务 */}
          <div className="space-y-2">
            <Label className={errors.service ? "text-destructive" : ""}>
              选择服务 <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedService} onValueChange={(v) => {
              setSelectedService(v);
              setErrors({ ...errors, service: "" });
            }}>
              <SelectTrigger className={errors.service ? "border-destructive" : ""}>
                <SelectValue placeholder="请选择服务项目" />
              </SelectTrigger>
              <SelectContent>
                {services.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    暂无服务项目
                  </div>
                ) : (
                  services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - ¥{service.price}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.service && (
              <p className="text-sm text-destructive">{errors.service}</p>
            )}
          </div>

          {/* 选择日期 */}
          <div className="space-y-2">
            <Label>预约日期</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "yyyy年M月d日", { locale: zhCN }) : "选择日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="pointer-events-auto p-3"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 选择时间 */}
          <div className="space-y-2">
            <Label className={errors.time ? "text-destructive" : ""}>
              预约时间 <span className="text-destructive">*</span>
            </Label>
            <Select value={time} onValueChange={(v) => {
              setTime(v);
              setErrors({ ...errors, time: "" });
            }}>
              <SelectTrigger className={errors.time ? "border-destructive" : ""}>
                <SelectValue placeholder="请选择时间" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.time && (
              <p className="text-sm text-destructive">{errors.time}</p>
            )}
          </div>

          {/* 提交 */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <LoadingButton
              className="flex-1"
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              确认预约
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
