import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Wallet, Banknote, User } from "lucide-react";

interface CardUsageInfo {
  cardName: string;
  originalCount: number;
  consumedCount: number;
  remainingCount: number;
}

interface CheckoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isWalkIn: boolean;
  memberName?: string;
  memberBalance?: number;
  balanceAfter?: number;
  services: { name: string; price: number; useCard: boolean; cardName?: string }[];
  cardDeductTotal: number;
  balanceDeduct: number;
  cashNeed: number;
  total: number;
  paymentMethod: string;
  cardUsageInfo?: CardUsageInfo[];
}

const paymentMethodMap: Record<string, string> = {
  wechat: "微信支付",
  alipay: "支付宝",
  cash: "现金",
  balance: "余额支付",
};

export function CheckoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isWalkIn,
  memberName,
  memberBalance = 0,
  balanceAfter = 0,
  services,
  cardDeductTotal,
  balanceDeduct,
  cashNeed,
  total,
  paymentMethod,
  cardUsageInfo = [],
}: CheckoutConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            确认结账
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              {/* 顾客信息 */}
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  {isWalkIn ? "散客结账" : memberName}
                </span>
                {isWalkIn && (
                  <Badge variant="secondary" className="ml-auto">
                    非会员
                  </Badge>
                )}
              </div>

              {/* 消费明细 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">消费明细</p>
                {services.map((service, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-sm"
                  >
                    <span className="flex items-center gap-1">
                      {service.name}
                      {service.useCard && (
                        <Badge variant="outline" className="text-xs">
                          次卡
                        </Badge>
                      )}
                    </span>
                    <span>¥{service.price}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* 支付明细 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">支付方式</p>
                {cardDeductTotal > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      次卡抵扣
                    </span>
                    <span className="text-chart-2">-¥{cardDeductTotal}</span>
                  </div>
                )}
                {balanceDeduct > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      余额支付
                    </span>
                    <span>¥{balanceDeduct}</span>
                  </div>
                )}
                {cashNeed > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Banknote className="h-4 w-4" />
                      需补差价（{paymentMethodMap[paymentMethod] || paymentMethod}）
                    </span>
                    <span className="text-primary font-medium">¥{cashNeed}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* 结账总计 */}
              <div className="flex items-center justify-between font-medium">
                <span className="text-foreground">消费总计</span>
                <span className="text-lg text-primary">¥{total}</span>
              </div>

              {/* 次卡使用明细 */}
              {cardUsageInfo.length > 0 && (
                <div className="rounded-lg bg-chart-3/10 p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    次卡使用明细
                  </p>
                  {cardUsageInfo.map((card, index) => (
                    <div key={index} className="text-sm space-y-1">
                      <p className="font-medium">{card.cardName}</p>
                      <div className="flex justify-between text-muted-foreground">
                        <span>原余次数</span>
                        <span>{card.originalCount}次</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>本次消费</span>
                        <span>-{card.consumedCount}次</span>
                      </div>
                      <div className="flex justify-between font-medium text-foreground">
                        <span>剩余次数</span>
                        <span className="text-primary">{card.remainingCount}次</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 会员余额变化 */}
              {!isWalkIn && balanceDeduct > 0 && (
                <div className="rounded-lg bg-primary/10 p-3 text-sm">
                  <div className="flex justify-between">
                    <span>原余额</span>
                    <span>¥{memberBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>本次消费</span>
                    <span>-¥{balanceDeduct.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>剩余余额</span>
                    <span className="text-primary">¥{balanceAfter.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认结账</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
