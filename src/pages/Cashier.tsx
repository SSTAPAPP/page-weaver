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
import { MobileCheckoutBar } from "@/components/cashier/MobileCheckoutBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CardUsageInfo {
  cardName: string;
  originalCount: number;
  consumedCount: number;
  remainingCount: number;
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { num: 1 as const, label: "顾客" },
    { num: 2 as const, label: "服务" },
    { num: 3 as const, label: "结算" },
  ];

  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const isCompleted = step > s.num;
        const isCurrent = step === s.num;
        const isUpcoming = step < s.num;

        return (
          <div key={s.num} className="flex items-center">
            {i > 0 && (
              <div className={cn(
                "h-px w-6 sm:w-10 mx-1",
                isCompleted || isCurrent ? "bg-foreground" : "bg-border"
              )} />
            )}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium transition-all",
                isCompleted && "bg-foreground text-background",
                isCurrent && "bg-foreground text-background ring-2 ring-foreground/20 ring-offset-2 ring-offset-background",
                isUpcoming && "border border-border text-muted-foreground"
              )}>
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span className={cn(
                "text-xs hidden sm:inline",
                isCurrent && "font-medium text-foreground",
                isCompleted && "text-foreground",
                isUpcoming && "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
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

  const cartCounts = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach(item => map.set(item.service.id, (map.get(item.service.id) || 0) + 1));
    return map;
  }, [cart]);

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
    <div className={cn("space-y-5 sm:space-y-6", isMobile && cart.length > 0 && "pb-24")}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <PageHeader title="收银台" description="选择顾客、添加服务、完成结算" />
        <StepIndicator step={currentStep} />
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: Customer + Services */}
        <div className="space-y-5">
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
          <div className="relative">
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
