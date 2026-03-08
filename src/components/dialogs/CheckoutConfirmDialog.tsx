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
      <AlertDialogContent className="max-w-md p-0 overflow-hidden">
        <AlertDialogHeader className="px-5 pt-5 pb-3">
          <AlertDialogTitle className="text-base">确认结账</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-0">
              {/* 顾客信息 */}
              <div className="flex items-center gap-2.5 rounded-md bg-muted/50 p-2.5 mt-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {isWalkIn ? <User className="h-4 w-4" /> : (memberName?.charAt(0) || '?')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {isWalkIn ? "散客结账" : memberName}
                  </p>
                  {!isWalkIn && memberBalance !== undefined && (
                    <p className="text-[11px] text-muted-foreground">余额 ¥{memberBalance.toFixed(2)}</p>
                  )}
                </div>
                {isWalkIn && (
                  <Badge variant="secondary" className="text-[10px]">非会员</Badge>
                )}
              </div>

              {/* 消费明细 */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">消费明细</p>
                  <span className="text-[11px] text-muted-foreground">{services.length} 项</span>
                </div>
                <div className="space-y-0.5">
                  {services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5 text-sm"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="truncate text-foreground">{service.name}</span>
                        {service.useCard && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-4 shrink-0">
                            {service.cardName || '次卡'}
                          </Badge>
                        )}
                      </span>
                      <span className={`shrink-0 tabular-nums ${service.useCard ? 'line-through text-muted-foreground text-xs' : 'text-foreground'}`}>
                        ¥{service.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 支付汇总区 - 灰底 */}
        <div className="bg-muted/30 border-t border-border px-5 py-3 space-y-2.5">
          {/* 支付方式明细 */}
          <div className="space-y-1.5">
            {cardDeductTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  次卡抵扣
                </span>
                <span className="text-chart-2 tabular-nums">-¥{cardDeductTotal}</span>
              </div>
            )}
            {balanceDeduct > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  余额支付
                </span>
                <span className="tabular-nums">-¥{balanceDeduct}</span>
              </div>
            )}
            {cashNeed > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5" />
                  {isWalkIn ? '' : '补差价 · '}{paymentMethodMap[paymentMethod] || paymentMethod}
                </span>
                <span className="text-primary font-medium tabular-nums">¥{cashNeed}</span>
              </div>
            )}
          </div>

          {/* 次卡使用明细 */}
          {cardUsageInfo.length > 0 && (
            <div className="space-y-1">
              {cardUsageInfo.map((card, index) => (
                <div key={index} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    {card.cardName}
                  </span>
                  <span className="tabular-nums">
                    {card.originalCount}次
                    <span className="mx-0.5">→</span>
                    <span className="text-primary font-medium">{card.remainingCount}次</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 会员余额变化 */}
          {!isWalkIn && balanceDeduct > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>余额变化</span>
              <span className="tabular-nums">
                ¥{memberBalance.toFixed(2)}
                <span className="mx-0.5">→</span>
                <span className="text-primary font-medium">¥{balanceAfter.toFixed(2)}</span>
              </span>
            </div>
          )}
        </div>

        {/* 总计 + 按钮 */}
        <div className="px-5 pb-5 pt-3 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-foreground">消费总计</span>
            <span className="text-xl font-bold text-primary tabular-nums">¥{total}</span>
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel className="flex-1">取消</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} className="flex-1">确认结账</AlertDialogAction>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
