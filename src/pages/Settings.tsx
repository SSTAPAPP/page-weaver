import { useState } from "react";
import { Download, Save, Eye, EyeOff, Shield, Database, AlertTriangle, Moon, Sun, Type, Store, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
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

const fontSizeLabels = {
  xs: "较小",
  sm: "小",
  base: "标准",
  lg: "大",
  xl: "较大",
};

type FontSize = "xs" | "sm" | "base" | "lg" | "xl";

export default function Settings() {
  const { toast } = useToast();
  const { members, transactions, adminPassword, setAdminPassword, shopInfo, setShopInfo } = useStore();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 店铺信息编辑状态
  const [editShopName, setEditShopName] = useState(shopInfo.name);
  const [editShopAddress, setEditShopAddress] = useState(shopInfo.address);
  const [editShopPhone, setEditShopPhone] = useState(shopInfo.phone);
  const [isSavingShop, setIsSavingShop] = useState(false);

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

      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers.map((h) => `"${row[h as keyof typeof row] ?? ""}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `会员数据_${new Date().toLocaleDateString("zh-CN")}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "导出成功",
        description: `已导出 ${members.length} 条会员数据`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!currentPassword) {
      newErrors.current = "请输入当前密码";
    } else if (currentPassword !== adminPassword) {
      newErrors.current = "当前密码不正确";
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
    if (!validatePasswordForm()) return;

    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      
      setAdminPassword(newPassword);
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

  const fontSizeValue = ["xs", "sm", "base", "lg", "xl"].indexOf(fontSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="设置"
        description="系统设置和数据管理"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 店铺信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              店铺信息
            </CardTitle>
            <CardDescription>设置您的店铺基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              保存店铺信息
            </LoadingButton>
          </CardContent>
        </Card>

        {/* 外观设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              外观设置
            </CardTitle>
            <CardDescription>自定义界面显示效果</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 深色模式 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  深色模式
                </Label>
                <p className="text-sm text-muted-foreground">
                  切换明暗主题
                </p>
              </div>
              <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">浅色</SelectItem>
                  <SelectItem value="dark">深色</SelectItem>
                  <SelectItem value="system">跟随系统</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* 字体大小 */}
            <div className="space-y-4">
              <div className="space-y-0.5">
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>较小</span>
                <span>小</span>
                <span>标准</span>
                <span>大</span>
                <span>较大</span>
              </div>
            </div>

            <Separator />

            {/* 数据存储 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  数据存储
                </Label>
                <p className="text-sm text-muted-foreground">
                  当前使用浏览器本地存储
                </p>
              </div>
              <Badge variant="secondary">本地存储</Badge>
            </div>
          </CardContent>
        </Card>

        {/* 数据导出 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              数据导出
            </CardTitle>
            <CardDescription>导出会员数据为CSV文件，可用Excel打开</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              >
                <Download className="mr-2 h-4 w-4" />
                导出CSV
              </LoadingButton>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
              <div>
                <p className="font-medium">交易记录</p>
                <p className="text-sm text-muted-foreground">
                  共 {transactions.length} 条记录
                </p>
              </div>
              <Badge variant="secondary">即将支持</Badge>
            </div>
          </CardContent>
        </Card>

        {/* 管理员密码 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              管理员密码
            </CardTitle>
            <CardDescription>
              用于删除会员等敏感操作的验证密码
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </div>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">系统信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
