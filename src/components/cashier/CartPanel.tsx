import { ShoppingCart, Trash2, UserX, Undo2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">结算清单</h3>
            {cart.length > 0 && (
              <Badge variant="secondary" className="text-2xs px-1.5 py-0 tabular-nums rounded-md">
                {cart.length}
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
                className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                onClick={onClearCart}
              >
                清空
              </Button>
            )}
          </div>
        </div>

        {/* Undo bar */}
        {lastRemoved && (
          <div className="relative flex items-center justify-between bg-muted/50 px-4 py-2 text-xs overflow-hidden border-b border-border">
            <span className="text-muted-foreground truncate">
              已移除 {lastRemoved.item.service.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs text-foreground px-2 shrink-0"
              onClick={onUndoRemove}
            >
              <Undo2 className="h-3 w-3" />撤销
            </Button>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground/20 origin-left animate-undo-countdown" />
          </div>
        )}

        {/* Body */}
        <div className="px-4">
          {/* Empty state */}
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <ShoppingCart className="h-5 w-5 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">暂无服务项目</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">点击左侧服务添加到清单</p>
            </div>
          ) : (
            <>
              {/* Walk-in notice */}
              {isWalkIn && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 mt-3 text-xs text-muted-foreground">
                  <UserX className="h-3.5 w-3.5 shrink-0" />
                  散客结账，无法使用余额和次卡
                </div>
              )}

              {/* Cart items */}
              <div className="py-3 space-y-0 max-h-[320px] overflow-auto">
                {cart.map((item, index) => {
                  const remaining = getEffectiveRemaining(item, index);
                  return (
                    <div
                      key={index}
                      className="group flex items-center gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/30 -mx-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{item.service.name}</p>
                        </div>
                        {item.card && item.useCard ? (
                          <p className="text-xs text-muted-foreground">
                            次卡抵扣 · 剩余{remaining}次
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            ¥{item.service.price}
                          </p>
                        )}
                        {item.card && !isWalkIn && (
                          <button
                            type="button"
                            className="text-xs text-foreground/60 hover:text-foreground hover:underline mt-0.5 transition-colors"
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
                        <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Payment breakdown */}
              <div className="space-y-2 py-3 text-sm">
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

                {hasBalanceWarning && (
                  <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
                    余额不足，需补差价 ¥{cashNeed}
                  </p>
                )}

                {cashNeed > 0 && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">
                        {isWalkIn ? "应付金额" : "需补差价"}
                      </span>
                      <span className="text-xl font-bold tabular-nums tracking-tight">
                        ¥{cashNeed.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment method */}
              {cashNeed > 0 && (
                <div className="pb-3">
                  <Label className="text-xs text-muted-foreground mb-2 block">支付方式</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) =>
                      onPaymentMethodChange(v as "wechat" | "alipay" | "cash")
                    }
                    className="flex gap-1"
                  >
                    {[
                      { value: "wechat", label: "微信" },
                      { value: "alipay", label: "支付宝" },
                      { value: "cash", label: "现金" },
                    ].map((m) => (
                      <Label
                        key={m.value}
                        htmlFor={`c-${m.value}`}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-all min-h-[44px]",
                          paymentMethod === m.value
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:bg-muted/40"
                        )}
                      >
                        <RadioGroupItem value={m.value} id={`c-${m.value}`} className="sr-only" />
                        {m.label}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <Separator />

              {/* Total + checkout */}
              <div className="py-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">合计</span>
                  <span className="text-2xl font-bold tabular-nums tracking-tight">¥{total.toFixed(2)}</span>
                </div>
                <LoadingButton
                  className="w-full h-12 text-base font-semibold"
                  onClick={onCheckout}
                  loading={isCheckingOut}
                  disabled={cart.length === 0}
                >
                  确认结账
                </LoadingButton>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
