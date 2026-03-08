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
import { useToast } from "@/hooks/use-toast";
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
  Printer
} from "lucide-react";
import type { Transaction } from "@/types";
import { printTransactionReceipt } from "@/components/receipt/TransactionReceipt";

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
  const { toast } = useToast();
  const { adminPassword, refundBalance, refundCard, addTransaction, voidTransaction, getRelatedTransactions, shopInfo } = useStore();
  const [password, setPassword] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  if (!transaction) return null;

  const typeInfo = typeMap[transaction.type] || typeMap.consume;
  const TypeIcon = typeInfo.icon;
  const isVoided = transaction.voided;
  const isRefundType = transaction.type === 'refund';
  
  // 获取关联交易
  const relatedTransactions = getRelatedTransactions(transaction.id);
  const refundTransaction = relatedTransactions.find(t => t.type === 'refund' && t.relatedTransactionId === transaction.id);
  
  // 防重复退款：已作废、已退款、退款类型交易均不可再退
  const hasRefunded = !!refundTransaction;
  const canRefund = !isVoided && !isRefundType && !hasRefunded && (transaction.type === "consume" || transaction.type === "card_deduct" || transaction.type === "price_diff");

  const handleRefund = async () => {
    if (password !== adminPassword) {
      setPasswordError("管理员密码不正确");
      return;
    }

    setIsRefunding(true);
    setPasswordError("");

    try {
      await new Promise((r) => setTimeout(r, 500));

      let totalRefundAmount = transaction.amount;
      const fundTrail: string[] = [];

      // 1. 处理subTransactions中的退款（原路返回）
      if (transaction.subTransactions && transaction.subTransactions.length > 0) {
        transaction.subTransactions.forEach((sub) => {
          if (sub.type === 'card' && sub.cardId) {
            refundCard(transaction.memberId, sub.cardId);
            fundTrail.push(`次卡已原路退回1次（价值 ¥${sub.amount}）`);
          }
          if (sub.type === 'balance') {
            refundBalance(transaction.memberId, sub.amount);
            fundTrail.push(`¥${sub.amount} 已原路退回会员余额`);
          }
          if (sub.type === 'price_diff') {
            const method = paymentMethodMap[sub.paymentMethod || 'cash'];
            fundTrail.push(`补差价 ¥${sub.amount} 需手动通过${method}原路退还给顾客`);
          }
        });
      } else {
        // 2. 处理旧格式 / 散客交易（没有subTransactions）
        if (transaction.type === "consume" && transaction.paymentMethod === "balance") {
          // 会员余额消费 → 原路退回余额
          refundBalance(transaction.memberId, transaction.amount);
          fundTrail.push(`¥${transaction.amount} 已原路退回会员余额`);
        } else if (transaction.paymentMethod && transaction.paymentMethod !== 'balance') {
          // 散客/现金/微信/支付宝消费 → 提示手动原路退还
          const method = paymentMethodMap[transaction.paymentMethod];
          fundTrail.push(`¥${transaction.amount} 需手动通过${method}原路退还给顾客`);
        }
      }

      // 计算总退款金额（包含补差价）
      const priceDiffAmount = transaction.subTransactions?.find(s => s.type === 'price_diff')?.amount || 0;
      totalRefundAmount = transaction.amount + priceDiffAmount;

      // 生成退款说明（含原路返回路径）
      const refundPaths: string[] = [];
      if (transaction.subTransactions) {
        if (transaction.subTransactions.some(s => s.type === 'card')) refundPaths.push('次卡原路退回');
        if (transaction.subTransactions.some(s => s.type === 'balance')) refundPaths.push('余额原路退回');
        if (transaction.subTransactions.some(s => s.type === 'price_diff')) {
          const method = paymentMethodMap[transaction.subTransactions.find(s => s.type === 'price_diff')?.paymentMethod || 'cash'];
          refundPaths.push(`${method}手动退还`);
        }
      } else if (transaction.paymentMethod === 'balance') {
        refundPaths.push('余额原路退回');
      } else if (transaction.paymentMethod) {
        refundPaths.push(`${paymentMethodMap[transaction.paymentMethod]}手动退还`);
      }

      const refundDesc = `退款 - ${transaction.description}（${refundPaths.join('，')}）`;

      // 3. 作废原交易
      voidTransaction(transaction.id);

      // 4. 添加退款记录（关联原交易ID）
      addTransaction({
        memberId: transaction.memberId,
        memberName: transaction.memberName,
        type: "refund",
        amount: totalRefundAmount,
        description: refundDesc,
        relatedTransactionId: transaction.id,
        subTransactions: transaction.subTransactions?.map(sub => ({
          ...sub,
          type: sub.type as 'balance' | 'card' | 'price_diff',
        })),
      });

      toast({
        title: "退款成功",
        description: fundTrail.length > 0 ? fundTrail.join('；') : `已退款 ¥${totalRefundAmount.toFixed(2)}`,
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
                      <div className="flex-1">
                        <p className="font-medium">
                          {isCard ? '次卡抵扣' : isBalance ? '余额支付' : '补差价'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isCard && '消费1次'}
                          {isBalance && '从账户余额扣除'}
                          {isPriceDiff && `${paymentMethodMap[sub.paymentMethod || 'cash']}支付`}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className={`font-semibold ${isPriceDiff ? 'text-chart-1' : ''}`}>
                        ¥{sub.amount.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
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
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <p className="font-medium">退款将按原路返回：</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {transaction.subTransactions?.some(s => s.type === 'card') && (
                        <li>次卡消费 → 次数自动退回原卡</li>
                      )}
                      {transaction.subTransactions?.some(s => s.type === 'balance') && (
                        <li>余额消费 → 金额自动退回会员账户</li>
                      )}
                      {transaction.subTransactions?.some(s => s.type === 'price_diff') && (
                        <li>补差价部分 → 需手动通过{paymentMethodMap[transaction.subTransactions?.find(s => s.type === 'price_diff')?.paymentMethod || 'cash']}退还</li>
                      )}
                      {!transaction.subTransactions && transaction.paymentMethod === 'balance' && (
                        <li>余额消费 → 金额自动退回会员账户</li>
                      )}
                      {!transaction.subTransactions && transaction.paymentMethod && transaction.paymentMethod !== 'balance' && (
                        <li>{paymentMethodMap[transaction.paymentMethod]}支付 → 需手动原路退还给顾客</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
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
