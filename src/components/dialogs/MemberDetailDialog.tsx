import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { Phone, Calendar, CreditCard, Wallet, Pencil, Trash2, Save, X, User, History } from "lucide-react";
import { AdminPasswordDialog } from "@/components/dialogs/AdminPasswordDialog";

interface MemberDetailDialogProps {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailDialog({ memberId, open, onOpenChange }: MemberDetailDialogProps) {
  const { toast } = useToast();
  const { getMember, updateMember, deleteMember, transactions } = useStore();
  const member = memberId ? getMember(memberId) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState<"male" | "female">("male");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!member) return null;

  const memberTransactions = transactions
    .filter((t) => t.memberId === member.id)
    .slice(0, 20);

  const handleStartEdit = () => {
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditGender(member.gender);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      toast({ title: "请输入姓名", variant: "destructive" });
      return;
    }
    if (!editPhone.trim() || editPhone.length !== 11) {
      toast({ title: "请输入正确的手机号", variant: "destructive" });
      return;
    }

    updateMember(member.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      gender: editGender,
    });

    toast({ title: "修改成功", description: "会员信息已更新" });
    setIsEditing(false);
  };

  const handleDeleteMember = () => {
    deleteMember(member.id);
    toast({ title: "删除成功", description: "会员已删除" });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">会员详情</DialogTitle>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                      <X className="mr-1 h-4 w-4" />
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Save className="mr-1 h-4 w-4" />
                      保存
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={handleStartEdit}>
                      <Pencil className="mr-1 h-4 w-4" />
                      编辑
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      删除
                    </Button>
                  </>
                )}
              </div>
            </div>
            <DialogDescription className="sr-only">
              查看和编辑会员信息
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="space-y-6 p-6">
              {/* 会员头像和基本信息 */}
              {isEditing ? (
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">姓名</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="请输入姓名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">手机号</Label>
                    <Input
                      id="edit-phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="请输入手机号"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>性别</Label>
                    <RadioGroup
                      value={editGender}
                      onValueChange={(v) => setEditGender(v as "male" | "female")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="edit-male" />
                        <Label htmlFor="edit-male">男</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="edit-female" />
                        <Label htmlFor="edit-female">女</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 rounded-lg bg-muted/30 p-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{member.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {member.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(member.createdAt), "yyyy-MM-dd", { locale: zhCN })}注册
                      </span>
                      <Badge variant={member.gender === "male" ? "secondary" : "outline"}>
                        {member.gender === "male" ? "男" : "女"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* 账户信息卡片 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-gradient-to-br from-chart-2/10 to-transparent p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    账户余额
                  </div>
                  <p className="mt-2 text-3xl font-bold text-chart-2">¥{member.balance.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-border bg-gradient-to-br from-primary/10 to-transparent p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    持有次卡
                  </div>
                  <p className="mt-2 text-3xl font-bold text-primary">{member.cards.length}张</p>
                </div>
              </div>

              {/* Tabs切换 */}
              <Tabs defaultValue="cards" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cards" className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    次卡详情
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="gap-2">
                    <History className="h-4 w-4" />
                    交易记录
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="cards" className="mt-4">
                  {member.cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CreditCard className="mb-2 h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">暂无次卡</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {member.cards.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                        >
                          <div>
                            <p className="font-medium">{card.templateName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(card.createdAt), "yyyy-MM-dd", { locale: zhCN })} 购买
                            </p>
                          </div>
                          <Badge variant={card.remainingCount <= 1 ? "destructive" : "default"}>
                            剩余 {card.remainingCount} 次
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="transactions" className="mt-4">
                  {memberTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <History className="mb-2 h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">暂无交易记录</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memberTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                        >
                          <div>
                            <p className="font-medium">{tx.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(tx.createdAt), "MM-dd HH:mm", { locale: zhCN })}
                            </p>
                          </div>
                          <span
                            className={`text-lg font-semibold ${
                              tx.type === "recharge" || tx.type === "refund" ? "text-chart-2" : "text-destructive"
                            }`}
                          >
                            {tx.type === "recharge" || tx.type === "refund" ? "+" : "-"}¥{tx.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AdminPasswordDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteMember}
        title="删除会员"
        description={`确定要删除会员"${member.name}"吗？此操作不可恢复。请输入管理员密码确认。`}
      />
    </>
  );
}
