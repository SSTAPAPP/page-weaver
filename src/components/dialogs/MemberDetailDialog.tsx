import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { Phone, Calendar, CreditCard, Wallet, Pencil, Trash2, Save, X, History, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemberDeleteWithRefundDialog } from "@/components/dialogs/MemberDeleteWithRefundDialog";
import { AdminPasswordDialog } from "@/components/dialogs/AdminPasswordDialog";
import { MEMBER_TAG_OPTIONS } from "@/types";

const typeMap: Record<string, { label: string; sign: string; color: string }> = {
  recharge: { label: "充值", sign: "+", color: "text-chart-2" },
  consume: { label: "消费", sign: "-", color: "text-foreground" },
  card_deduct: { label: "次卡", sign: "-", color: "text-foreground" },
  refund: { label: "退款", sign: "+", color: "text-chart-4" },
  price_diff: { label: "补差价", sign: "-", color: "text-chart-1" },
};

interface MemberDetailDialogProps {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailDialog({ memberId, open, onOpenChange }: MemberDetailDialogProps) {
  const { toast } = useToast();
  const { getMember, updateMember, transactions } = useStore();
  const member = memberId ? getMember(memberId) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState<"male" | "female">("male");
  const [editTag, setEditTag] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminPasswordDialogOpen, setAdminPasswordDialogOpen] = useState(false);

  if (!member) return null;

  const memberTransactions = transactions
    .filter((t) => t.memberId === member.id)
    .slice(0, 20);

  const handleStartEdit = () => {
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditGender(member.gender);
    setEditTag(member.tag || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleRequestSave = () => {
    if (!editName.trim()) {
      toast({ title: "请输入姓名", variant: "destructive" });
      return;
    }
    if (!editPhone.trim() || editPhone.length !== 11) {
      toast({ title: "请输入正确的手机号", variant: "destructive" });
      return;
    }
    setAdminPasswordDialogOpen(true);
  };

  const handleSaveEdit = () => {
    updateMember(member.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      gender: editGender,
      tag: editTag === "none" ? undefined : (editTag || undefined),
    });

    toast({ title: "修改成功", description: "会员信息已更新" });
    setIsEditing(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onOpenChange(false);
  };

  const handleMemberDeleted = () => {
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle>会员详情</DialogTitle>
            <DialogDescription>
              查看和管理会员信息
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {/* 会员信息卡片 - 紧凑版 */}
              {isEditing ? (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-name" className="text-xs">姓名</Label>
                      <Input
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="请输入姓名"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-phone" className="text-xs">手机号</Label>
                      <Input
                        id="edit-phone"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="请输入手机号"
                        maxLength={11}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">性别</Label>
                    <RadioGroup
                      value={editGender}
                      onValueChange={(v) => setEditGender(v as "male" | "female")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="edit-male" />
                        <Label htmlFor="edit-male" className="text-sm">男</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="edit-female" />
                        <Label htmlFor="edit-female" className="text-sm">女</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">会员标签</Label>
                    <Select value={editTag} onValueChange={setEditTag}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="选择标签（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无标签</SelectItem>
                        {MEMBER_TAG_OPTIONS.map((tag) => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{member.name}</h3>
                      <Badge variant={member.gender === "male" ? "secondary" : "outline"} className="shrink-0 text-xs">
                        {member.gender === "male" ? "男" : "女"}
                      </Badge>
                      {member.tag && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          <Tag className="h-3 w-3 mr-0.5" />
                          {member.tag}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(member.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 账户统计 - 横向紧凑 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-chart-2/5 p-3">
                  <Wallet className="h-5 w-5 text-chart-2" />
                  <div>
                    <p className="text-xs text-muted-foreground">账户余额</p>
                    <p className="text-lg font-bold text-chart-2">¥{member.balance.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-primary/5 p-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">持有次卡</p>
                    <p className="text-lg font-bold text-primary">{member.cards.length}张</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="cards" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="cards" className="gap-1.5 text-xs">
                    <CreditCard className="h-3.5 w-3.5" />
                    次卡详情
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="gap-1.5 text-xs">
                    <History className="h-3.5 w-3.5" />
                    交易记录
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="cards" className="mt-3">
                  {member.cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <CreditCard className="mb-2 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">暂无次卡</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-auto">
                      {member.cards.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm"
                        >
                          <div>
                            <p className="font-medium">{card.templateName}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(card.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                            </p>
                          </div>
                          <Badge variant={card.remainingCount <= 1 ? "destructive" : "default"} className="text-xs">
                            剩余 {card.remainingCount} 次
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="transactions" className="mt-3">
                  {memberTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <History className="mb-2 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">暂无交易记录</p>
                    </div>
                  ) : (
                    <div className="max-h-[180px] overflow-auto divide-y divide-border">
                      {memberTransactions.map((tx, idx) => {
                        const info = typeMap[tx.type] || typeMap.consume;
                        const isVoided = tx.voided;

                        return (
                          <div
                            key={tx.id}
                            className={cn(
                              "flex items-center gap-2 py-2.5",
                              isVoided && "opacity-50"
                            )}
                          >
                            {/* 序号 */}
                            <span className="text-xs text-muted-foreground tabular-nums w-5 shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className={cn(
                                  "text-sm font-medium truncate",
                                  isVoided && "line-through text-muted-foreground"
                                )}>
                                  {tx.description}
                                </p>
                                {isVoided && (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 font-normal shrink-0">
                                    已作废
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.createdAt), "MM-dd HH:mm", { locale: zhCN })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn(
                                "text-sm font-medium tabular-nums",
                                isVoided ? "line-through text-muted-foreground" : info.color
                              )}>
                                {info.sign}¥{tx.amount.toFixed(2)}
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal w-8 justify-center">
                                {info.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Footer with action buttons */}
          <DialogFooter className="pt-4 border-t border-border gap-2 sm:gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit} className="gap-1.5">
                  <X className="h-4 w-4" />
                  取消
                </Button>
                <Button onClick={handleRequestSave} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  保存
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
                <Button variant="outline" onClick={handleStartEdit} className="gap-1.5">
                  <Pencil className="h-4 w-4" />
                  编辑
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 - 使用带退款计算的新弹窗 */}
      <MemberDeleteWithRefundDialog
        member={member}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={handleMemberDeleted}
      />
      <AdminPasswordDialog
        open={adminPasswordDialogOpen}
        onOpenChange={setAdminPasswordDialogOpen}
        onConfirm={handleSaveEdit}
        title="修改会员信息"
        description="修改会员信息需要管理员密码确认"
      />
    </>
  );
}
