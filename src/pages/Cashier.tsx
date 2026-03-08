import { useState, useMemo } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, Wallet, UserX, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

    setCart([
      ...cart,
      {
        service,
        useCard: !!availableCard,
        card: availableCard,
      },
    ]);

    toast.success("已添加", { description: service.name });
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const toggleCardUse = (index: number) => {
    setCart(
      cart.map((item, i) =>
        i === index ? { ...item, useCard: !item.useCard } : item
      )
    );
  };

  const calculatePayment = () => {
    let cardDeductTotal = 0;
    let needPayTotal = 0;

    cart.forEach((item) => {
      if (item.useCard && item.card) {
        cardDeductTotal += item.service.price;
      } else {
        needPayTotal += item.service.price;
      }
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
        if (existing) {
          existing.count += 1;
        } else {
          cardUsageMap.set(item.card.id, { card: item.card, count: 1 });
        }
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
    if (cart.length === 0) {
      toast.error("请添加服务项目");
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirmCheckout = async () => {
    setIsCheckingOut(true);
    try {
      // Server handles all amount calculation and validation
      const memberId = selectedMember?.id || generateWalkInId();
      const memberName = selectedMember?.name || "散客";

      const result = await processCheckout({
        memberId,
        memberName,
        cart: cart.map((item) => ({
          serviceId: item.service.id,
          serviceName: item.service.name,
          price: item.service.price,
          useCard: item.useCard,
          cardId: item.card?.id,
        })),
        paymentMethod,
        isWalkIn,
      });

      if (!result.success) {
        toast.error("结账失败", { description: result.error || "请检查网络连接后重试" });
        return;
      }

      // Invalidate cloud queries
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.todayStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.cloudCounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardTemplates });

      toast.success("结账成功", {
        description: `${isWalkIn ? "散客" : selectedMember?.name}消费 ¥${total}`,
      });

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
      <PageHeader title="收银台" description="快速结账，支持多种支付方式" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 会员搜索 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">选择顾客</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMember ? (
                <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-4 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                      {selectedMember.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{selectedMember.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedMember.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">余额: ¥{selectedMember.balance.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{selectedMember.cards.length}张次卡</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>更换</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">当前为散客模式，可搜索选择会员</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="输入姓名或手机号搜索" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="max-h-[200px] space-y-1 overflow-auto rounded-lg border border-border">
                      {searchResults.map((member) => (
                        <div key={member.id} onClick={() => selectMember(member)} className="cursor-pointer p-3 transition-colors hover:bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.phone}</p>
                            </div>
                            <p className="font-medium">¥{member.balance.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 服务列表 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">服务项目</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="暂无服务项目" description="请先在服务管理中添加服务" />
              ) : (
                <div className="space-y-4">
                  {servicesByCategory.map(({ category, services: categoryServices }) => (
                    <div key={category}>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">{category}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {categoryServices.map((service) => {
                          const hasCard = selectedMember?.cards.some(
                            (card) => card.services.includes(service.id) && getEffectiveRemainingCount(card) > 0
                          );
                          return (
                            <div key={service.id} onClick={() => addToCart(service)} className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-muted/30">
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-muted-foreground">¥{service.price}</p>
                                  {hasCard && (
                                    <Badge variant="secondary" className="text-xs">
                                      <CreditCard className="mr-1 h-3 w-3" />有次卡
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="shrink-0">
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：购物车和结算 */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" />
                结算清单
                {isWalkIn && <Badge variant="outline" className="ml-auto">散客</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShoppingCart className="mb-2 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">请选择服务项目</p>
                </div>
              ) : (
                <>
                  {isWalkIn && (
                    <Alert>
                      <UserX className="h-4 w-4" />
                      <AlertDescription>当前为散客结账，无法使用会员余额和次卡抵扣</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {cart.map((item, index) => {
                      const effectiveRemaining = item.card
                        ? item.card.remainingCount - cart.slice(0, index + 1).filter(c => c.useCard && c.card?.id === item.card?.id).length
                        : 0;
                      return (
                        <div key={index} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.service.name}</p>
                            {item.card && item.useCard ? (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                <CreditCard className="mr-1 h-3 w-3" />次卡抵扣 (剩{effectiveRemaining}次)
                              </Badge>
                            ) : (
                              <p className="text-sm text-muted-foreground">¥{item.service.price}</p>
                            )}
                            {item.card && !isWalkIn && (
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => toggleCardUse(index)}>
                                {item.useCard ? "改为现金" : "使用次卡"}
                              </Button>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    {cardDeductTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-muted-foreground"><CreditCard className="h-4 w-4" />次卡抵扣</span>
                        <span className="text-chart-2">-¥{cardDeductTotal}</span>
                      </div>
                    )}
                    {balanceDeduct > 0 && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-muted-foreground"><Wallet className="h-4 w-4" />余额支付</span>
                        <span>¥{balanceDeduct}</span>
                      </div>
                    )}
                    {cashNeed > 0 && (
                      <div className="rounded-lg bg-primary/10 p-3">
                        <div className="flex justify-between font-medium">
                          <span>需补差价</span>
                          <span className="text-lg text-primary">¥{cashNeed}</span>
                        </div>
                        {!isWalkIn && balanceDeduct > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">余额不足，需额外支付 ¥{cashNeed}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {cashNeed > 0 && (
                    <div className="space-y-2">
                      <Label>支付方式</Label>
                      <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "wechat" | "alipay" | "cash")} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="wechat" id="c-wechat" /><Label htmlFor="c-wechat" className="cursor-pointer">微信</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="alipay" id="c-alipay" /><Label htmlFor="c-alipay" className="cursor-pointer">支付宝</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="c-cash" /><Label htmlFor="c-cash" className="cursor-pointer">现金</Label></div>
                      </RadioGroup>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span>合计</span>
                      <span className="text-primary">¥{total}</span>
                    </div>
                    <LoadingButton className="w-full" size="lg" onClick={handleCheckoutClick} loading={isCheckingOut}>
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
