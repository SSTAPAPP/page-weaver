import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Service, Member, MemberCard } from "@/types";

interface ServiceListProps {
  servicesByCategory: { category: string; services: Service[] }[];
  isLoading: boolean;
  selectedMember: Member | null;
  cartCounts: Map<string, number>;
  getEffectiveRemainingCount: (card: MemberCard) => number;
  onAddToCart: (service: Service) => void;
}

export function ServiceList({
  servicesByCategory,
  isLoading,
  selectedMember,
  cartCounts,
  getEffectiveRemainingCount,
  onAddToCart,
}: ServiceListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

  if (servicesByCategory.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="暂无服务项目"
        description="请先在「服务管理」中添加服务"
      />
    );
  }

  return (
    <div className="space-y-4">
      {servicesByCategory.map(({ category, services }) => (
        <div key={category}>
          <p className="text-xs text-muted-foreground mb-1.5">{category}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {services.map((service) => {
              const hasCard = selectedMember?.cards.some(
                (card) =>
                  card.services.includes(service.id) &&
                  getEffectiveRemainingCount(card) > 0
              );
              const countInCart = cartCounts.get(service.id) || 0;

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => onAddToCart(service)}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-3 text-left transition-colors hover:bg-muted/30 active:scale-[0.97] min-h-[48px]",
                    countInCart > 0 && "border-primary/20 bg-primary/5"
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{service.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground tabular-nums">
                        ¥{service.price}
                      </p>
                      {hasCard && (
                        <Badge
                          variant="secondary"
                          className="text-2xs font-normal px-1.5 py-0"
                        >
                          有次卡
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {countInCart > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground">
                        {countInCart}
                      </span>
                    )}
                    <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
