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
import { ArrowUpCircle, ArrowDownCircle, CreditCard, AlertTriangle, Undo2 } from "lucide-react";
import type { Transaction } from "@/types";

const typeMap = {
  recharge: { label: "充值", icon: ArrowUpCircle, color: "text-chart-2" },
  consume: { label: "消费", icon: ArrowDownCircle, color: "text-destructive" },
  card_deduct: { label: "次卡扣除", icon: CreditCard, color: "text-chart-3" },
  refund: { label: "退款", icon: ArrowUpCircle, color: "text-chart-4" },
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
  const { adminPassword, rechargeMember, addTransaction, voidTransaction } = useStore();
  const [password, setPassword] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  if (!transaction) return null;

  const typeInfo = typeMap[transaction.type];
  const TypeIcon = typeInfo.icon;
  const isVoided = transaction.voided;
  const canRefund = !isVoided && (transaction.type === "consume" || transaction.type === "card_deduct");

  const handleRefund = async () => {
    if (password !== adminPassword) {
      setPasswordError("管理员密码不正确");
      return;
    }

    setIsRefunding(true);
    setPasswordError("");

    try {
      await new Promise((r) => setTimeout(r, 500));

      // 1. 如果是余额消费，退回余额
      if (transaction.type === "consume" && transaction.paymentMethod === "balance") {
        rechargeMember(transaction.memberId, transaction.amount);
      }

      // 2. 作废原交易
      voidTransaction(transaction.id);

      // 3. 添加退款记录
      addTransaction({
        memberId: transaction.memberId,
        memberName: transaction.memberName,
        type: "refund",
        amount: transaction.amount,
        description: `退款 - ${transaction.description}`,
        relatedTransactionId: transaction.id,
      });

      toast({
        title: "退款成功",
        description: `已退款 ¥${transaction.amount.toFixed(2)}`,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
            交易详情
          </DialogTitle>
          <DialogDescription>
            查看交易详情{canRefund ? "，可进行退款操作" : ""}
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
              <span className={`text-right ${isVoided ? "line-through" : ""}`}>
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
                  <AlertDescription>
                    退款后将作废此交易，{transaction.paymentMethod === "balance" ? "余额将退回会员账户" : "请手动退还现金/在线支付"}
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
