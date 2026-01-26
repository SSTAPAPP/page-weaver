import { useState } from "react";
import { Download, Lock, Save, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const { members, adminPassword, setAdminPassword } = useStore();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const handleExportMembers = () => {
    const exportData = members.map((m) => ({
      姓名: m.name,
      手机号: m.phone,
      性别: m.gender === "male" ? "男" : "女",
      余额: m.balance,
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
  };

  const handleChangePassword = () => {
    if (currentPassword !== adminPassword) {
      toast({
        title: "密码错误",
        description: "当前密码不正确",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 4) {
      toast({
        title: "密码太短",
        description: "新密码至少需要4位",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "密码不一致",
        description: "两次输入的新密码不一致",
        variant: "destructive",
      });
      return;
    }

    setAdminPassword(newPassword);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    toast({
      title: "密码修改成功",
      description: "管理员密码已更新",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">设置</h1>
        <p className="text-muted-foreground">系统设置和数据管理</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 数据导出 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              数据导出
            </CardTitle>
            <CardDescription>导出会员数据为CSV文件</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              导出所有会员的基本信息，包括姓名、手机号、余额、次卡数量等。
            </p>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium">会员数据</p>
                <p className="text-sm text-muted-foreground">
                  共 {members.length} 条记录
                </p>
              </div>
              <Button onClick={handleExportMembers}>
                <Download className="mr-2 h-4 w-4" />
                导出CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 管理员密码 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              管理员密码
            </CardTitle>
            <CardDescription>
              用于删除会员等敏感操作的验证密码（默认密码：123456）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">当前密码</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="请输入当前密码"
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少4位）"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
              />
            </div>
            <div className="flex items-center justify-between">
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
              <Button onClick={handleChangePassword}>
                <Save className="mr-2 h-4 w-4" />
                保存修改
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
