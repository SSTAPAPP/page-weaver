import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Service, Member, MemberCard } from "@/types";
import { ShoppingCart } from "lucide-react";

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
          <Skeleton key={i} className="h-16 rounded-lg" />
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
        <Card key={category}>
          <CardHeader className="pb-2 pt-3 px-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</p>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="grid gap-2 sm:grid-cols-2">
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
                      "group relative flex items-center justify-between rounded-lg border px-3 py-3 text-left transition-all hover:bg-accent/50 active:scale-[0.98] min-h-[52px]",
                      countInCart > 0
                        ? "border-foreground/15 bg-foreground/[0.03]"
                        : "border-border"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{service.name}</p>
                        {hasCard && (
                          <Badge
                            variant="outline"
                            className="text-2xs font-normal px-1.5 py-0 border-foreground/20 text-foreground/60"
                          >
                            次卡可抵
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                        ¥{service.price}
                        {service.duration && (
                          <span className="ml-1.5 text-muted-foreground/50">{service.duration}分钟</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {countInCart > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md bg-foreground text-2xs font-semibold text-background px-1 tabular-nums">
                          {countInCart}
                        </span>
                      )}
                      <Plus className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground/50 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
