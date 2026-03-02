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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingButton } from "@/components/ui/loading-button";
import { useStore } from "@/stores/useStore";
import { toast } from "sonner";
import { refundTransaction as refundTransactionApi } from "@/lib/adminApi";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CreditCard, 
  AlertTriangle, 
  Undo2, 
  ArrowRight,
  Wallet,
  Banknote,
  Link2,
  HandCoins
} from "lucide-react";
import type { Transaction } from "@/types";

const typeMap = {
  recharge: { label: "充值", icon: ArrowUpCircle, color: "text-chart-2", bgColor: "bg-chart-2/10" },
  consume: { label: "消费", icon: ArrowDownCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
  card_deduct: { label: "次卡扣除", icon: CreditCard, color: "text-chart-3", bgColor: "bg-chart-3/10" },
  refund: { label: "退款", icon: ArrowUpCircle, color: "text-chart-4", bgColor: "bg-chart-4/10" },
  price_diff: { label: "补差价", icon: ArrowDownCircle, color: "text-chart-1", bgColor: "bg-chart-1/10" },
};

const paymentMethodMap: Record<string, string> = {
  balance: "余额",
  wechat: "微信",
  alipay: "支付宝",
  cash: "现金",
};

interface TransactionRefundDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionRefundDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionRefundDialogProps) {
  
  const { getRelatedTransactions } = useStore();
  const [password, setPassword] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  if (!transaction) return null;

  const typeInfo = typeMap[transaction.type] || typeMap.consume;
  const TypeIcon = typeInfo.icon;
  const isVoided = transaction.voided;
  const isRefundType = transaction.type === 'refund';
  const canRefund = !isVoided && !isRefundType && (transaction.type === "consume" || transaction.type === "card_deduct" || transaction.type === "price_diff");

  // 获取关联交易
  const relatedTransactions = getRelatedTransactions(transaction.id);
  const refundTransaction = relatedTransactions.find(t => t.type === 'refund' && t.relatedTransactionId === transaction.id);

  // 检查是否有需要手动退还的补差价
  const priceDiffSub = transaction.subTransactions?.find(s => s.type === 'price_diff');
  const hasManualRefund = !!priceDiffSub;

