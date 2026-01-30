import { useState, useMemo } from "react";
import { 
  Download, Save, Eye, EyeOff, Database, AlertTriangle, 
  Moon, Sun, Type, Store, MapPin, Phone, ChevronRight,
  Building, Palette, Lock, HardDrive, Cloud, CloudOff, 
  History, FileSpreadsheet, FileText, Trash2, Printer
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { hashPassword, isHashed } from "@/lib/crypto";
import { getStorageUsage, exportToCSV, printReport } from "@/lib/print";
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

type SettingsCategory = "shop" | "appearance" | "security" | "data";

const categories = [
  { id: "shop" as const, label: "店铺信息", icon: Building, description: "基本信息设置" },
  { id: "appearance" as const, label: "外观设置", icon: Palette, description: "主题与显示" },
  { id: "security" as const, label: "安全设置", icon: Lock, description: "密码与日志" },
  { id: "data" as const, label: "数据管理", icon: HardDrive, description: "导出与同步" },
];

const auditCategoryLabels: Record<string, string> = {
  member: "会员",
  transaction: "交易",
  service: "服务",
  card: "次卡",
  system: "系统",
  security: "安全",
};

export default function Settings() {
  const { toast } = useToast();
  const { 
    members, transactions, adminPassword, setAdminPassword, shopInfo, setShopInfo,
    auditLogs, clearAuditLogs, syncConfig, setSyncConfig
  } = useStore();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  
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
  
  // 云端同步配置
  const [syncApiUrl, setSyncApiUrl] = useState(syncConfig.apiUrl);

  // 存储使用情况
  const storageUsage = useMemo(() => getStorageUsage(), [members, transactions]);

  const handleExportMembers = async () => {
    if (members.length === 0) {
      toast({
        title: "无数据可导出",
        description: "暂无会员数据",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      
      const exportData = members.map((m) => ({
        姓名: m.name,
        手机号: m.phone,
        性别: m.gender === "male" ? "男" : "女",
        余额: m.balance.toFixed(2),
        次卡数量: m.cards.length,
        注册时间: new Date(m.createdAt).toLocaleDateString("zh-CN"),
      }));

      if (exportFormat === "pdf") {
        // PDF通过打印实现
        printReport();
        toast({
          title: "打印预览已打开",
          description: "请在打印对话框中选择【另存为PDF】",
        });
      } else {
        // CSV/Excel格式
        const filename = `会员数据_${new Date().toLocaleDateString("zh-CN")}.csv`;
        exportToCSV(exportData, filename);
        toast({
          title: "导出成功",
          description: `已导出 ${members.length} 条会员数据`,
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTransactions = async () => {
    if (transactions.length === 0) {
      toast({
        title: "无数据可导出",
        description: "暂无交易记录",
        variant: "destructive",
      });
      return;
    }

    setIsExportingTx(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      
      const typeLabels: Record<string, string> = {
        recharge: "充值",
        consume: "消费",
        card_deduct: "次卡消费",
        refund: "退款",
        price_diff: "补差价",
      };

      const exportData = transactions.map((t) => ({
        时间: new Date(t.createdAt).toLocaleString("zh-CN"),
        会员: t.memberName,
        类型: typeLabels[t.type] || t.type,
        金额: t.amount.toFixed(2),
        描述: t.description,
        状态: t.voided ? "已作废" : "正常",
      }));

      const filename = `交易记录_${new Date().toLocaleDateString("zh-CN")}.csv`;
      exportToCSV(exportData, filename);
      
      toast({
        title: "导出成功",
        description: `已导出 ${transactions.length} 条交易记录`,
      });
    } finally {
      setIsExportingTx(false);
    }
  };

  const validatePasswordForm = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!currentPassword) {
      newErrors.current = "请输入当前密码";
    } else {
      // Check current password with hash
      const inputHash = await hashPassword(currentPassword);
      if (isHashed(adminPassword)) {
        if (inputHash !== adminPassword) {
          newErrors.current = "当前密码不正确";
        }
      } else {
        // Legacy plain text
        if (currentPassword !== adminPassword) {
          newErrors.current = "当前密码不正确";
        }
      }
    }
    
    if (!newPassword) {
      newErrors.new = "请输入新密码";
    } else if (newPassword.length < 4) {
      newErrors.new = "新密码至少需要4位";
    }
    
    if (!confirmPassword) {
      newErrors.confirm = "请确认新密码";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm = "两次输入的密码不一致";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    const isValid = await validatePasswordForm();
    if (!isValid) return;

    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      
      // Hash the new password before storing
      const hashedPassword = await hashPassword(newPassword);
      setAdminPassword(hashedPassword);
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});

      toast({
        title: "密码修改成功",
        description: "管理员密码已更新",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShopInfo = async () => {
    setIsSavingShop(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      setShopInfo({
        name: editShopName,
        address: editShopAddress,
        phone: editShopPhone,
      });
      toast({
        title: "保存成功",
        description: "店铺信息已更新",
      });
    } finally {
      setIsSavingShop(false);
    }
  };

  const handleSaveSyncConfig = () => {
    setSyncConfig({ apiUrl: syncApiUrl });
    toast({
      title: "保存成功",
      description: "同步配置已更新",
    });
  };

  const fontSizeValue = ["xs", "sm", "base", "lg", "xl"].indexOf(fontSize);

  const renderContent = () => {
    switch (activeCategory) {
      case "shop":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">店铺信息</h3>
              <p className="text-sm text-muted-foreground">设置您的店铺基本信息</p>
            </div>
            <Separator />
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="shop-name" className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  店铺名称
                </Label>
                <Input
                  id="shop-name"
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  placeholder="请输入店铺名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  店铺地址
                </Label>
                <Input
                  id="shop-address"
                  value={editShopAddress}
                  onChange={(e) => setEditShopAddress(e.target.value)}
                  placeholder="请输入店铺地址"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  联系电话
                </Label>
                <Input
                  id="shop-phone"
                  value={editShopPhone}
                  onChange={(e) => setEditShopPhone(e.target.value)}
                  placeholder="请输入联系电话"
                />
              </div>
              <LoadingButton 
                onClick={handleSaveShopInfo} 
                loading={isSavingShop}
                className="mt-4"
              >
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
              <p className="text-sm text-muted-foreground">自定义界面显示效果</p>
            </div>
            <Separator />
            <div className="space-y-6 max-w-md">
              {/* 深色模式 */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  主题模式
                </Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">浅色模式</SelectItem>
                    <SelectItem value="dark">深色模式</SelectItem>
                    <SelectItem value="system">跟随系统</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  选择界面显示的主题风格
                </p>
              </div>

              <Separator />

              {/* 字体大小 */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    字体大小
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    当前：{fontSizeLabels[fontSize]}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">A</span>
                  <Slider
                    value={[fontSizeValue]}
                    onValueChange={(v) => setFontSize(["xs", "sm", "base", "lg", "xl"][v[0]] as FontSize)}
                    max={4}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-lg text-muted-foreground">A</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>较小</span>
                  <span>小</span>
                  <span>标准</span>
                  <span>大</span>
                  <span>较大</span>
                </div>
              </div>
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
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  默认密码为 <code className="rounded bg-muted px-1">123456</code>，请尽快修改
                </AlertDescription>
              </Alert>

              <FormField
                label="当前密码"
                required
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
                error={errors.current}
              />

              <Separator />

              <FormField
                label="新密码"
                required
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少4位）"
                error={errors.new}
              />

              <FormField
                label="确认新密码"
                required
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                error={errors.confirm}
              />

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? (
                    <EyeOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      clearAuditLogs();
                      toast({ title: "日志已清空" });
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    清空日志
                  </Button>
                )}
              </div>
              
              <div className="rounded-lg border border-border">
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <History className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">暂无操作记录</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="divide-y divide-border">
                      {auditLogs.slice(0, 100).map((log) => (
                        <div key={log.id} className="p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {auditCategoryLabels[log.category] || log.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">导出数据与云端同步</p>
            </div>
            <Separator />
            
            {/* 数据导出 */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                数据导出
              </Label>
              
              {/* 导出格式选择 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">导出格式：</span>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "excel" | "pdf")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        CSV
                      </div>
                    </SelectItem>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <p className="font-medium">会员数据</p>
                    <p className="text-sm text-muted-foreground">
                      共 {members.length} 条记录
                    </p>
                  </div>
                  <LoadingButton
                    onClick={handleExportMembers}
                    loading={isExporting}
                    disabled={members.length === 0}
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    导出
                  </LoadingButton>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <p className="font-medium">交易记录</p>
                    <p className="text-sm text-muted-foreground">
                      共 {transactions.length} 条记录
                    </p>
                  </div>
                  <LoadingButton
                    onClick={handleExportTransactions}
                    loading={isExportingTx}
                    disabled={transactions.length === 0}
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    导出
                  </LoadingButton>
                </div>
              </div>
            </div>

            <Separator />

            {/* 云端同步 */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                {syncConfig.enabled ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
                云端同步
              </Label>
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">同步状态</p>
                    <p className="text-sm text-muted-foreground">
                      {syncConfig.enabled ? "已启用" : "未启用"}
                    </p>
                  </div>
                  <Badge variant={syncConfig.enabled ? "default" : "secondary"}>
                    {syncConfig.enabled ? "已连接" : "本地存储"}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="sync-api" className="text-sm">API 接口地址</Label>
                    <Input
                      id="sync-api"
                      value={syncApiUrl}
                      onChange={(e) => setSyncApiUrl(e.target.value)}
                      placeholder="https://api.example.com/sync"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveSyncConfig}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      保存配置
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!syncApiUrl}
                      onClick={() => {
                        toast({
                          title: "功能开发中",
                          description: "云端同步功能即将上线，敬请期待",
                        });
                      }}
                    >
                      测试连接
                    </Button>
                  </div>
                </div>
                
                <Alert className="mt-3">
                  <Cloud className="h-4 w-4" />
                  <AlertDescription>
                    云端同步功能需要配合后端API使用，支持数据实时同步和离线模式。
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <Separator />

            {/* 存储信息 */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                存储信息
              </Label>
              <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">本地存储使用量</p>
                    <p className="text-sm text-muted-foreground">
                      {storageUsage.usedKB} KB / {storageUsage.maxMB} MB
                    </p>
                  </div>
                  <span className="text-sm font-medium">{storageUsage.percentage}%</span>
                </div>
                <Progress value={storageUsage.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  支持存储约 {Math.floor((storageUsage.maxMB * 1024 - parseFloat(storageUsage.usedKB)) / 0.5)} 位会员数据
                </p>
              </div>
            </div>

            <Separator />

            {/* 系统信息 */}
            <div className="space-y-3">
              <Label>系统信息</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">版本</p>
                  <p className="font-medium">v1.0.0</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">数据存储</p>
                  <p className="font-medium">本地浏览器</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">会员总数</p>
                  <p className="font-medium">{members.length} 位</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">交易记录</p>
                  <p className="font-medium">{transactions.length} 条</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="设置"
        description="系统设置和数据管理"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Navigation */}
        <Card className="lg:w-64 shrink-0">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{category.label}</p>
                      <p className={cn(
                        "text-xs truncate",
                        isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {category.description}
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
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
    </div>
  );
}
