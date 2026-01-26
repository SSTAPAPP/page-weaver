import { useState, useMemo } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, Wallet, AlertCircle, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export default function Cashier() {
  const { toast } = useToast();
  const {
    members,
    services,
    deductBalance,
    deductCard,
    addTransaction,
    addOrder,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "cash">("wechat");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      toast({ title: "请添加服务项目", variant: "destructive" });
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirmCheckout = () => {
    // 处理次卡扣除（仅会员）
    if (selectedMember) {
      cart.forEach((item) => {
        if (item.useCard && item.card) {
          deductCard(selectedMember.id, item.card.id);
          addTransaction({
            memberId: selectedMember.id,
            memberName: selectedMember.name,
            type: "card_deduct",
            amount: item.service.price,
            description: `${item.service.name} (次卡扣除)`,
          });
        }
      });

      // 处理余额扣除
      if (balanceDeduct > 0) {
        deductBalance(selectedMember.id, balanceDeduct);
        addTransaction({
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          type: "consume",
          amount: balanceDeduct,
          paymentMethod: "balance",
          description: `余额支付 ¥${balanceDeduct}`,
        });
      }

      // 处理现金/在线支付
      if (cashNeed > 0) {
        addTransaction({
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          type: "consume",
          amount: cashNeed,
          paymentMethod,
          description: `${paymentMethod === "wechat" ? "微信" : paymentMethod === "alipay" ? "支付宝" : "现金"}支付 ¥${cashNeed}`,
        });
      }

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
      // 散客结账 - 只记录交易和订单
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">收银台</h1>
        <p className="text-muted-foreground">快速结账，支持多种支付方式</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：会员选择和服务列表 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 会员搜索 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">选择顾客</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMember ? (
                <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-4">
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
                      placeholder="输入姓名拼音首字母/手机号搜索会员"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="max-h-48 space-y-2 overflow-auto rounded-lg border border-border">
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

          {/* 服务列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">服务项目</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((service) => {
                  const hasCard = selectedMember?.cards.some(
                    (card) => card.services.includes(service.id) && card.remainingCount > 0
                  );
                  return (
                    <div
                      key={service.id}
                      onClick={() => addToCart(service)}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">¥{service.price}</p>
                          {hasCard && (
                            <Badge variant="secondary" className="text-xs">
                              <CreditCard className="mr-1 h-3 w-3" />
                              有次卡
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：购物车和结算 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" />
                结算清单
                {isWalkIn && (
                  <Badge variant="outline" className="ml-auto">
                    散客
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  请选择服务项目
                </p>
              ) : (
                <>
                  {/* 散客提示 */}
                  {isWalkIn && (
                    <Alert>
                      <UserX className="h-4 w-4" />
                      <AlertDescription>
                        当前为散客结账，无法使用会员余额和次卡抵扣
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.service.name}</p>
                          {item.card && item.useCard ? (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              <CreditCard className="mr-1 h-3 w-3" />
                              次卡抵扣 (剩{item.card.remainingCount}次)
                            </Badge>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              ¥{item.service.price}
                            </p>
                          )}
                          {item.card && !isWalkIn && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => toggleCardUse(index)}
                            >
                              {item.useCard ? "改为现金" : "使用次卡"}
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* 支付明细 */}
                  <div className="space-y-2 text-sm">
                    {cardDeductTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          次卡抵扣
                        </span>
                        <span className="text-chart-2">-¥{cardDeductTotal}</span>
                      </div>
                    )}
                    {balanceDeduct > 0 && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Wallet className="h-4 w-4" />
                          余额支付
                        </span>
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
                          <p className="mt-1 text-xs text-muted-foreground">
                            余额不足，需额外支付 ¥{cashNeed}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 支付方式 */}
                  {cashNeed > 0 && (
                    <div className="space-y-2">
                      <Label>支付方式</Label>
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(v) =>
                          setPaymentMethod(v as "wechat" | "alipay" | "cash")
                        }
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="wechat" id="c-wechat" />
                          <Label htmlFor="c-wechat">微信</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="alipay" id="c-alipay" />
                          <Label htmlFor="c-alipay">支付宝</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cash" id="c-cash" />
                          <Label htmlFor="c-cash">现金</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* 次卡预警 */}
                  {cart.some(
                    (item) => item.useCard && item.card && item.card.remainingCount <= 1
                  ) && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>次卡即将用完，建议推销续卡</span>
                    </div>
                  )}

                  <Button className="w-full" size="lg" onClick={handleCheckoutClick}>
                    确认结账 ¥{total}
                  </Button>
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
        balanceAfter={(selectedMember?.balance || 0) - balanceDeduct}
        services={cart.map((item) => ({
          name: item.service.name,
          price: item.service.price,
          useCard: item.useCard,
        }))}
        cardDeductTotal={cardDeductTotal}
        balanceDeduct={balanceDeduct}
        cashNeed={cashNeed}
        total={total}
        paymentMethod={paymentMethod}
      />
    </div>
  );
}
