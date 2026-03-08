import { useState } from "react";
import { ShoppingCart, ChevronUp } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { LoadingButton } from "@/components/ui/loading-button";

interface MobileCheckoutBarProps {
  cartCount: number;
  total: number;
  cashNeed: number;
  isCheckingOut: boolean;
  onCheckout: () => void;
  children: React.ReactNode;
}

export function MobileCheckoutBar({
  cartCount,
  total,
  cashNeed,
  isCheckingOut,
  onCheckout,
  children,
}: MobileCheckoutBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (cartCount === 0) return null;

  return (
    <>
      {/* Fixed bottom bar above mobile nav (52px) */}
      <div className="fixed bottom-[52px] left-0 right-0 z-40 border-t border-border bg-background px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-3 flex-1 min-w-0 min-h-[44px] active:opacity-70 transition-opacity"
            onClick={() => setDrawerOpen(true)}
          >
            <div className="relative shrink-0">
              <ShoppingCart className="h-5 w-5 text-foreground" />
              <span className="absolute -top-2 -right-2.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-foreground text-2xs font-bold text-background px-1">
                {cartCount}
              </span>
            </div>
            <div className="text-left min-w-0">
              <p className="text-base font-bold tabular-nums tracking-tight">¥{total.toFixed(2)}</p>
              {cashNeed > 0 && cashNeed !== total && (
                <p className="text-2xs text-muted-foreground">需付 ¥{cashNeed.toFixed(2)}</p>
              )}
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground/40 ml-auto" />
          </button>
          <LoadingButton
            className="shrink-0 px-6 h-11 text-sm font-semibold"
            onClick={onCheckout}
            loading={isCheckingOut}
          >
            结账
          </LoadingButton>
        </div>
      </div>

      {/* Drawer with full CartPanel */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerTitle className="sr-only">结算详情</DrawerTitle>
          <div className="overflow-auto pb-6">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
