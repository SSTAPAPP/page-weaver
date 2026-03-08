import { useState, useMemo } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, Wallet, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { generateWalkInId } from "@/stores/useStore";
import { useMembers, useServices } from "@/hooks/useCloudData";
import { toast } from "sonner";
import { Member, Service, MemberCard } from "@/types";
import { matchMemberSearch } from "@/lib/pinyin";
import { CheckoutConfirmDialog } from "@/components/dialogs/CheckoutConfirmDialog";
import { processCheckout } from "@/lib/adminApi";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useCloudData";

interface CartItem {
  service: Service;
  useCard: boolean;
  card?: MemberCard;
}

interface CardUsageInfo {
  cardName: string;
  originalCount: number;
  consumedCount: number;
  remainingCount: number;
}

export default function Cashier() {
  const queryClient = useQueryClient();
  const { data: members = [], isLoading: isMembersLoading } = useMembers();
  const { data: services = [], isLoading: isServicesLoading } = useServices();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "cash">("wechat");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const isWalkIn = !selectedMember;

  const searchResults = useMemo(() => {
    if (searchQuery.length < 1) return [];
    return members.filter((m) => matchMemberSearch(m.name, m.phone, searchQuery)).slice(0, 10);
  }, [members, searchQuery]);

  const selectMember = (member: Member) => {
    setSelectedMember(member);
    setSearchQuery("");
    setCart([]);
  };

  const getCardUsageInCart = (cardId: string) => {
    return cart.filter(item => item.useCard && item.card?.id === cardId).length;
  };

  const getEffectiveRemainingCount = (card: MemberCard) => {
    const usedInCart = getCardUsageInCart(card.id);
    return card.remainingCount - usedInCart;
  };

  const addToCart = (service: Service) => {
    const availableCard = selectedMember?.cards.find(
      (card) => card.services.includes(service.id) && getEffectiveRemainingCount(card) > 0
    );
    setCart([...cart, { service, useCard: !!availableCard, card: availableCard }]);
    toast.success("已添加", { description: service.name });
  };

  const removeFromCart = (index: number) => { setCart(cart.filter((_, i) => i !== index)); };

  const toggleCardUse = (index: number) => {
    setCart(cart.map((item, i) => i === index ? { ...item, useCard: !item.useCard } : item));
  };

  const calculatePayment = () => {
    let cardDeductTotal = 0;
    let needPayTotal = 0;
    cart.forEach((item) => {
      if (item.useCard && item.card) { cardDeductTotal += item.service.price; }
      else { needPayTotal += item.service.price; }
    });
    const balanceDeduct = isWalkIn ? 0 : Math.min(selectedMember?.balance || 0, needPayTotal);
    const cashNeed = needPayTotal - balanceDeduct;
    return { cardDeductTotal, balanceDeduct, cashNeed, total: cardDeductTotal + needPayTotal };
  };

  const { cardDeductTotal, balanceDeduct, cashNeed, total } = calculatePayment();

  const cardUsageInfo = useMemo((): CardUsageInfo[] => {
    if (!selectedMember) return [];
    const cardUsageMap = new Map<string, { card: MemberCard; count: number }>();
    cart.forEach((item) => {
      if (item.useCard && item.card) {
        const existing = cardUsageMap.get(item.card.id);
        if (existing) { existing.count += 1; }
        else { cardUsageMap.set(item.card.id, { card: item.card, count: 1 }); }
      }
    });
    return Array.from(cardUsageMap.values()).map(({ card, count }) => ({
      cardName: card.templateName,
      originalCount: card.remainingCount,
      consumedCount: count,
      remainingCount: card.remainingCount - count,
    }));
  }, [cart, selectedMember]);

  const handleCheckoutClick = () => {
    if (cart.length === 0) { toast.error("请添加服务项目"); return; }
    setConfirmDialogOpen(true);
  };

  const handleConfirmCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const memberId = selectedMember?.id || generateWalkInId();
      const memberName = selectedMember?.name || "散客";
      const result = await processCheckout({
        memberId, memberName,
        cart: cart.map((item) => ({
          serviceId: item.service.id,
          serviceName: item.service.name,
          price: item.service.price,
          useCard: item.useCard,
          cardId: item.card?.id,
        })),
        paymentMethod, isWalkIn,
      });

      if (!result.success) {
        toast.error("结账失败", { description: result.error || "请检查网络连接后重试" });
        return;
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.todayStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.cloudCounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardTemplates });

      toast.success("结账成功", { description: `${isWalkIn ? "散客" : selectedMember?.name}消费 ¥${total}` });
      setSelectedMember(null);
      setCart([]);
      setConfirmDialogOpen(false);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("结账失败", { description: "请检查网络连接后重试" });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const servicesByCategory = useMemo(() => {
    const categories = [...new Set(services.map((s) => s.category))];
    return categories.map((category) => ({
      category,
      services: services.filter((s) => s.category === category),
    }));
  }, [services]);

  const isLoading = isMembersLoading || isServicesLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="收银台" description="选择顾客和服务项目，快速完成结账" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer selection */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">顾客</p>
            {selectedMember ? (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-medium">
                    {selectedMember.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedMember.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedMember.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">余额</p>
                    <p className="text-sm font-semibold tabular-nums">¥{selectedMember.balance.toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedMember(null)}>更换</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <UserX className="h-3.5 w-3.5" />
                  <span>散客模式 · 搜索选择会员</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="输入姓名或手机号" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-[200px] overflow-auto rounded-md border divide-y divide-border">
                    {searchResults.map((member) => (
                      <div key={member.id} onClick={() => selectMember(member)} className="cursor-pointer px-3 py-2.5 transition-colors hover:bg-muted/40">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.phone}</p>
                          </div>
                          <p className="text-sm tabular-nums">¥{member.balance.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">服务项目</p>
            {isLoading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}
              </div>
            ) : services.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="暂无服务项目" description="请先在服务管理中添加服务" />
            ) : (
              <div className="space-y-4">
                {servicesByCategory.map(({ category, services: categoryServices }) => (
                  <div key={category}>
                    <p className="text-xs text-muted-foreground mb-1.5">{category}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {categoryServices.map((service) => {
                        const hasCard = selectedMember?.cards.some(
                          (card) => card.services.includes(service.id) && getEffectiveRemainingCount(card) > 0
                        );
                        return (
                          <div
                            key={service.id}
                            onClick={() => addToCart(service)}
                            className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/30"
                          >
                            <div>
                              <p className="text-sm font-medium">{service.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground tabular-nums">¥{service.price}</p>
                                {hasCard && <Badge variant="secondary" className="text-[10px] font-normal">有次卡</Badge>}
                              </div>
                            </div>
                            <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div>
          <Card className="sticky top-6">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">结算清单</p>
                {isWalkIn && <Badge variant="outline" className="text-[10px] font-normal">散客</Badge>}
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ShoppingCart className="mb-2 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">请选择服务项目</p>
                </div>
              ) : (
                <>
                  {isWalkIn && (
                    <Alert className="py-2">
                      <UserX className="h-3.5 w-3.5" />
                      <AlertDescription className="text-xs">散客结账，无法使用余额和次卡</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-1 max-h-[300px] overflow-auto">
                    {cart.map((item, index) => {
                      const effectiveRemaining = item.card
                        ? item.card.remainingCount - cart.slice(0, index + 1).filter(c => c.useCard && c.card?.id === item.card?.id).length
                        : 0;
                      return (
                        <div key={index} className="flex items-center justify-between rounded-md px-2.5 py-2 transition-colors hover:bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.service.name}</p>
                            {item.card && item.useCard ? (
                              <p className="text-xs text-muted-foreground">次卡抵扣 · 剩{effectiveRemaining}次</p>
                            ) : (
                              <p className="text-xs text-muted-foreground tabular-nums">¥{item.service.price}</p>
                            )}
                            {item.card && !isWalkIn && (
                              <button className="text-xs text-primary hover:underline" onClick={() => toggleCardUse(index)}>
                                {item.useCard ? "改为现金" : "使用次卡"}
                              </button>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFromCart(index)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-1.5 text-sm">
                    {cardDeductTotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">次卡抵扣</span>
                        <span className="tabular-nums">-¥{cardDeductTotal}</span>
                      </div>
                    )}
                    {balanceDeduct > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">余额支付</span>
                        <span className="tabular-nums">¥{balanceDeduct}</span>
                      </div>
                    )}
                    {cashNeed > 0 && (
                      <div className="rounded-md bg-muted/50 p-2.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-muted-foreground">需付</span>
                          <span className="text-lg font-semibold tabular-nums">¥{cashNeed}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {cashNeed > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">支付方式</Label>
                      <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "wechat" | "alipay" | "cash")} className="flex gap-4">
                        <div className="flex items-center space-x-1.5"><RadioGroupItem value="wechat" id="c-wechat" /><Label htmlFor="c-wechat" className="cursor-pointer text-sm">微信</Label></div>
                        <div className="flex items-center space-x-1.5"><RadioGroupItem value="alipay" id="c-alipay" /><Label htmlFor="c-alipay" className="cursor-pointer text-sm">支付宝</Label></div>
                        <div className="flex items-center space-x-1.5"><RadioGroupItem value="cash" id="c-cash" /><Label htmlFor="c-cash" className="cursor-pointer text-sm">现金</Label></div>
                      </RadioGroup>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium">合计</span>
                      <span className="text-xl font-bold tabular-nums">¥{total}</span>
                    </div>
                    <LoadingButton className="w-full" onClick={handleCheckoutClick} loading={isCheckingOut}>
                      确认结账
                    </LoadingButton>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CheckoutConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleConfirmCheckout}
        isWalkIn={isWalkIn}
        memberName={selectedMember?.name}
        memberBalance={selectedMember?.balance}
        balanceAfter={selectedMember ? selectedMember.balance - balanceDeduct : 0}
        services={cart.map((item) => ({
          name: item.service.name,
          price: item.service.price,
          useCard: item.useCard,
          cardName: item.card?.templateName,
        }))}
        cardDeductTotal={cardDeductTotal}
        balanceDeduct={balanceDeduct}
        cashNeed={cashNeed}
        total={total}
        paymentMethod={paymentMethod}
        cardUsageInfo={cardUsageInfo}
      />
    </div>
  );
}
