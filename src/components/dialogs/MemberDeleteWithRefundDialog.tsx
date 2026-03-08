import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CreditCard, Calculator, Trash2 } from "lucide-react";
import type { Member, MemberCard } from "@/types";

interface CardRefundDetail {
  card: MemberCard;
  templateName: string;
  originalPrice: number;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  refundAmount: number;
}

interface MemberDeleteWithRefundDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function MemberDeleteWithRefundDialog({
  member,
  open,
  onOpenChange,
  onDeleted,
}: MemberDeleteWithRefundDialogProps) {
  const { toast } = useToast();
  const { adminPassword, deleteMember, cardTemplates, addTransaction } = useStore();
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"refund" | "confirm">("refund");

  // 计算每张次卡的退款详情
  const refundDetails = useMemo<CardRefundDetail[]>(() => {
    if (!member) return [];
    
    return member.cards.map((card) => {
      // 优先使用卡片自身保存的原始价格和总次数，其次从模板获取
      const template = cardTemplates.find((t) => t.id === card.templateId);
      const originalPrice = card.originalPrice ?? template?.price ?? 0;
      const totalCount = card.originalTotalCount ?? template?.totalCount ?? card.remainingCount;
      const usedCount = totalCount - card.remainingCount;
      const refundRatio = totalCount > 0 ? card.remainingCount / totalCount : 0;
      const refundAmount = originalPrice * refundRatio;

      return {
        card,
        templateName: card.templateName,
        originalPrice,
        totalCount,
        usedCount,
        remainingCount: card.remainingCount,
        refundAmount: Math.round(refundAmount * 100) / 100,
      };
    });
  }, [member, cardTemplates]);

  const totalCardRefund = useMemo(() => {
    return refundDetails.reduce((sum, detail) => sum + detail.refundAmount, 0);
  }, [refundDetails]);

  const totalRefund = useMemo(() => {
    if (!member) return 0;
    return member.balance + totalCardRefund;
  }, [member, totalCardRefund]);

  const handleConfirmRefund = () => {
    setStep("confirm");
  };

  const handleConfirmDelete = () => {
    if (password !== adminPassword) {
      toast({
        title: "密码错误",
        description: "管理员密码不正确，请重试",
        variant: "destructive",
      });
      return;
    }

    if (!member) return;

    // 创建退款交易记录（如果有需要退款的金额）
    if (totalRefund > 0) {
      addTransaction({
        memberId: member.id,
        memberName: member.name,
        type: "refund",
        amount: totalRefund,
        description: `会员注销退款 (余额¥${member.balance.toFixed(2)} + 次卡折现¥${totalCardRefund.toFixed(2)})`,
      });
    }

    // 删除会员
    deleteMember(member.id);

    toast({
      title: "操作成功",
      description: totalRefund > 0 
        ? `已退款 ¥${totalRefund.toFixed(2)}，会员已删除`
        : "会员已删除",
    });

    // 重置状态
    setPassword("");
    setStep("refund");
    onOpenChange(false);
    onDeleted();
  };

  const handleClose = () => {
    setPassword("");
    setStep("refund");
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            删除会员
          </DialogTitle>
          <DialogDescription>
            {step === "refund" 
              ? "删除前请确认退款信息" 
              : "请输入管理员密码确认删除"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 -mx-6 px-6 overflow-y-auto overflow-x-hidden scroll-hint-bottom">
          {step === "refund" ? (
            <div className="space-y-4 pb-4">
              {/* 会员信息 */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.phone}</p>
                </div>
              </div>

              {/* 账户余额 */}
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">账户余额</span>
                  <span className="text-lg font-semibold text-chart-2">¥{member.balance.toFixed(2)}</span>
                </div>
              </div>

              {/* 次卡退款明细 */}
              {refundDetails.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">次卡退款明细</span>
                    <Badge variant="secondary">{refundDetails.length}张</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {refundDetails.map((detail) => (
                      <div 
                        key={detail.card.id}
                        className="p-3 rounded-lg border border-border bg-muted/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{detail.templateName}</span>
                          <Badge variant={detail.remainingCount <= 1 ? "destructive" : "default"}>
                            剩余{detail.remainingCount}次
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>原价：¥{detail.originalPrice}</span>
                            <span>总次数：{detail.totalCount}次</span>
                          </div>
                          <div className="flex justify-between">
                            <span>已用：{detail.usedCount}次</span>
                            <span>剩余：{detail.remainingCount}次</span>
                          </div>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calculator className="h-3 w-3" />
                            <span>¥{detail.originalPrice} × ({detail.remainingCount}/{detail.totalCount})</span>
                          </div>
                          <span className="font-semibold text-chart-2">= ¥{detail.refundAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-chart-2/10 border border-chart-2/20">
                    <span className="font-medium">次卡折现小计</span>
                    <span className="text-lg font-bold text-chart-2">¥{totalCardRefund.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* 总退款金额 */}
              <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">应退款总额</span>
                  <span className="text-2xl font-bold text-primary">¥{totalRefund.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  = 账户余额 ¥{member.balance.toFixed(2)} + 次卡折现 ¥{totalCardRefund.toFixed(2)}
                </p>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  确认退款后将删除该会员，此操作不可恢复！
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  即将删除会员 <strong>{member.name}</strong>
                  {totalRefund > 0 && (
                    <>，并退款 <strong>¥{totalRefund.toFixed(2)}</strong></>
                  )}
                  。此操作不可恢复！
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="admin-password">管理员密码</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入管理员密码"
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmDelete()}
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="pt-4 border-t border-border gap-2 sm:gap-2">
          {step === "refund" ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleConfirmRefund}>
                确认退款并删除
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("refund")}>
                返回
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                确认删除
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}