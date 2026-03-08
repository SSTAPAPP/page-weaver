import { useState, useMemo, useCallback, useRef, Fragment } from "react";
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
import { MobileCheckoutBar } from "@/components/cashier/MobileCheckoutBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface CardUsageInfo {
  cardName: string;
  originalCount: number;
  consumedCount: number;
  remainingCount: number;
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { num: 1 as const, label: "选顾客" },
    { num: 2 as const, label: "选服务" },
    { num: 3 as const, label: "结算" },
  ];
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {steps.map((s, i) => (
        <Fragment key={s.num}>
          {i > 0 && <span className="text-muted-foreground/30 text-xs mx-0.5">→</span>}
          <span className={cn(
            "inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-xs transition-colors",
            step >= s.num
              ? step === s.num ? "bg-brand/10 text-brand font-medium" : "text-foreground"
              : "text-muted-foreground/50"
          )}>
            <span className={cn(
              "inline-flex items-center justify-center h-4 w-4 rounded-full text-2xs font-semibold",
              step >= s.num
                ? step === s.num ? "bg-brand text-brand-foreground" : "bg-muted-foreground/20 text-foreground"
                : "bg-muted text-muted-foreground/50"
            )}>{s.num}</span>
            {s.label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export default function Cashier() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
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

  // Current step for indicator
  const currentStep = useMemo((): 1 | 2 | 3 => {
    if (cart.length > 0) return 3;
    if (selectedMember) return 2;
    return 1;
  }, [selectedMember, cart.length]);

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

  const cartPanelProps = {
    cart,
    isWalkIn,
    memberBalance: selectedMember?.balance ?? 0,
    paymentMethod,
    isCheckingOut,
    lastRemoved,
    getEffectiveRemaining,
    onToggleCardUse: toggleCardUse,
    onRemoveItem: removeFromCart,
    onUndoRemove: undoRemove,
    onClearCart: clearCart,
    onPaymentMethodChange: setPaymentMethod,
    onCheckout: handleCheckoutClick,
    cardDeductTotal,
    balanceDeduct,
    cashNeed,
    total,
  };

  return (
    <div className={cn("space-y-4 sm:space-y-6", isMobile && cart.length > 0 && "pb-20")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="收银台" />
        <StepIndicator step={currentStep} />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left: Customer + Services */}
        <div className="space-y-4 sm:space-y-6 lg:col-span-2">
          <CustomerSelector
            selectedMember={selectedMember}
            searchQuery={searchQuery}
            searchResults={searchResults}
            onSearchChange={setSearchQuery}
            onSelectMember={selectMember}
            onClearMember={clearMember}
          />

          <ServiceList
            servicesByCategory={servicesByCategory}
            isLoading={isMembersLoading || isServicesLoading}
            selectedMember={selectedMember}
            cartCounts={cartCounts}
            getEffectiveRemainingCount={getEffectiveRemainingCount}
            onAddToCart={addToCart}
          />
        </div>

        {/* Right: Cart — desktop only */}
        {!isMobile && (
          <div>
            <CartPanel {...cartPanelProps} />
          </div>
        )}
      </div>

      {/* Mobile: fixed bottom bar + drawer */}
      {isMobile && (
        <MobileCheckoutBar
          cartCount={cart.length}
          total={total}
          cashNeed={cashNeed}
          isCheckingOut={isCheckingOut}
          onCheckout={handleCheckoutClick}
        >
          <CartPanel {...cartPanelProps} />
        </MobileCheckoutBar>
      )}

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
