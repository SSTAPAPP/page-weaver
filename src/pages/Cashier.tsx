import { useState, useMemo } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, Wallet, UserX, AlertCircle, Clock, DollarSign, Plus } from "lucide-react";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { Member, Service, MemberCard } from "@/types";
import { matchMemberSearch } from "@/lib/pinyin";
import { CheckoutConfirmDialog } from "@/components/dialogs/CheckoutConfirmDialog";

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
  const { toast } = useToast();
  const {
    members,
    services,
    deductBalance,
    deductCard,
    addTransaction,
    addOrder,
    getMember,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "cash">("wechat");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const isWalkIn = !selectedMember;

  // 实时搜索会员
  const searchResults = useMemo(() => {
    if (searchQuery.length < 1) return [];
    return members.filter((m) => matchMemberSearch(m.name, m.phone, searchQuery)).slice(0, 5);
  }, [members, searchQuery]);

  const selectMember = (member: Member) => {
    setSelectedMember(member);
    setSearchQuery("");
    setCart([]);
  };

  const addToCart = (service: Service) => {
    // 检查是否有对应服务的次卡（仅会员）
    const availableCard = selectedMember?.cards.find(
      (card) => card.services.includes(service.id) && card.remainingCount > 0
    );

    setCart([
      ...cart,
      {
        service,
        useCard: !!availableCard,
        card: availableCard,
      },
    ]);

    toast({
      title: "已添加",
      description: service.name,
    });
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

  // 计算金额
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

  // 计算次卡使用明细
  const cardUsageInfo = useMemo((): CardUsageInfo[] => {
    if (!selectedMember) return [];
    
    // 按卡ID分组统计使用次数
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
      toast({ title: "请添加服务项目", variant: "destructive" });
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirmCheckout = async () => {
    setIsCheckingOut(true);
    try {
      await new Promise((r) => setTimeout(r, 500));

      // 处理会员结账
      if (selectedMember) {
        const serviceNames = cart.map(c => c.service.name).join(", ");
        const subTransactions: { type: 'balance' | 'card' | 'price_diff'; amount: number; paymentMethod?: string; cardId?: string }[] = [];
        
        // 处理次卡扣除
        cart.forEach((item) => {
          if (item.useCard && item.card) {
            deductCard(selectedMember.id, item.card.id);
            subTransactions.push({
              type: 'card',
              amount: item.service.price,
              cardId: item.card.id,
            });
          }
        });

        // 处理余额扣除
        if (balanceDeduct > 0) {
          deductBalance(selectedMember.id, balanceDeduct);
          subTransactions.push({
            type: 'balance',
            amount: balanceDeduct,
          });
        }

        // 处理补差价
        if (cashNeed > 0) {
          subTransactions.push({
            type: 'price_diff',
            amount: cashNeed,
            paymentMethod,
          });
        }

        // 判断交易类型和支付方式
        const hasCardDeduct = cardDeductTotal > 0;
        const hasBalanceDeduct = balanceDeduct > 0;
        const hasCashNeed = cashNeed > 0;

        // 确定交易类型
        let mainTransactionType: 'card_deduct' | 'consume';
        let mainPaymentMethod: 'balance' | 'wechat' | 'alipay' | 'cash' | undefined;
        let mainAmount: number;

        if (hasCardDeduct) {
          // 有次卡消费
          mainTransactionType = "card_deduct";
          mainPaymentMethod = hasBalanceDeduct ? "balance" : undefined;
          mainAmount = total; // 使用总金额
        } else if (hasBalanceDeduct && !hasCashNeed) {
          // 纯余额支付
          mainTransactionType = "consume";
          mainPaymentMethod = "balance";
          mainAmount = balanceDeduct;
        } else if (!hasBalanceDeduct && hasCashNeed) {
          // 会员纯现金/微信/支付宝支付（无余额无次卡）
          mainTransactionType = "consume";
          mainPaymentMethod = paymentMethod;
          mainAmount = cashNeed;
        } else {
          // 余额 + 补差价混合
          mainTransactionType = "consume";
          mainPaymentMethod = "balance";
          mainAmount = total;
        }

        const mainDescription = hasCashNeed && (hasCardDeduct || hasBalanceDeduct)
          ? `${serviceNames} (含补差价¥${cashNeed})`
          : serviceNames;
        
        addTransaction({
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          type: mainTransactionType,
          amount: mainAmount,
          paymentMethod: mainPaymentMethod,
          description: mainDescription,
          subTransactions: subTransactions.length > 0 ? subTransactions : undefined,
        });

        // 添加订单
        addOrder({
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          services: cart.map((item) => ({
            serviceId: item.service.id,
            serviceName: item.service.name,
            price: item.service.price,
            useCard: item.useCard,
            cardId: item.card?.id,
          })),
          totalAmount: total,
          payments: [
            ...(cardDeductTotal > 0 ? [{ method: "card" as const, amount: cardDeductTotal }] : []),
            ...(balanceDeduct > 0 ? [{ method: "balance" as const, amount: balanceDeduct }] : []),
            ...(cashNeed > 0 ? [{ method: paymentMethod, amount: cashNeed }] : []),
          ],
        });
      } else {
        // 散客结账
        addTransaction({
          memberId: "walk-in",
          memberName: "散客",
          type: "consume",
          amount: total,
          paymentMethod,
          description: `散客消费 - ${cart.map(c => c.service.name).join(", ")}`,
        });

        addOrder({
          memberId: "walk-in",
          memberName: "散客",
          services: cart.map((item) => ({
            serviceId: item.service.id,
            serviceName: item.service.name,
            price: item.service.price,
            useCard: false,
          })),
          totalAmount: total,
          payments: [{ method: paymentMethod, amount: total }],
        });
      }

      toast({
        title: "结账成功",
        description: `${isWalkIn ? "散客" : selectedMember?.name}消费 ¥${total}`,
      });

      // 重置
      setSelectedMember(null);
      setCart([]);
      setConfirmDialogOpen(false);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // 按分类分组服务
  const servicesByCategory = useMemo(() => {
    const categories = [...new Set(services.map((s) => s.category))];
    return categories.map((category) => ({
      category,
      services: services.filter((s) => s.category === category),
    }));
  }, [services]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="收银台"
        description="选择会员与服务项目，支持余额、次卡、现金等多种支付方式快速结账"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：会员选择和服务列表 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 会员搜索 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">选择顾客</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMember ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4 transition-all">
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
                    <p className="text-sm text-muted-foreground">
                      {selectedMember.cards.length}张次卡
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                    更换
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">当前为散客模式，可搜索选择会员</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索姓名、拼音首字母或手机号"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="max-h-48 space-y-1 overflow-auto rounded-lg border border-border">
                      {searchResults.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => selectMember(member)}
                          className="cursor-pointer p-3 transition-colors hover:bg-muted/50"
                        >
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

          {/* 服务列表 - 分类卡片风格 */}
          {services.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={ShoppingCart}
                  title="暂无服务项目"
                  description="请先在服务管理中添加服务"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {servicesByCategory.map(({ category, services: categoryServices }) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {category}
                      <Badge variant="secondary" className="font-normal text-xs">
                        {categoryServices.length}项
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {categoryServices.map((service) => {
                        const availableCard = selectedMember?.cards.find(
                          (card) => card.services.includes(service.id) && card.remainingCount > 0
                        );
                        const hasCard = !!availableCard;
                        const cartCount = cart.filter(item => item.service.id === service.id).length;
                        
                        return (
                          <div
                            key={service.id}
                            onClick={() => addToCart(service)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToCart(service); } }}
                            className="group relative flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer transition-all duration-150 hover:border-primary/50 hover:bg-muted/30 hover:shadow-sm active:scale-[0.99]"
                          >
                            {/* 已添加数量角标 */}
                            {cartCount > 0 && (
                              <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                                {cartCount}
                              </div>
                            )}
                            
                            {/* 左侧：服务信息 */}
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{service.name}</p>
                                {hasCard && (
                                  <Badge className="text-[10px] px-1.5 py-0 font-normal bg-chart-2/15 text-chart-2 border-0 shrink-0">
                                    <CreditCard className="h-2.5 w-2.5 mr-0.5" />
                                    {availableCard.remainingCount}次
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ¥{service.price}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {service.duration || 30}分钟
                                </span>
                              </div>
                            </div>
                            
                            {/* 右侧：添加按钮 */}
                            <div className="flex items-center shrink-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Plus className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：购物车和结算 */}
        <div className="space-y-4">
          <Card className="sticky top-6 overflow-hidden">
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" />
                结算清单
                {cart.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs font-normal">
                    {cart.length}
                  </Badge>
                )}
                {isWalkIn && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    散客
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
             <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <ShoppingCart className="mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">点击左侧服务项目添加</p>
                </div>
              ) : (
                <>
                  {/* 散客提示 */}
                  {isWalkIn && (
                    <div className="mx-4 mt-3">
                      <Alert>
                        <UserX className="h-4 w-4" />
                        <AlertDescription>
                          散客模式，不可用余额与次卡
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* 购物车项目列表 */}
                  <div className="px-4 pt-3 pb-2 space-y-1.5">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2.5 rounded-md p-2.5 -mx-1 transition-colors duration-150 hover:bg-muted/40 group/item"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium truncate">{item.service.name}</p>
                            <span className={`text-sm tabular-nums shrink-0 ${item.useCard && item.card ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              ¥{item.service.price}
                            </span>
                          </div>
                          {item.card && item.useCard ? (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-chart-2">{item.card.templateName}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                {item.card.remainingCount}次
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {[item.service.duration && `${item.service.duration}分钟`, item.service.category].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {item.card && !isWalkIn && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => toggleCardUse(index)}
                            >
                              {item.useCard ? "改为现金支付" : "使用次卡抵扣"}
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={() => removeFromCart(index)}
                          aria-label={`移除${item.service.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* 费用汇总区 */}
                  <div className="bg-muted/30 border-t border-border px-4 py-3 space-y-3">
                    {/* 次卡使用汇总 */}
                    {cardUsageInfo.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">次卡扣除</p>
                        {cardUsageInfo.map((card, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-md border border-border p-2 bg-card">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{card.cardName}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                                  {card.originalCount}次
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className="text-destructive tabular-nums">-{card.consumedCount}次</span>
                                <span>·</span>
                                <span className="tabular-nums">余{card.remainingCount}次</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 费用明细 */}
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>服务总价</span>
                        <span className="tabular-nums">¥{total}</span>
                      </div>
                      {cardDeductTotal > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>次卡抵扣</span>
                          <span className="text-chart-2 tabular-nums">-¥{cardDeductTotal}</span>
                        </div>
                      )}
                      {balanceDeduct > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>余额支付</span>
                          <span className="tabular-nums">-¥{balanceDeduct}</span>
                        </div>
                      )}
                    </div>

                    {/* 应付/无需支付 */}
                    {cashNeed > 0 ? (
                      <div className="rounded-md bg-primary/10 p-3">
                        <div className="flex justify-between items-baseline font-medium">
                          <span>{isWalkIn ? '应付金额' : '需补差价'}</span>
                          <span className="text-lg text-primary tabular-nums">¥{cashNeed}</span>
                        </div>
                        {!isWalkIn && balanceDeduct > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            余额不足，需额外支付
                          </p>
                        )}
                      </div>
                    ) : cart.length > 0 && !isWalkIn ? (
                      <div className="rounded-md bg-chart-2/10 p-3 text-center">
                        <p className="text-sm font-medium text-chart-2">✓ 无需额外支付</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cardDeductTotal > 0 && balanceDeduct > 0
                            ? '次卡 + 余额全额覆盖'
                            : cardDeductTotal > 0
                              ? '次卡全额抵扣'
                              : '余额全额支付'}
                        </p>
                      </div>
                    ) : null}

                    {/* 支付方式 */}
                    {cashNeed > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm">{isWalkIn ? '支付方式' : '补差价方式'}</Label>
                        <RadioGroup
                          value={paymentMethod}
                          onValueChange={(v) =>
                            setPaymentMethod(v as "wechat" | "alipay" | "cash")
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="wechat" id="c-wechat" />
                            <Label htmlFor="c-wechat" className="cursor-pointer">微信</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="alipay" id="c-alipay" />
                            <Label htmlFor="c-alipay" className="cursor-pointer">支付宝</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cash" id="c-cash" />
                            <Label htmlFor="c-cash" className="cursor-pointer">现金</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {/* 会员余额预览 */}
                    {!isWalkIn && selectedMember && balanceDeduct > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>余额变化</span>
                        <span className="tabular-nums">
                          ¥{selectedMember.balance.toFixed(2)}
                          <span className="mx-1">→</span>
                          <span className="text-primary font-medium">¥{(selectedMember.balance - balanceDeduct).toFixed(2)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 底部结账栏 */}
                  <div className="px-4 py-4 border-t border-border space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium">合计</span>
                      <span className="text-2xl font-bold text-primary tabular-nums">¥{total}</span>
                    </div>
                    {cashNeed > 0 && cashNeed !== total && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>实付</span>
                        <span className="font-medium text-foreground tabular-nums">¥{cashNeed}</span>
                      </div>
                    )}
                    <LoadingButton
                      className="w-full"
                      size="lg"
                      onClick={handleCheckoutClick}
                      loading={isCheckingOut}
                    >
                      确认结账
                    </LoadingButton>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 结账确认弹窗 */}
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
