import { CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <section className={cn("transition-opacity duration-500", hidden && "opacity-15")}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-tight">最近交易</h2>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground text-xs h-7 px-2.5"
          onClick={onViewAll}
        >
          全部 <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
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
        <div className="space-y-1">
          {recent.map((tx) => {
            const isIncome = tx.type === "recharge" || tx.type === "refund";
            const isExpense = tx.type === "consume" || tx.type === "card_deduct";

            return (
              <div
                key={tx.id}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-3",
                  tx.voided && "opacity-25"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    tx.voided && "line-through"
                  )}>
                    {hidden ? "****" : tx.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hidden ? "***" : tx.memberName} · {format(new Date(tx.createdAt), "HH:mm")}
                  </p>
                </div>
                <span className={cn(
                  "text-sm font-semibold tabular-nums shrink-0 ml-3",
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
