import { useState, useMemo, useEffect } from "react";
import {
  Download, Save, Eye, EyeOff, Database, AlertTriangle,
  Moon, Sun, Type, Store, MapPin, Phone, ChevronRight,
  Building, Palette, Lock, HardDrive, Cloud,
  History, FileSpreadsheet, FileText, Trash2,
  Upload, Check, Bell, BellOff, Keyboard,
  Monitor, Smartphone, Globe, Shield, Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormField } from "@/components/ui/form-field";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/stores/useStore";
import { useCloudCounts, useSettings, useUpdateSettings } from "@/hooks/useCloudData";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { settingsService } from "@/services/settingsService";
import { cn } from "@/lib/utils";
import { updateAdminPassword } from "@/lib/adminApi";
import { getStorageUsage, exportToCSV, printReport } from "@/lib/print";
import { migrationService } from "@/lib/migration";
import { MigrationDialog } from "@/components/dialogs/MigrationDialog";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const fontSizeLabels = {
  xs: "较小",
  sm: "小",
  base: "标准",
  lg: "大",
  xl: "较大",
};

type FontSize = "xs" | "sm" | "base" | "lg" | "xl";

type SettingsCategory = "shop" | "appearance" | "security" | "data" | "notifications" | "about";

const categories = [
  { id: "shop" as const, label: "店铺信息", icon: Building, description: "基本信息设置" },
  { id: "appearance" as const, label: "外观设置", icon: Palette, description: "主题与显示" },
  { id: "notifications" as const, label: "通知提醒", icon: Bell, description: "消息与提醒" },
  { id: "security" as const, label: "安全设置", icon: Lock, description: "密码与日志" },
  { id: "data" as const, label: "数据管理", icon: HardDrive, description: "导出与同步" },
  { id: "about" as const, label: "关于系统", icon: Info, description: "版本与帮助" },
];

const auditCategoryLabels: Record<string, string> = {
  member: "会员",
  transaction: "交易",
  service: "服务",
  card: "次卡",
  system: "系统",
  security: "安全",
};

const keyboardShortcuts = [
  { keys: ["Ctrl", "K"], description: "全局搜索" },
  { keys: ["Ctrl", "N"], description: "新增会员" },
  { keys: ["Ctrl", "R"], description: "快速充值" },
  { keys: ["Ctrl", ","], description: "打开设置" },
  { keys: ["Esc"], description: "关闭弹窗" },
];

