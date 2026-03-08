import { CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Transaction } from "@/types";

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading: boolean;
  hidden: boolean;
  onViewAll: () => void;
}

export function RecentTransactions({
  transactions,
  isLoading,
  hidden,
  onViewAll,
}: RecentTransactionsProps) {
  const recent = transactions.slice(0, 6);

  return (
    <section className={cn("transition-opacity duration-300", hidden && "opacity-20")}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium">最近交易</h2>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground text-xs h-6 px-2"
          onClick={onViewAll}
        >
          全部 <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border rounded-lg border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5">
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3.5 w-14" />
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="暂无交易"
          description="完成第一笔收银后显示"
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border">
          {recent.map((tx) => {
            const isIncome = tx.type === "recharge" || tx.type === "refund";
            const isExpense = tx.type === "consume" || tx.type === "card_deduct";

            return (
              <div
                key={tx.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5",
                  tx.voided && "opacity-30"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    tx.voided && "line-through"
                  )}>
                    {hidden ? "****" : tx.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hidden ? "***" : tx.memberName} · {format(new Date(tx.createdAt), "HH:mm")}
                  </p>
                </div>
                <span className={cn(
                  "text-sm font-medium tabular-nums shrink-0 ml-3",
                  tx.voided && "line-through text-muted-foreground",
                  !tx.voided && isExpense && "text-destructive",
                  !tx.voided && isIncome && "text-foreground",
                )}>
                  {hidden ? "****" : `${isIncome ? "+" : "-"}¥${tx.amount.toFixed(2)}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
