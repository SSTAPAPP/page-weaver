import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { searchMembers, services, addAppointment } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchMembers>>([]);
  const [selectedMember, setSelectedMember] = useState<ReturnType<typeof searchMembers>[0] | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [date, setDate] = useState<Date>(defaultDate);
  const [time, setTime] = useState("");

  const handleSearch = () => {
    if (searchQuery.length < 2) return;
    setSearchResults(searchMembers(searchQuery));
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedMember(null);
    setSelectedService("");
    setDate(new Date());
    setTime("");
  };

  const handleSubmit = () => {
    if (!selectedMember || !selectedService || !date || !time) {
      toast({
        title: "请填写完整信息",
        variant: "destructive",
      });
      return;
    }

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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增预约</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索会员 */}
          <div className="space-y-2">
            <Label>选择会员</Label>
            {selectedMember ? (
              <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
                <div>
                  <p className="font-medium">{selectedMember.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.phone}</p>
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
                <div className="flex gap-2">
                  <Input
                    placeholder="输入手机号或姓名搜索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button variant="secondary" size="icon" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-32 space-y-2 overflow-auto">
                    {searchResults.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          setSelectedMember(member);
                          setSearchResults([]);
                        }}
                        className="cursor-pointer rounded-lg border border-border p-2 transition-colors hover:bg-muted/50"
                      >
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 选择服务 */}
          <div className="space-y-2">
            <Label>选择服务</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="请选择服务项目" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - ¥{service.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  initialFocus
                  className="pointer-events-auto p-3"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 选择时间 */}
          <div className="space-y-2">
            <Label>预约时间</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
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
          </div>

          {/* 提交 */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              确认预约
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