  const handleRefund = async () => {
    setIsRefunding(true);
    setPasswordError("");

    try {
      // Use server-side refund with password verification
      const result = await refundTransactionApi({
        password,
        transactionId: transaction.id,
        memberId: transaction.memberId,
        memberName: transaction.memberName,
        originalAmount: transaction.amount,
        description: transaction.description || '',
        subTransactions: transaction.subTransactions?.map(sub => ({
          type: sub.type as 'balance' | 'card' | 'price_diff',
          amount: sub.amount,
          cardId: sub.cardId,
          paymentMethod: sub.paymentMethod,
        })),
        paymentMethod: transaction.paymentMethod,
      });

      if (!result.success) {
        setPasswordError(result.error || "退款失败");
        return;
      }

      // Note: Parent component should refetch data after dialog closes

      toast.success("退款成功", {
        description: result.fundTrail && result.fundTrail.length > 0 
          ? result.fundTrail.join('；') 
          : `已退款 ¥${result.refundAmount?.toFixed(2) || transaction.amount.toFixed(2)}`,
      });

      setPassword("");
      onOpenChange(false);
    } finally {
      setIsRefunding(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setPasswordError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${typeInfo.bgColor}`}>
              <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
            </div>
            交易详情
          </DialogTitle>
          <DialogDescription>
            {isRefundType ? "查看退款记录" : canRefund ? "查看交易详情，可进行退款操作" : "查看交易详情"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 交易状态 */}
          {isVoided && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>此交易已作废退款</AlertDescription>
            </Alert>
          )}

          {/* 交易信息 */}
          <div className={`space-y-3 rounded-lg border border-border p-4 ${isVoided ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">交易类型</span>
              <Badge variant={isVoided ? "outline" : "secondary"}>
                {typeInfo.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">会员</span>
              <span className="font-medium">{transaction.memberName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">描述</span>
              <span className={`text-right max-w-[200px] truncate ${isVoided ? "line-through" : ""}`}>
                {transaction.description}
              </span>
            </div>
            {transaction.paymentMethod && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">支付方式</span>
                <span>{paymentMethodMap[transaction.paymentMethod]}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">时间</span>
              <span>{format(new Date(transaction.createdAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">金额</span>
              <span className={`text-xl font-bold ${isVoided ? "line-through text-muted-foreground" : typeInfo.color}`}>
                {transaction.type === "recharge" || transaction.type === "refund" ? "+" : "-"}
                ¥{transaction.amount.toFixed(2)}
              </span>
            </div>
          </div>
          
          {/* 显示合并的子交易明细 - 资金去向轨迹 */}
          {transaction.subTransactions && transaction.subTransactions.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                资金与卡次去向
              </p>
              <div className="space-y-2">
                {transaction.subTransactions.map((sub, index) => {
                  const isCard = sub.type === 'card';
                  const isBalance = sub.type === 'balance';
                  const isPriceDiff = sub.type === 'price_diff';
                  
                  return (
                    <div key={index} className="flex items-center gap-3 text-sm rounded-lg border border-border/50 p-2.5 bg-background">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isCard ? 'bg-chart-3/10' : isBalance ? 'bg-chart-2/10' : 'bg-chart-1/10'
                      }`}>
                        {isCard && <CreditCard className="h-4 w-4 text-chart-3" />}
                        {isBalance && <Wallet className="h-4 w-4 text-chart-2" />}
                        {isPriceDiff && <Banknote className="h-4 w-4 text-chart-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {isCard ? '次卡抵扣' : isBalance ? '余额支付' : '补差价'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isCard && '消费1次'}
                          {isBalance && '从账户余额扣除'}
                          {isPriceDiff && `${paymentMethodMap[sub.paymentMethod || 'cash']}支付`}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={`font-semibold shrink-0 ${isPriceDiff ? 'text-chart-1' : ''}`}>
                        ¥{sub.amount.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 手动退款提醒 - 更明显的显示 */}
          {hasManualRefund && canRefund && (
            <Alert className="border-chart-1/30 bg-chart-1/5">
              <HandCoins className="h-4 w-4 text-chart-1" />
              <AlertDescription className="text-sm">
                <strong>需手动退还：</strong>
                {paymentMethodMap[priceDiffSub?.paymentMethod || 'cash']} ¥{priceDiffSub?.amount.toFixed(2)}
                <p className="text-xs text-muted-foreground mt-1">
                  补差价部分系统无法自动处理，请完成退款后手动将现金/微信/支付宝款项退还给会员。
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* 关联退款记录 */}
          {refundTransaction && (
            <div className="rounded-lg border border-chart-4/30 bg-chart-4/5 p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2 text-chart-4">
                <Undo2 className="h-4 w-4" />
                关联退款记录
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">退款时间</span>
                <span>{format(new Date(refundTransaction.createdAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">退款金额</span>
                <span className="font-semibold text-chart-4">+¥{refundTransaction.amount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* 如果是退款交易，显示原交易链接 */}
          {isRefundType && transaction.relatedTransactionId && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                此为退款记录，原消费订单已作废
              </p>
            </div>
          )}

          {/* 退款操作 */}
          {canRefund && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label htmlFor="admin-password">管理员密码验证</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="请输入管理员密码"
                  onKeyDown={(e) => e.key === "Enter" && handleRefund()}
                  disabled={isRefunding}
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    退款后将作废此交易。
                    {transaction.subTransactions?.some(s => s.type === 'card') && " 次卡次数将自动退回。"}
                    {transaction.subTransactions?.some(s => s.type === 'balance') && " 余额将退回会员账户。"}
                    {transaction.subTransactions?.some(s => s.type === 'price_diff') && " ⚠️ 补差价部分请手动退还。"}
                    {!transaction.subTransactions && transaction.paymentMethod === 'balance' && " 余额将退回会员账户。"}
                    {!transaction.subTransactions && transaction.paymentMethod && transaction.paymentMethod !== 'balance' && " ⚠️ 请手动退还现金/在线支付。"}
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRefunding}>
            {canRefund ? "取消" : "关闭"}
          </Button>
          {canRefund && (
            <LoadingButton
              variant="destructive"
              onClick={handleRefund}
              loading={isRefunding}
              disabled={!password}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              确认退款
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