export default function Settings() {
  const { toast } = useToast();
  const {
    members, transactions, shopInfo, setShopInfo,
    auditLogs, clearAuditLogs, syncConfig, setSyncConfig
  } = useStore();
  const { data: cloudCounts } = useCloudCounts();
  const { data: cloudSettings } = useSettings();
  const updateCloudSettings = useUpdateSettings();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();

  // Initialize from cloud settings
  useEffect(() => {
    if (cloudSettings) {
      setEditShopName(cloudSettings.shopInfo.name);
      setEditShopAddress(cloudSettings.shopInfo.address);
      setEditShopPhone(cloudSettings.shopInfo.phone);
    }
  }, [cloudSettings]);

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("shop");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingTx, setIsExportingTx] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">("csv");

  // 店铺信息编辑状态
  const [editShopName, setEditShopName] = useState(shopInfo.name);
  const [editShopAddress, setEditShopAddress] = useState(shopInfo.address);
  const [editShopPhone, setEditShopPhone] = useState(shopInfo.phone);
  const [isSavingShop, setIsSavingShop] = useState(false);

  // 通知设置
  const [notifyNewMember, setNotifyNewMember] = useState(true);
  const [notifyLowBalance, setNotifyLowBalance] = useState(true);
  const [notifyAppointment, setNotifyAppointment] = useState(true);
  const [notifyDailyReport, setNotifyDailyReport] = useState(false);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState("50");

  // 云端同步配置
  const [syncApiUrl, setSyncApiUrl] = useState(syncConfig.apiUrl);

  // 迁移对话框
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [isMigrated, setIsMigrated] = useState(() => migrationService.isMigrated());
  const [hasLocalData, setHasLocalData] = useState(() => migrationService.hasLocalData());

  // 检查是否需要迁移
  useEffect(() => {
    if (hasLocalData && !isMigrated) {
      const timer = setTimeout(() => {
        setShowMigrationDialog(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasLocalData, isMigrated]);

  // 存储使用情况
  const storageUsage = useMemo(() => getStorageUsage(), [members, transactions]);

  const handleExportMembers = async () => {
    if (members.length === 0) {
      toast({ title: "无数据可导出", description: "暂无会员数据", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      const exportData = members.map((m) => ({
        姓名: m.name, 手机号: m.phone, 性别: m.gender === "male" ? "男" : "女",
        余额: m.balance.toFixed(2), 次卡数量: m.cards.length,
        注册时间: new Date(m.createdAt).toLocaleDateString("zh-CN"),
      }));

      if (exportFormat === "pdf") {
        printReport();
        toast({ title: "打印预览已打开", description: "请在打印对话框中选择【另存为PDF】" });
      } else {
        const filename = `会员数据_${new Date().toLocaleDateString("zh-CN")}.csv`;
        exportToCSV(exportData, filename);
        toast({ title: "导出成功", description: `已导出 ${members.length} 条会员数据` });
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTransactions = async () => {
    if (transactions.length === 0) {
      toast({ title: "无数据可导出", description: "暂无交易记录", variant: "destructive" });
      return;
    }

    setIsExportingTx(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      const typeLabels: Record<string, string> = {
        recharge: "充值", consume: "消费", card_deduct: "次卡消费", refund: "退款", price_diff: "补差价",
      };
      const exportData = transactions.map((t) => ({
        时间: new Date(t.createdAt).toLocaleString("zh-CN"), 会员: t.memberName,
        类型: typeLabels[t.type] || t.type, 金额: t.amount.toFixed(2),
        描述: t.description, 状态: t.voided ? "已作废" : "正常",
      }));
      const filename = `交易记录_${new Date().toLocaleDateString("zh-CN")}.csv`;
      exportToCSV(exportData, filename);
      toast({ title: "导出成功", description: `已导出 ${transactions.length} 条交易记录` });
    } finally {
      setIsExportingTx(false);
    }
  };

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {};
    if (!currentPassword) newErrors.current = "请输入当前密码";
    if (!newPassword) newErrors.new = "请输入新密码";
    else if (newPassword.length < 4) newErrors.new = "新密码至少需要4位";
    if (!confirmPassword) newErrors.confirm = "请确认新密码";
    else if (newPassword !== confirmPassword) newErrors.confirm = "两次输入的密码不一致";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;
    setIsSaving(true);
    try {
      const result = await updateAdminPassword(currentPassword, newPassword);
      if (!result.success) {
        setErrors({ current: result.error || "当前密码不正确" });
        return;
      }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setErrors({});
      toast({ title: "密码修改成功", description: "管理员密码已更新" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShopInfo = async () => {
    setIsSavingShop(true);
    try {
      const shopInfoData = { name: editShopName, address: editShopAddress, phone: editShopPhone };
      await settingsService.update({ shopInfo: shopInfoData });
      setShopInfo(shopInfoData);
      toast({ title: "保存成功", description: "店铺信息已更新并同步到云端" });
    } catch (error) {
      toast({ title: "保存失败", description: "请检查网络连接", variant: "destructive" });
    } finally {
      setIsSavingShop(false);
    }
  };

  const handleSaveSyncConfig = async () => {
    try {
      await settingsService.update({ syncConfig: { ...syncConfig, apiUrl: syncApiUrl } });
      setSyncConfig({ apiUrl: syncApiUrl });
      toast({ title: "保存成功", description: "同步配置已更新并保存到云端" });
    } catch (error) {
      toast({ title: "保存失败", variant: "destructive" });
    }
  };

  const fontSizeValue = ["xs", "sm", "base", "lg", "xl"].indexOf(fontSize);

  const renderContent = () => {
    switch (activeCategory) {
      case "shop":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">店铺信息</h3>
              <p className="text-sm text-muted-foreground">设置您的店铺基本信息，这些信息会显示在收据和报表上</p>
            </div>
            <Separator />
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="shop-name" className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  店铺名称
                </Label>
                <Input id="shop-name" value={editShopName} onChange={(e) => setEditShopName(e.target.value)} placeholder="请输入店铺名称" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  店铺地址
                </Label>
                <Input id="shop-address" value={editShopAddress} onChange={(e) => setEditShopAddress(e.target.value)} placeholder="请输入店铺地址" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  联系电话
                </Label>
                <Input id="shop-phone" value={editShopPhone} onChange={(e) => setEditShopPhone(e.target.value)} placeholder="请输入联系电话" />
              </div>
              <LoadingButton onClick={handleSaveShopInfo} loading={isSavingShop} className="mt-4">
                <Save className="mr-2 h-4 w-4" />
                保存店铺信息
              </LoadingButton>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">外观设置</h3>
              <p className="text-sm text-muted-foreground">自定义界面显示效果，让系统更符合您的使用习惯</p>
            </div>
            <Separator />
            <div className="space-y-6 max-w-md">
              {/* 主题模式 */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  主题模式
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light", label: "浅色", icon: Sun, desc: "明亮清爽" },
                    { value: "dark", label: "深色", icon: Moon, desc: "护眼模式" },
                    { value: "system", label: "系统", icon: Monitor, desc: "自动切换" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
                        theme === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30 hover:bg-accent/50"
                      )}
                    >
                      <option.icon className={cn("h-5 w-5", theme === option.value ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-medium", theme === option.value ? "text-primary" : "text-foreground")}>{option.label}</span>
                      <span className="text-[10px] text-muted-foreground">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 字体大小 */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    字体大小
                  </Label>
                  <p className="text-sm text-muted-foreground">当前：{fontSizeLabels[fontSize]}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-4">A</span>
                  <Slider
                    value={[fontSizeValue]}
                    onValueChange={(v) => setFontSize(["xs", "sm", "base", "lg", "xl"][v[0]] as FontSize)}
                    max={4} step={1} className="flex-1"
                  />
                  <span className="text-lg text-muted-foreground w-4">A</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground px-5">
                  <span>较小</span><span>小</span><span>标准</span><span>大</span><span>较大</span>
                </div>
              </div>

              <Separator />

              {/* 快捷键 */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4" />
                  键盘快捷键
                </Label>
                <div className="rounded-xl border border-border divide-y divide-border">
                  {keyboardShortcuts.map((shortcut) => (
                    <div key={shortcut.description} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd key={key} className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">通知提醒</h3>
              <p className="text-sm text-muted-foreground">管理系统的消息推送和提醒功能</p>
            </div>
            <Separator />
            <div className="space-y-4 max-w-md">
              {/* 会员通知 */}
              <div className="rounded-xl border border-border p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  会员相关
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">新会员注册通知</p>
                    <p className="text-xs text-muted-foreground">有新会员注册时发送提醒</p>
                  </div>
                  <Switch checked={notifyNewMember} onCheckedChange={setNotifyNewMember} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">余额不足提醒</p>
                    <p className="text-xs text-muted-foreground">会员余额低于阈值时提醒充值</p>
                  </div>
                  <Switch checked={notifyLowBalance} onCheckedChange={setNotifyLowBalance} />
                </div>
                {notifyLowBalance && (
                  <div className="flex items-center gap-3 pl-4">
                    <Label className="text-xs text-muted-foreground shrink-0">提醒阈值</Label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">¥</span>
                      <Input
                        type="number"
                        value={lowBalanceThreshold}
                        onChange={(e) => setLowBalanceThreshold(e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 预约通知 */}
              <div className="rounded-xl border border-border p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-chart-2" />
                  预约相关
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">预约提醒</p>
                    <p className="text-xs text-muted-foreground">预约时间前30分钟发送提醒</p>
                  </div>
                  <Switch checked={notifyAppointment} onCheckedChange={setNotifyAppointment} />
                </div>
              </div>

              {/* 报表通知 */}
              <div className="rounded-xl border border-border p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-chart-3" />
                  经营报表
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">每日经营报告</p>
                    <p className="text-xs text-muted-foreground">每日营业结束后发送经营数据汇总</p>
                  </div>
                  <Switch checked={notifyDailyReport} onCheckedChange={setNotifyDailyReport} />
                </div>
              </div>

              <Button onClick={() => toast({ title: "设置已保存", description: "通知偏好已更新" })}>
                <Save className="mr-2 h-4 w-4" />
                保存通知设置
              </Button>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">安全设置</h3>
              <p className="text-sm text-muted-foreground">管理员密码与操作日志</p>
            </div>
            <Separator />

            {/* 密码设置 */}
            <div className="space-y-4 max-w-md">
              <Alert className="border-warning/30 bg-warning/5">
                <Shield className="h-4 w-4 text-warning" />
                <AlertDescription>
                  默认密码为 <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">123456</code>，请尽快修改以保障账户安全
                </AlertDescription>
              </Alert>

              <FormField label="当前密码" required type={showPasswords ? "text" : "password"} value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} placeholder="请输入当前密码" error={errors.current} />
              <Separator />
              <FormField label="新密码" required type={showPasswords ? "text" : "password"} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} placeholder="请输入新密码（至少4位）" error={errors.new} />
              <FormField label="确认新密码" required type={showPasswords ? "text" : "password"} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="请再次输入新密码" error={errors.confirm} />

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowPasswords(!showPasswords)}>
                  {showPasswords ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {showPasswords ? "隐藏密码" : "显示密码"}
                </Button>
                <LoadingButton onClick={handleChangePassword} loading={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  保存修改
                </LoadingButton>
              </div>
            </div>

            <Separator />

            {/* 操作日志 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  操作日志
                </Label>
                {auditLogs.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                    onClick={() => { clearAuditLogs(); toast({ title: "日志已清空" }); }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    清空日志
                  </Button>
                )}
              </div>

              <div className="rounded-xl border border-border">
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <History className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">暂无操作记录</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="divide-y divide-border">
                      {auditLogs.slice(0, 100).map((log) => (
                        <div key={log.id} className="p-3 hover:bg-accent/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-[10px]">
                                  {auditCategoryLabels[log.category] || log.category}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(log.timestamp), "MM-dd HH:mm:ss", { locale: zhCN })}
                                </span>
                              </div>
                              <p className="text-sm font-medium truncate">{log.action}</p>
                              <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                共 {auditLogs.length} 条记录（最多保留1000条）
              </p>
            </div>
          </div>
        );

      case "data":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">数据管理</h3>
              <p className="text-sm text-muted-foreground">云端同步与数据导出</p>
            </div>
            <Separator />

            {/* 云端数据库状态 */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Lovable Cloud
              </Label>
              <div className="rounded-xl border border-border p-4 bg-accent/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">连接状态</p>
                    <p className="text-sm text-muted-foreground">Lovable Cloud 已启用</p>
                  </div>
                  <Badge variant="default" className="bg-success">
                    <Check className="mr-1 h-3 w-3" />
                    已连接
                  </Badge>
                </div>

                {/* Cloud data counts */}
                {cloudCounts && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-lg bg-background/60 p-2.5">
                      <p className="text-xs text-muted-foreground">会员</p>
                      <p className="font-semibold">{cloudCounts.members} 条</p>
                    </div>
                    <div className="rounded-lg bg-background/60 p-2.5">
                      <p className="text-xs text-muted-foreground">交易</p>
                      <p className="font-semibold">{cloudCounts.transactions} 条</p>
                    </div>
                    <div className="rounded-lg bg-background/60 p-2.5">
                      <p className="text-xs text-muted-foreground">服务</p>
                      <p className="font-semibold">{cloudCounts.services} 条</p>
                    </div>
                    <div className="rounded-lg bg-background/60 p-2.5">
                      <p className="text-xs text-muted-foreground">预约</p>
                      <p className="font-semibold">{cloudCounts.appointments} 条</p>
                    </div>
                  </div>
                )}

                {hasLocalData && !isMigrated && (
                  <Alert className="mt-3">
                    <Upload className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>检测到本地数据，建议迁移到云端</span>
                      <Button size="sm" onClick={() => setShowMigrationDialog(true)} className="ml-3">
                        开始迁移
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {isMigrated && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                    <Check className="h-4 w-4 text-success" />
                    数据已迁移到云端
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 数据导出 */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                数据导出
              </Label>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">导出格式：</span>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "excel" | "pdf")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />CSV</div>
                    </SelectItem>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />Excel</div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4" />PDF</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-accent/30">
                  <div>
                    <p className="font-medium">会员数据</p>
                    <p className="text-sm text-muted-foreground">云端 {cloudCounts?.members ?? members.length} 条记录</p>
                  </div>
                  <LoadingButton onClick={handleExportMembers} loading={isExporting} disabled={members.length === 0} size="sm">
                    <Download className="mr-2 h-4 w-4" />导出
                  </LoadingButton>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-accent/30">
                  <div>
                    <p className="font-medium">交易记录</p>
                    <p className="text-sm text-muted-foreground">云端 {cloudCounts?.transactions ?? transactions.length} 条记录</p>
                  </div>
                  <LoadingButton onClick={handleExportTransactions} loading={isExportingTx} disabled={transactions.length === 0} size="sm">
                    <Download className="mr-2 h-4 w-4" />导出
                  </LoadingButton>
                </div>
              </div>
            </div>

            <Separator />

            {/* 存储信息 */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                存储信息
              </Label>
              <div className="rounded-xl border border-border p-4 bg-accent/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">本地存储使用量</p>
                    <p className="text-sm text-muted-foreground">{storageUsage.usedKB} KB / {storageUsage.maxMB} MB</p>
                  </div>
                  <span className="text-sm font-medium">{storageUsage.percentage}%</span>
                </div>
                <Progress value={storageUsage.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  支持存储约 {Math.floor((storageUsage.maxMB * 1024 - parseFloat(storageUsage.usedKB)) / 0.5)} 位会员数据
                </p>
              </div>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">关于系统</h3>
              <p className="text-sm text-muted-foreground">系统版本和相关信息</p>
            </div>
            <Separator />

            {/* 系统品牌 */}
            <div className="flex flex-col items-center py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg mb-4">
                <span className="text-2xl font-black text-white">F</span>
              </div>
              <h2 className="text-xl font-bold">FFk Barber</h2>
              <p className="text-sm text-muted-foreground">理发店会员管理系统</p>
              <Badge variant="outline" className="mt-2">v1.0.0</Badge>
            </div>

            <Separator />

            {/* 系统信息 */}
            <div className="space-y-3">
              <Label>系统概况</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-accent/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">数据存储</p>
                  <p className="font-medium">Lovable Cloud</p>
                </div>
                <div className="rounded-xl bg-accent/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">客户端</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Web + Desktop
                  </p>
                </div>
                <div className="rounded-xl bg-accent/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">会员总数</p>
                  <p className="font-medium">{cloudCounts?.members ?? members.length} 位</p>
                </div>
                <div className="rounded-xl bg-accent/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">交易记录</p>
                  <p className="font-medium">{cloudCounts?.transactions ?? transactions.length} 条</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* 功能特性 */}
            <div className="space-y-3">
              <Label>功能特性</Label>
              <div className="space-y-2">
                {[
                  { icon: "shield", text: "安全认证与数据加密" },
                  { icon: "cloud", text: "云端数据同步，多设备使用" },
                  { icon: "smartphone", text: "响应式设计，支持桌面和移动端" },
                  { icon: "search", text: "拼音首字母智能搜索" },
                  { icon: "moon", text: "深色模式支持" },
                ].map((feature) => (
                  <div key={feature.text} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span className="text-muted-foreground">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="设置" description="系统设置和数据管理" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Navigation */}
        <Card className="lg:w-64 shrink-0">
          <CardContent className="p-2">
            <nav className="space-y-0.5">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{category.label}</p>
                      <p className={cn(
                        "text-[10px] truncate",
                        isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {category.description}
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground/50"
                    )} />
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Right Content Area */}
        <Card className="flex-1">
          <CardContent className="p-6">
            <ScrollArea className="h-full">
              {renderContent()}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Migration Dialog */}
      <MigrationDialog
        open={showMigrationDialog}
        onOpenChange={setShowMigrationDialog}
        onComplete={() => { setIsMigrated(true); setHasLocalData(false); }}
      />
    </div>
  );
}
