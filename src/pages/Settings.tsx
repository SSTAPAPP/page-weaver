import { useState, useMemo, useEffect } from "react";
import {
  Download, Save, Eye, EyeOff, Database,
  Moon, Sun, Type, Store, MapPin, Phone,
  Building, Palette, Lock, HardDrive, Cloud,
  History, FileSpreadsheet, FileText, Trash2,
  Upload, Check, Keyboard,
  Monitor, Shield, Info, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormField } from "@/components/ui/form-field";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/stores/useStore";
import { useCloudCounts, useSettings, useUpdateSettings, useMembers, useTransactions } from "@/hooks/useCloudData";
import { toast } from "sonner";
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

type SettingsCategory = "shop" | "appearance" | "security" | "data" | "about";

const categories = [
  { id: "shop" as const, label: "店铺信息", icon: Building },
  { id: "appearance" as const, label: "外观设置", icon: Palette },
  { id: "security" as const, label: "安全设置", icon: Lock },
  { id: "data" as const, label: "数据管理", icon: HardDrive },
  { id: "about" as const, label: "关于", icon: Info },
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>;
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export default function Settings() {
  const {
    shopInfo, setShopInfo,
    auditLogs, clearAuditLogs, syncConfig, setSyncConfig
  } = useStore();
  const { data: members = [] } = useMembers();
  const { data: transactions = [] } = useTransactions();
  const { data: cloudCounts } = useCloudCounts();
  const { data: cloudSettings } = useSettings();
  const updateCloudSettings = useUpdateSettings();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();

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

  const [editShopName, setEditShopName] = useState(shopInfo.name);
  const [editShopAddress, setEditShopAddress] = useState(shopInfo.address);
  const [editShopPhone, setEditShopPhone] = useState(shopInfo.phone);
  const [isSavingShop, setIsSavingShop] = useState(false);

  const [syncApiUrl, setSyncApiUrl] = useState(syncConfig.apiUrl);

  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [isMigrated, setIsMigrated] = useState(() => migrationService.isMigrated());
  const [hasLocalData, setHasLocalData] = useState(() => migrationService.hasLocalData());

  useEffect(() => {
    if (hasLocalData && !isMigrated) {
      const timer = setTimeout(() => {
        setShowMigrationDialog(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasLocalData, isMigrated]);

  const storageUsage = useMemo(() => getStorageUsage(), [members, transactions]);

  const handleExportMembers = async () => {
    if (members.length === 0) {
      toast.error("无数据可导出", { description: "暂无会员数据" });
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
        toast.success("打印预览已打开", { description: "请在打印对话框中选择【另存为PDF】" });
      } else {
        const filename = `会员数据_${new Date().toLocaleDateString("zh-CN")}.csv`;
        exportToCSV(exportData, filename);
        toast.success("导出成功", { description: `已导出 ${members.length} 条会员数据` });
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTransactions = async () => {
    if (transactions.length === 0) {
      toast.error("无数据可导出", { description: "暂无交易记录" });
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
      toast.success("导出成功", { description: `已导出 ${transactions.length} 条交易记录` });
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
      toast.success("密码修改成功", { description: "管理员密码已更新" });
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
      toast.success("保存成功", { description: "店铺信息已更新" });
    } catch (error) {
      toast.error("保存失败", { description: "请检查网络连接" });
    } finally {
      setIsSavingShop(false);
    }
  };

  const handleSaveSyncConfig = async () => {
    try {
      await settingsService.update({ syncConfig: { ...syncConfig, apiUrl: syncApiUrl } });
      setSyncConfig({ apiUrl: syncApiUrl });
      toast.success("保存成功", { description: "同步配置已更新" });
    } catch (error) {
      toast.error("保存失败");
    }
  };

  const fontSizeValue = ["xs", "sm", "base", "lg", "xl"].indexOf(fontSize);

  const renderContent = () => {
    switch (activeCategory) {
      case "shop":
        return (
          <div className="space-y-5">
            <div>
              <SectionTitle>店铺信息</SectionTitle>
              <SectionDesc>这些信息将显示在收据和报表上</SectionDesc>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-3 max-w-sm">
              <div className="space-y-1.5">
                <Label htmlFor="shop-name" className="text-xs flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                  店铺名称
                </Label>
                <Input id="shop-name" value={editShopName} onChange={(e) => setEditShopName(e.target.value)} placeholder="请输入店铺名称" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shop-address" className="text-xs flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  店铺地址
                </Label>
                <Input id="shop-address" value={editShopAddress} onChange={(e) => setEditShopAddress(e.target.value)} placeholder="请输入店铺地址" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shop-phone" className="text-xs flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  联系电话
                </Label>
                <Input id="shop-phone" value={editShopPhone} onChange={(e) => setEditShopPhone(e.target.value)} placeholder="请输入联系电话" className="h-9" />
              </div>
              <LoadingButton onClick={handleSaveShopInfo} loading={isSavingShop} size="sm" className="mt-2">
                <Save className="mr-1.5 h-3.5 w-3.5" />
                保存
              </LoadingButton>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-5">
            <div>
              <SectionTitle>外观设置</SectionTitle>
              <SectionDesc>自定义界面显示效果</SectionDesc>
            </div>
            <div className="h-px bg-border" />

            {/* Theme */}
            <div className="space-y-2.5">
              <Label className="text-xs flex items-center gap-1.5">
                {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                主题模式
              </Label>
              <div className="grid grid-cols-3 gap-2 max-w-sm">
                {[
                  { value: "light", label: "浅色", icon: Sun },
                  { value: "dark", label: "深色", icon: Moon },
                  { value: "system", label: "系统", icon: Monitor },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all",
                      theme === option.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-foreground/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <option.icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Font size */}
            <div className="space-y-2.5 max-w-sm">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5" />
                  字体大小
                </Label>
                <span className="text-xs text-muted-foreground">{fontSizeLabels[fontSize]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground">A</span>
                <Slider
                  value={[fontSizeValue]}
                  onValueChange={(v) => setFontSize(["xs", "sm", "base", "lg", "xl"][v[0]] as FontSize)}
                  max={4} step={1} className="flex-1"
                />
                <span className="text-base text-muted-foreground">A</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Shortcuts */}
            <div className="space-y-2.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Keyboard className="h-3.5 w-3.5" />
                快捷键
              </Label>
              <div className="rounded-lg border border-border divide-y divide-border max-w-sm">
                {keyboardShortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-muted-foreground">{s.description}</span>
                    <div className="flex items-center gap-0.5">
                      {s.keys.map((key) => (
                        <kbd key={key} className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1 text-[10px] font-mono text-muted-foreground">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-5">
            <div>
              <SectionTitle>安全设置</SectionTitle>
              <SectionDesc>管理员密码与操作日志</SectionDesc>
            </div>
            <div className="h-px bg-border" />

            {/* Password */}
            <div className="space-y-3 max-w-sm">
              <Alert className="border-foreground/10 bg-accent/50 py-2.5">
                <Shield className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">
                  默认密码 <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">123456</code>，请尽快修改
                </AlertDescription>
              </Alert>

              <FormField label="当前密码" required type={showPasswords ? "text" : "password"} value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} placeholder="请输入当前密码" error={errors.current} />
              <FormField label="新密码" required type={showPasswords ? "text" : "password"} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} placeholder="至少4位" error={errors.new} />
              <FormField label="确认新密码" required type={showPasswords ? "text" : "password"} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入新密码" error={errors.confirm} />

              <div className="flex items-center justify-between pt-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPasswords(!showPasswords)}>
                  {showPasswords ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                  {showPasswords ? "隐藏" : "显示"}
                </Button>
                <LoadingButton onClick={handleChangePassword} loading={isSaving} size="sm">
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  保存
                </LoadingButton>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Audit logs */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  操作日志
                  <span className="text-muted-foreground font-normal">({auditLogs.length})</span>
                </Label>
                {auditLogs.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => { clearAuditLogs(); toast.success("日志已清空"); }}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    清空
                  </Button>
                )}
              </div>

              <div className="rounded-lg border border-border">
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <History className="mb-1.5 h-6 w-6 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground">暂无操作记录</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[260px]">
                    <div className="divide-y divide-border">
                      {auditLogs.slice(0, 100).map((log) => (
                        <div key={log.id} className="px-3 py-2 hover:bg-accent/30 transition-colors">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 rounded">
                              {auditCategoryLabels[log.category] || log.category}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(log.timestamp), "MM-dd HH:mm", { locale: zhCN })}
                            </span>
                          </div>
                          <p className="text-xs font-medium truncate">{log.action}</p>
                          {log.details && <p className="text-[11px] text-muted-foreground truncate">{log.details}</p>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>
        );

      case "data":
        return (
          <div className="space-y-5">
            <div>
              <SectionTitle>数据管理</SectionTitle>
              <SectionDesc>云端同步与数据导出</SectionDesc>
            </div>
            <div className="h-px bg-border" />

            {/* Cloud status */}
            <div className="space-y-2.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5" />
                Lovable Cloud
              </Label>
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">连接状态</span>
                  <Badge variant="default" className="bg-success text-[10px] h-5">
                    <Check className="mr-0.5 h-2.5 w-2.5" />
                    已连接
                  </Badge>
                </div>

                {cloudCounts && (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "会员", count: cloudCounts.members },
                      { label: "交易", count: cloudCounts.transactions },
                      { label: "服务", count: cloudCounts.services },
                      { label: "预约", count: cloudCounts.appointments },
                    ].map((item) => (
                      <div key={item.label} className="rounded-md bg-accent/50 px-2 py-1.5 text-center">
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-semibold tabular-nums">{item.count}</p>
                      </div>
                    ))}
                  </div>
                )}

                {hasLocalData && !isMigrated && (
                  <Alert className="py-2">
                    <Upload className="h-3.5 w-3.5" />
                    <AlertDescription className="flex items-center justify-between text-xs">
                      <span>检测到本地数据，建议迁移到云端</span>
                      <Button size="sm" className="h-7 text-xs ml-3" onClick={() => setShowMigrationDialog(true)}>
                        迁移
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {isMigrated && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success" />
                    数据已迁移到云端
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Export */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  数据导出
                </Label>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "excel" | "pdf")}>
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv"><span className="flex items-center gap-1.5"><FileSpreadsheet className="h-3 w-3" />CSV</span></SelectItem>
                    <SelectItem value="excel"><span className="flex items-center gap-1.5"><FileSpreadsheet className="h-3 w-3" />Excel</span></SelectItem>
                    <SelectItem value="pdf"><span className="flex items-center gap-1.5"><FileText className="h-3 w-3" />PDF</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {[
                  { label: "会员数据", count: cloudCounts?.members ?? members.length, loading: isExporting, handler: handleExportMembers, disabled: members.length === 0 },
                  { label: "交易记录", count: cloudCounts?.transactions ?? transactions.length, loading: isExportingTx, handler: handleExportTransactions, disabled: transactions.length === 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-accent/30 transition-colors">
                    <div>
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.count} 条记录</p>
                    </div>
                    <LoadingButton onClick={item.handler} loading={item.loading} disabled={item.disabled} size="sm" variant="outline" className="h-7 text-xs">
                      <Download className="mr-1 h-3 w-3" />导出
                    </LoadingButton>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Storage */}
            <div className="space-y-2.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                本地存储
              </Label>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{storageUsage.usedKB} KB / {storageUsage.maxMB} MB</span>
                  <span className="font-medium tabular-nums">{storageUsage.percentage}%</span>
                </div>
                <Progress value={storageUsage.percentage} className="h-1.5" />
              </div>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-5">
            <div>
              <SectionTitle>关于系统</SectionTitle>
              <SectionDesc>版本和相关信息</SectionDesc>
            </div>
            <div className="h-px bg-border" />

            {/* Brand */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <span className="text-base font-black text-primary-foreground">F</span>
              </div>
              <div>
                <h2 className="text-sm font-bold">FFk Barber</h2>
                <p className="text-[11px] text-muted-foreground">理发店会员管理系统</p>
              </div>
              <Badge variant="outline" className="ml-auto text-[10px] h-5">v1.0.0</Badge>
            </div>

            <div className="h-px bg-border" />

            {/* System info */}
            <div className="space-y-2.5">
              <Label className="text-xs">系统概况</Label>
              <div className="grid gap-2 sm:grid-cols-2 max-w-sm">
                {[
                  { label: "数据存储", value: "Lovable Cloud" },
                  { label: "客户端", value: "Web + Desktop", icon: Globe },
                  { label: "会员总数", value: `${cloudCounts?.members ?? members.length} 位` },
                  { label: "交易记录", value: `${cloudCounts?.transactions ?? transactions.length} 条` },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-accent/50 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-xs font-medium flex items-center gap-1">
                      {item.icon && <item.icon className="h-3 w-3" />}
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Features */}
            <div className="space-y-2">
              <Label className="text-xs">功能特性</Label>
              <div className="space-y-1">
                {[
                  "安全认证与数据加密",
                  "云端数据同步，多设备使用",
                  "响应式设计，桌面/移动端",
                  "拼音首字母智能搜索",
                  "深色模式支持",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2 text-xs">
                    <Check className="h-3 w-3 text-success shrink-0" />
                    <span className="text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="设置" description="系统设置和数据管理" />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Nav */}
        <div className="lg:w-48 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {cat.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-lg border border-border bg-card p-5">
          {renderContent()}
        </div>
      </div>

      <MigrationDialog
        open={showMigrationDialog}
        onOpenChange={setShowMigrationDialog}
        onComplete={() => { setIsMigrated(true); setHasLocalData(false); }}
      />
    </div>
  );
}
