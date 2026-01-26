import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { Phone, Calendar, CreditCard, Wallet, Pencil, Trash2, Save, X } from "lucide-react";
import { AdminPasswordDialog } from "@/components/dialogs/AdminPasswordDialog";

interface MemberDetailSheetProps {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailSheet({ memberId, open, onOpenChange }: MemberDetailSheetProps) {
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>会员详情</span>
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
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* 基本信息 */}
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
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{member.name}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {member.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    注册于 {format(new Date(member.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                  </div>
                </div>
              </div>
            )}

            {/* 账户信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  账户余额
                </div>
                <p className="mt-1 text-2xl font-bold">¥{member.balance.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  持有次卡
                </div>
                <p className="mt-1 text-2xl font-bold">{member.cards.length}张</p>
              </div>
            </div>

            {/* 次卡列表 */}
            {member.cards.length > 0 && (
              <div>
                <h4 className="mb-3 font-semibold">次卡详情</h4>
                <div className="space-y-2">
                  {member.cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
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
              </div>
            )}

            <Separator />

            {/* 交易记录 */}
            <div>
              <h4 className="mb-3 font-semibold">最近交易</h4>
              {memberTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground">暂无交易记录</p>
              ) : (
                <div className="space-y-2">
                  {memberTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tx.createdAt), "MM-dd HH:mm", { locale: zhCN })}
                        </p>
                      </div>
                      <span
                        className={`font-semibold ${
                          tx.type === "recharge" ? "text-chart-2" : "text-destructive"
                        }`}
                      >
                        {tx.type === "recharge" ? "+" : "-"}¥{tx.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
