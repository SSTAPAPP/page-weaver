import { useState, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberById, useTransactions, useUpdateMember } from "@/hooks/useCloudData";
import { memberService } from "@/services/memberService";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useCloudData";
import { toast } from "sonner";
import { Phone, Calendar, CreditCard, Wallet, Pencil, Trash2, Save, X, History, ArrowUpCircle, ArrowDownCircle, Link2 } from "lucide-react";
import { MemberDeleteWithRefundDialog } from "@/components/dialogs/MemberDeleteWithRefundDialog";
import type { Transaction } from "@/types";

const typeMap = {
  recharge: { label: "充值", icon: ArrowUpCircle, color: "text-chart-2", bgColor: "bg-chart-2/10", borderColor: "border-chart-2/20" },
  consume: { label: "消费", icon: ArrowDownCircle, color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/20" },
  card_deduct: { label: "次卡", icon: CreditCard, color: "text-chart-3", bgColor: "bg-chart-3/10", borderColor: "border-chart-3/20" },
  refund: { label: "退款", icon: ArrowUpCircle, color: "text-chart-4", bgColor: "bg-chart-4/10", borderColor: "border-chart-4/20" },
  price_diff: { label: "补差价", icon: ArrowDownCircle, color: "text-chart-1", bgColor: "bg-chart-1/10", borderColor: "border-chart-1/20" },
};

interface GroupedTransaction {
  mainTransaction: Transaction;
  refundTransaction?: Transaction;
}

interface MemberDetailDialogProps {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailDialog({ memberId, open, onOpenChange }: MemberDetailDialogProps) {
  
  const queryClient = useQueryClient();
  const { data: member, isLoading: isMemberLoading } = useMemberById(memberId);
  const { data: allTransactions = [] } = useTransactions();
  const updateMember = useUpdateMember();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState<"male" | "female">("male");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Get member transactions from cloud data
  const memberTransactions = useMemo(() => {
    if (!member) return [];
    return allTransactions.filter((t) => t.memberId === member.id);
  }, [allTransactions, member]);

  const groupedTransactions = useMemo(() => {
    const groups: GroupedTransaction[] = [];
    const processedIds = new Set<string>();
    const refundMap = new Map<string, Transaction>();
    memberTransactions.forEach((tx) => {
      if (tx.type === 'refund' && tx.relatedTransactionId) {
        refundMap.set(tx.relatedTransactionId, tx);
      }
    });
    memberTransactions.forEach((tx) => {
      if (processedIds.has(tx.id)) return;
      if (tx.type === 'refund' && tx.relatedTransactionId) {
        processedIds.add(tx.id);
        return;
      }
      const refundTx = refundMap.get(tx.id);
      groups.push({ mainTransaction: tx, refundTransaction: refundTx });
      processedIds.add(tx.id);
      if (refundTx) processedIds.add(refundTx.id);
    });
    return groups.slice(0, 20);
  }, [memberTransactions]);

  const handleStartEdit = () => {
    if (!member) return;
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditGender(member.gender);
    setPhoneError("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setPhoneError("");
  };

  const handleSaveEdit = async () => {
    if (!member) return;
    if (!editName.trim()) {
      toast.error("请输入姓名");
      return;
    }
    if (!editPhone.trim() || editPhone.length !== 11) {
      toast.error("请输入正确的手机号");
      return;
    }
    if (editPhone !== member.phone) {
      const isUnique = await memberService.isPhoneUnique(editPhone, member.id);
      if (!isUnique) {
        setPhoneError("该手机号已被其他会员使用");
        toast.error("手机号重复", { description: "该手机号已被其他会员使用" });
        return;
      }
    }

    try {
      await updateMember.mutateAsync({
        id: member.id,
        updates: { name: editName.trim(), phone: editPhone.trim(), gender: editGender },
      });
      toast.success("修改成功", { description: "会员信息已更新" });
      setIsEditing(false);
      setPhoneError("");
    } catch (error) {
      toast.error("修改失败");
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setPhoneError("");
    onOpenChange(false);
  };

  const handleMemberDeleted = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members });
    queryClient.invalidateQueries({ queryKey: queryKeys.cloudCounts });
    onOpenChange(false);
  };

  if (!memberId) return null;

  if (isMemberLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[85vh] max-w-lg">
          <DialogHeader>
            <DialogTitle>会员详情</DialogTitle>
            <DialogDescription>加载中...</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!member) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[85vh] max-w-lg">
          <DialogHeader>
            <DialogTitle>会员详情</DialogTitle>
            <DialogDescription>未找到该会员</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle>会员详情</DialogTitle>
            <DialogDescription>查看和管理会员信息</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {isEditing ? (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-name" className="text-xs">姓名</Label>
                      <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="请输入姓名" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-phone" className="text-xs">手机号</Label>
                      <Input
                        id="edit-phone"
                        value={editPhone}
                        onChange={(e) => { setEditPhone(e.target.value); setPhoneError(""); }}
                        placeholder="请输入手机号"
                        maxLength={11}
                        className={`h-9 ${phoneError ? "border-destructive" : ""}`}
                      />
                      {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">性别</Label>
                    <RadioGroup value={editGender} onValueChange={(v) => setEditGender(v as "male" | "female")} className="flex gap-4">
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
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{member.phone}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(member.createdAt), "yyyy-MM-dd", { locale: zhCN })}</span>
                    </div>
                  </div>
                </div>
              )}

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

              <Tabs defaultValue="cards" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="cards" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" />次卡详情</TabsTrigger>
                  <TabsTrigger value="transactions" className="gap-1.5 text-xs"><History className="h-3.5 w-3.5" />交易记录</TabsTrigger>
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
                        <div key={card.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                          <div>
                            <p className="font-medium">{card.templateName}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(card.createdAt), "yyyy-MM-dd", { locale: zhCN })}</p>
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
                  {groupedTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <History className="mb-2 h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">暂无交易记录</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-auto">
                      {groupedTransactions.map((group) => {
                        const tx = group.mainTransaction;
                        const refundTx = group.refundTransaction;
                        const typeInfo = typeMap[tx.type] || typeMap.consume;
                        const TypeIcon = typeInfo.icon;
                        const isVoided = tx.voided;
                        const isPositive = tx.type === "recharge" || tx.type === "refund";
                        const hasRefund = !!refundTx;

                        return (
                          <div key={tx.id} className={`rounded-lg border border-border overflow-hidden ${isVoided ? "opacity-50" : ""}`}>
                            <div className="flex items-center justify-between p-2.5 text-sm">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${typeInfo.bgColor}`}>
                                  <TypeIcon className={`h-3.5 w-3.5 ${typeInfo.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className={`font-medium truncate ${isVoided ? "line-through text-muted-foreground" : ""}`}>{tx.description}</p>
                                    <Badge variant="outline" className={`text-xs shrink-0 ${isVoided ? "bg-muted text-muted-foreground border-muted" : `${typeInfo.bgColor} ${typeInfo.color} ${typeInfo.borderColor}`}`}>
                                      {typeInfo.label}
                                    </Badge>
                                    {isVoided && <Badge variant="destructive" className="text-xs shrink-0">已作废</Badge>}
                                    {hasRefund && !isVoided && (
                                      <Badge variant="outline" className="text-xs shrink-0 text-chart-4 border-chart-4/30">
                                        <Link2 className="h-2.5 w-2.5 mr-0.5" />已退款
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(tx.createdAt), "MM-dd HH:mm", { locale: zhCN })}</p>
                                </div>
                              </div>
                              <span className={`font-semibold shrink-0 ml-2 ${isVoided ? "line-through text-muted-foreground" : isPositive ? "text-chart-2" : "text-destructive"}`}>
                                {isPositive ? "+" : "-"}¥{tx.amount.toFixed(2)}
                              </span>
                            </div>
                            {refundTx && (
                              <div className="flex items-center justify-between px-2.5 py-2 border-t border-dashed border-border bg-chart-4/5">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-4/10 ml-0.5">
                                    <ArrowUpCircle className="h-3 w-3 text-chart-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium">退款记录</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(refundTx.createdAt), "MM-dd HH:mm", { locale: zhCN })}</p>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-chart-4">+¥{refundTx.amount.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row gap-2 pt-2 border-t border-border">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="flex-1">
                  <X className="mr-1 h-4 w-4" />取消
                </Button>
                <Button size="sm" onClick={handleSaveEdit} className="flex-1">
                  <Save className="mr-1 h-4 w-4" />保存
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleStartEdit} className="flex-1">
                  <Pencil className="mr-1 h-4 w-4" />编辑
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} className="flex-1">
                  <Trash2 className="mr-1 h-4 w-4" />删除
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {member && (
        <MemberDeleteWithRefundDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          member={member}
          onDeleted={handleMemberDeleted}
        />
      )}
    </>
  );
}
