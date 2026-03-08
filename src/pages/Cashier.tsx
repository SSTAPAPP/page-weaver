import { useState, useMemo, useCallback, useRef } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { generateWalkInId } from "@/stores/useStore";
import { useMembers, useServices } from "@/hooks/useCloudData";
import { toast } from "sonner";
import { Member, Service, MemberCard } from "@/types";
import { matchMemberSearch } from "@/lib/pinyin";
import { CheckoutConfirmDialog } from "@/components/dialogs/CheckoutConfirmDialog";
import { processCheckout } from "@/lib/adminApi";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useCloudData";
import { CustomerSelector } from "@/components/cashier/CustomerSelector";
import { ServiceList } from "@/components/cashier/ServiceList";
import { CartPanel, type CartItem } from "@/components/cashier/CartPanel";

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
  const [lastRemoved, setLastRemoved] = useState<{ item: CartItem; index: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const isWalkIn = !selectedMember;

  // --- Search ---
  const searchResults = useMemo(() => {
    if (searchQuery.length < 1) return [];
    return members.filter((m) => matchMemberSearch(m.name, m.phone, searchQuery)).slice(0, 10);
  }, [members, searchQuery]);

  const selectMember = useCallback((member: Member) => {
    setSelectedMember(member);
    setSearchQuery("");
    setCart([]);
    setLastRemoved(null);
  }, []);

  const clearMember = useCallback(() => {
    setSelectedMember(null);
    setCart([]);
    setLastRemoved(null);
  }, []);

  // --- Card helpers ---
  const getCardUsageInCart = useCallback((cardId: string, cartItems: CartItem[]) => {
    return cartItems.filter(item => item.useCard && item.card?.id === cardId).length;
  }, []);

  const getEffectiveRemainingCount = useCallback((card: MemberCard) => {
    const usedInCart = getCardUsageInCart(card.id, cart);
    return card.remainingCount - usedInCart;
  }, [cart, getCardUsageInCart]);

  // --- Cart actions ---
  const addToCart = useCallback((service: Service) => {
    const availableCard = selectedMember?.cards.find(
      (card) => card.services.includes(service.id) && getEffectiveRemainingCount(card) > 0
    );
    setCart(prev => [...prev, { service, useCard: !!availableCard, card: availableCard }]);
    setLastRemoved(null);
    toast.success("已添加", { description: service.name, duration: 1500 });
  }, [selectedMember, getEffectiveRemainingCount]);

  const removeFromCart = useCallback((index: number) => {
    setCart(prev => {
      const removed = prev[index];
      if (removed) {
        setLastRemoved({ item: removed, index });
        // Auto-clear undo after 5s
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setLastRemoved(null), 5000);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const undoRemove = useCallback(() => {
    if (!lastRemoved) return;
    setCart(prev => {
      const newCart = [...prev];
      newCart.splice(lastRemoved.index, 0, lastRemoved.item);
      return newCart;
    });
    setLastRemoved(null);
    clearTimeout(undoTimerRef.current);
  }, [lastRemoved]);

  const clearCart = useCallback(() => {
    if (cart.length <= 1) {
      setCart([]);
      return;
    }
    // For 2+ items, use toast confirmation
    toast("确认清空购物车？", {
      action: {
        label: "清空",
        onClick: () => {
          setCart([]);
          setLastRemoved(null);
        },
      },
      duration: 3000,
    });
  }, [cart.length]);

  const toggleCardUse = useCallback((index: number) => {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, useCard: !item.useCard } : item));
  }, []);

  // --- Payment calculation ---
  const { cardDeductTotal, balanceDeduct, cashNeed, total } = useMemo(() => {
    let cardDeductTotal = 0;
    let needPayTotal = 0;
    cart.forEach((item) => {
      if (item.useCard && item.card) { cardDeductTotal += item.service.price; }
      else { needPayTotal += item.service.price; }
    });
    const balanceDeduct = isWalkIn ? 0 : Math.min(selectedMember?.balance || 0, needPayTotal);
    const cashNeed = needPayTotal - balanceDeduct;
    return { cardDeductTotal, balanceDeduct, cashNeed, total: cardDeductTotal + needPayTotal };
  }, [cart, isWalkIn, selectedMember]);

  // --- Cart counts for service badges ---
  const cartCounts = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach(item => map.set(item.service.id, (map.get(item.service.id) || 0) + 1));
    return map;
  }, [cart]);

  // --- Card usage info ---
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

  // --- Services by category ---
  const servicesByCategory = useMemo(() => {
    const categories = [...new Set(services.map((s) => s.category))];
    return categories.map((category) => ({
      category,
      services: services.filter((s) => s.category === category),
    }));
  }, [services]);

  // --- Checkout ---
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

      toast.success("结账成功", {
        description: `${isWalkIn ? "散客" : selectedMember?.name}消费 ¥${total.toFixed(2)}`,
      });
      setSelectedMember(null);
      setCart([]);
      setLastRemoved(null);
      setConfirmDialogOpen(false);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("结账失败", { description: "请检查网络连接后重试" });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const getEffectiveRemaining = (item: CartItem, index: number) => {
    if (!item.card) return 0;
    return item.card.remainingCount - cart.slice(0, index + 1).filter(
      c => c.useCard && c.card?.id === item.card?.id
    ).length;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="收银台" description="选择顾客 → 添加服务 → 确认结账" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Customer + Services */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-2xs font-semibold mr-1.5">1</span>
              选择顾客
            </p>
            <CustomerSelector
              selectedMember={selectedMember}
              searchQuery={searchQuery}
              searchResults={searchResults}
              onSearchChange={setSearchQuery}
              onSelectMember={selectMember}
              onClearMember={clearMember}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-2xs font-semibold mr-1.5">2</span>
              选择服务
            </p>
            <ServiceList
              servicesByCategory={servicesByCategory}
              isLoading={isMembersLoading || isServicesLoading}
              selectedMember={selectedMember}
              cartCounts={cartCounts}
              getEffectiveRemainingCount={getEffectiveRemainingCount}
              onAddToCart={addToCart}
            />
          </div>
        </div>

        {/* Right: Cart */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 lg:hidden">
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-2xs font-semibold mr-1.5">3</span>
            结算
          </p>
          <CartPanel
            cart={cart}
            isWalkIn={isWalkIn}
            memberBalance={selectedMember?.balance ?? 0}
            paymentMethod={paymentMethod}
            isCheckingOut={isCheckingOut}
            lastRemoved={lastRemoved}
            getEffectiveRemaining={getEffectiveRemaining}
            onToggleCardUse={toggleCardUse}
            onRemoveItem={removeFromCart}
            onUndoRemove={undoRemove}
            onClearCart={clearCart}
            onPaymentMethodChange={setPaymentMethod}
            onCheckout={handleCheckoutClick}
            cardDeductTotal={cardDeductTotal}
            balanceDeduct={balanceDeduct}
            cashNeed={cashNeed}
            total={total}
          />
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
