import { ShoppingCart, Trash2, UserX, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import type { Service, MemberCard } from "@/types";

export interface CartItem {
  service: Service;
  useCard: boolean;
  card?: MemberCard;
}

interface CartPanelProps {
  cart: CartItem[];
  isWalkIn: boolean;
  memberBalance: number;
  paymentMethod: "wechat" | "alipay" | "cash";
  isCheckingOut: boolean;
  lastRemoved: { item: CartItem; index: number } | null;
  getEffectiveRemaining: (item: CartItem, index: number) => number;
  onToggleCardUse: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onUndoRemove: () => void;
  onClearCart: () => void;
  onPaymentMethodChange: (method: "wechat" | "alipay" | "cash") => void;
  onCheckout: () => void;
  // Calculated values
  cardDeductTotal: number;
  balanceDeduct: number;
  cashNeed: number;
  total: number;
}

export function CartPanel({
  cart,
  isWalkIn,
  memberBalance,
  paymentMethod,
  isCheckingOut,
  lastRemoved,
  getEffectiveRemaining,
  onToggleCardUse,
  onRemoveItem,
  onUndoRemove,
  onClearCart,
  onPaymentMethodChange,
  onCheckout,
  cardDeductTotal,
  balanceDeduct,
  cashNeed,
  total,
}: CartPanelProps) {
  const hasBalanceWarning = !isWalkIn && balanceDeduct > 0 && cashNeed > 0;

  return (
    <Card className="sticky top-6">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">结算清单</p>
            {cart.length > 0 && (
              <Badge variant="secondary" className="text-2xs px-1.5 py-0 tabular-nums">
                {cart.length}项
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isWalkIn && (
              <Badge variant="outline" className="text-2xs font-normal">散客</Badge>
            )}
            {cart.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-2xs text-muted-foreground hover:text-destructive px-2"
                onClick={onClearCart}
              >
                清空
              </Button>
            )}
          </div>
        </div>

        {/* Undo bar */}
        {lastRemoved && (
          <div className="relative flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs overflow-hidden">
            <span className="text-muted-foreground truncate">
              已移除 {lastRemoved.item.service.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs text-brand px-2 shrink-0"
              onClick={onUndoRemove}
            >
              <Undo2 className="h-3 w-3" />撤销
            </Button>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand/30 origin-left animate-undo-countdown" />
          </div>
        )}

        {/* Empty state */}
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShoppingCart className="mb-2 h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">点击左侧服务添加</p>
          </div>
        ) : (
          <>
            {/* Walk-in notice */}
            {isWalkIn && (
              <Alert className="py-2 [&>svg]:h-3.5 [&>svg]:w-3.5">
                <UserX className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">
                  散客结账，无法使用余额和次卡
                </AlertDescription>
              </Alert>
            )}

            {/* Cart items */}
            <div className="space-y-0 max-h-[280px] overflow-auto -mx-1 px-1">
              {cart.map((item, index) => {
                const remaining = getEffectiveRemaining(item, index);
                return (
                  <div
                    key={index}
                    className="group flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.service.name}</p>
                      {item.card && item.useCard ? (
                        <p className="text-xs text-muted-foreground">
                          次卡抵扣 · 剩{remaining}次
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          ¥{item.service.price}
                        </p>
                      )}
                      {item.card && !isWalkIn && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline mt-0.5"
                          onClick={() => onToggleCardUse(index)}
                        >
                          {item.useCard ? "改为现金" : "使用次卡"}
                        </button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveItem(index)}
                      title="移除"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Payment breakdown */}
            <div className="space-y-1.5 text-sm">
              {cardDeductTotal > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">次卡抵扣</span>
                  <span className="tabular-nums text-muted-foreground">-¥{cardDeductTotal}</span>
                </div>
              )}
              {balanceDeduct > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">余额支付</span>
                  <span className="tabular-nums">¥{balanceDeduct}</span>
                </div>
              )}

              {/* Balance warning */}
              {hasBalanceWarning && (
                <p className="text-xs text-warning-foreground bg-warning/10 rounded px-2 py-1.5">
                  余额不足，需补差价 ¥{cashNeed}
                </p>
              )}

              {/* Amount due */}
              {cashNeed > 0 && (
                <div className="rounded-md bg-muted/50 p-2.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">
                      {isWalkIn ? "应付" : "需补"}
                    </span>
                    <span className="text-lg font-semibold tabular-nums">
                      ¥{cashNeed.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment method */}
            {cashNeed > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">支付方式</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) =>
                    onPaymentMethodChange(v as "wechat" | "alipay" | "cash")
                  }
                  className="flex gap-4"
                >
                  {[
                    { value: "wechat", label: "微信" },
                    { value: "alipay", label: "支付宝" },
                    { value: "cash", label: "现金" },
                  ].map((m) => (
                    <div key={m.value} className="flex items-center space-x-1.5">
                      <RadioGroupItem value={m.value} id={`c-${m.value}`} />
                      <Label htmlFor={`c-${m.value}`} className="cursor-pointer text-sm">
                        {m.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <Separator />

            {/* Total + checkout */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">合计</span>
                <span className="text-xl font-bold tabular-nums">¥{total.toFixed(2)}</span>
              </div>
              <LoadingButton
                className="w-full"
                onClick={onCheckout}
                loading={isCheckingOut}
                disabled={cart.length === 0}
              >
                确认结账
              </LoadingButton>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
