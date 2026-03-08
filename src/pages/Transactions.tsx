import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Search, ArrowUpCircle, CreditCard, ChevronLeft, ChevronRight, Filter, X, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTransactions } from "@/hooks/useCloudData";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionRefundDialog } from "@/components/dialogs/TransactionRefundDialog";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

const typeMap: Record<string, { label: string; prefix: string }> = {
  recharge: { label: "充值", prefix: "+" },
  consume: { label: "消费", prefix: "-" },
  card_deduct: { label: "次卡", prefix: "-" },
  refund: { label: "退款", prefix: "+" },
  price_diff: { label: "补差价", prefix: "-" },
};

const paymentMethodMap: Record<string, string> = {
  balance: "余额", wechat: "微信", alipay: "支付宝", cash: "现金",
};

const PAGE_SIZE = 12;

interface GroupedTransaction {
  mainTransaction: Transaction;
  refundTransaction?: Transaction;
}

export default function Transactions() {
  const { data: transactions = [] } = useTransactions();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

  const groupedTransactions = useMemo(() => {
    const groups: GroupedTransaction[] = [];
    const processedIds = new Set<string>();
    const refundMap = new Map<string, Transaction>();
    transactions.forEach((tx) => {
      if (tx.type === 'refund' && tx.relatedTransactionId) refundMap.set(tx.relatedTransactionId, tx);
    });
    transactions.forEach((tx) => {
      if (processedIds.has(tx.id)) return;
      if (tx.type === 'refund') {
        if (!tx.relatedTransactionId) groups.push({ mainTransaction: tx });
        processedIds.add(tx.id);
        return;
      }
      groups.push({ mainTransaction: tx, refundTransaction: refundMap.get(tx.id) });
      processedIds.add(tx.id);
      const r = refundMap.get(tx.id);
      if (r) processedIds.add(r.id);
    });
    return groups;
  }, [transactions]);

  const filteredGroups = useMemo(() => {
    return groupedTransactions.filter((group) => {
      const tx = group.mainTransaction;
      const matchesSearch = searchQuery === "" ||
        tx.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || tx.type === typeFilter ||
        (typeFilter === "refund" && group.refundTransaction);
      return matchesSearch && matchesType;
    });
  }, [groupedTransactions, searchQuery, typeFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, typeFilter]);

  const totalPages = Math.ceil(filteredGroups.length / PAGE_SIZE);
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const clearFilters = () => { setSearchQuery(""); setTypeFilter("all"); };
  const hasFilters = searchQuery !== "" || typeFilter !== "all";

  const handleTransactionClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setRefundDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="交易流水"
        description={`${filteredGroups.length} 条记录`}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索会员或描述" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-28 h-9 text-xs">
              <Filter className="mr-1 h-3 w-3" />
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="recharge">充值</SelectItem>
              <SelectItem value="consume">消费</SelectItem>
              <SelectItem value="card_deduct">次卡</SelectItem>
              <SelectItem value="refund">退款</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {paginatedGroups.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={hasFilters ? "未找到匹配记录" : "暂无交易记录"}
          description={hasFilters ? "尝试其他筛选条件" : "交易流水将在这里显示"}
          action={hasFilters ? <Button variant="outline" size="sm" className="h-8 text-xs" onClick={clearFilters}>清除筛选</Button> : undefined}
        />
      ) : (
        <>
          <div className="divide-y divide-border rounded-lg border">
            {paginatedGroups.map((group) => {
              const tx = group.mainTransaction;
              const refundTx = group.refundTransaction;
              const info = typeMap[tx.type] || typeMap.consume;
              const isVoided = tx.voided;

              return (
                <div key={tx.id}>
                  <div
                    className={cn(
                      "flex items-center justify-between px-3 py-3 cursor-pointer transition-colors hover:bg-muted/20 min-h-[48px]",
                      isVoided && "opacity-30"
                    )}
                    onClick={() => handleTransactionClick(tx)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={cn("text-sm font-medium truncate", isVoided && "line-through")}>
                          {tx.description}
                        </p>
                        <Badge variant="secondary" className="text-2xs font-normal shrink-0 px-1.5 py-0">{info.label}</Badge>
                        {isVoided && <Badge variant="destructive" className="text-2xs shrink-0 px-1.5 py-0">已作废</Badge>}
                        {refundTx && (
                          <Badge variant="outline" className="text-2xs shrink-0 px-1.5 py-0">
                            <Link2 className="h-2.5 w-2.5 mr-0.5" />已退款
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span>{tx.memberName}</span>
                        <span className="text-border">·</span>
                        <span>{format(new Date(tx.createdAt), "MM-dd HH:mm")}</span>
                        {tx.paymentMethod && (
                          <><span className="text-border">·</span><span>{paymentMethodMap[tx.paymentMethod]}</span></>
                        )}
                      </div>
                    </div>
                    <span className={cn("text-sm font-medium tabular-nums shrink-0 ml-3", isVoided && "line-through text-muted-foreground")}>
                      {info.prefix}¥{tx.amount.toFixed(2)}
                    </span>
                  </div>

                  {refundTx && (
                    <div
                      className="flex items-center justify-between px-3 py-2 ml-5 mr-3 mb-2 rounded-md bg-muted/30 border-l-2 border-foreground/10 cursor-pointer hover:bg-muted/50 transition-colors min-h-[40px]"
                      onClick={() => handleTransactionClick(refundTx)}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">退款 · {format(new Date(refundTx.createdAt), "MM-dd HH:mm")}</span>
                      </div>
                      <span className="text-xs font-medium tabular-nums">+¥{refundTx.amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />上一页
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {currentPage}/{totalPages}
              </span>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                下一页<ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      <TransactionRefundDialog
        transaction={selectedTransaction}
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
      />
    </div>
  );
}
