import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Search, ArrowUpCircle, ArrowDownCircle, CreditCard, ChevronLeft, ChevronRight, Filter, X, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransactions } from "@/hooks/useCloudData";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionRefundDialog } from "@/components/dialogs/TransactionRefundDialog";
import type { Transaction } from "@/types";

const typeMap: Record<string, { label: string; prefix: string }> = {
  recharge: { label: "充值", prefix: "+" },
  consume: { label: "消费", prefix: "-" },
  card_deduct: { label: "次卡扣除", prefix: "-" },
  refund: { label: "退款", prefix: "+" },
  price_diff: { label: "补差价", prefix: "-" },
};

const paymentMethodMap: Record<string, string> = {
  balance: "余额",
  wechat: "微信",
  alipay: "支付宝",
  cash: "现金",
};

const PAGE_SIZE = 10;

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
      if (tx.type === 'refund' && tx.relatedTransactionId) {
        refundMap.set(tx.relatedTransactionId, tx);
      }
    });
    transactions.forEach((tx) => {
      if (processedIds.has(tx.id)) return;
      if (tx.type === 'refund') {
        if (!tx.relatedTransactionId) groups.push({ mainTransaction: tx });
        processedIds.add(tx.id);
        return;
      }
      const refundTx = refundMap.get(tx.id);
      groups.push({ mainTransaction: tx, refundTransaction: refundTx });
      processedIds.add(tx.id);
      if (refundTx) processedIds.add(refundTx.id);
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
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + PAGE_SIZE);

  const clearFilters = () => { setSearchQuery(""); setTypeFilter("all"); };
  const hasFilters = searchQuery !== "" || typeFilter !== "all";

  const handleTransactionClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setRefundDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="交易流水"
        description={`共 ${filteredGroups.length} 条记录`}
      />

      {/* Filters — inline */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索会员或描述" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-32 h-9">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="recharge">充值</SelectItem>
              <SelectItem value="consume">消费</SelectItem>
              <SelectItem value="card_deduct">次卡扣除</SelectItem>
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

      {/* Transaction list */}
      {paginatedGroups.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={hasFilters ? "未找到匹配的记录" : "暂无交易记录"}
          description={hasFilters ? "请尝试其他筛选条件" : "交易流水将在这里显示"}
          action={hasFilters ? <Button variant="outline" size="sm" onClick={clearFilters}>清除筛选</Button> : undefined}
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
                  {/* Main transaction */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${isVoided ? "opacity-40" : ""}`}
                    onClick={() => handleTransactionClick(tx)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium truncate ${isVoided ? "line-through" : ""}`}>
                          {tx.description}
                        </p>
                        <Badge variant="secondary" className="text-2xs font-normal shrink-0">{info.label}</Badge>
                        {isVoided && <Badge variant="destructive" className="text-2xs shrink-0">已作废</Badge>}
                        {refundTx && (
                          <Badge variant="outline" className="text-2xs shrink-0">
                            <Link2 className="h-2.5 w-2.5 mr-0.5" />已退款
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span>{tx.memberName}</span>
                        <span>·</span>
                        <span>{format(new Date(tx.createdAt), "MM-dd HH:mm", { locale: zhCN })}</span>
                        {tx.paymentMethod && (
                          <><span>·</span><span>{paymentMethodMap[tx.paymentMethod]}</span></>
                        )}
                      </div>
                      {tx.subTransactions && tx.subTransactions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tx.subTransactions.map((sub, i) => (
                            <Badge key={i} variant="outline" className="text-2xs font-normal">
                              {sub.type === 'balance' ? '余额' : sub.type === 'card' ? '次卡' : '补差价'} ¥{sub.amount}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-medium tabular-nums shrink-0 ml-4 ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                      {info.prefix}¥{tx.amount.toFixed(2)}
                    </span>
                  </div>

                  {/* Linked refund */}
                  {refundTx && (
                    <div
                      className="flex items-center justify-between px-4 py-2.5 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors ml-6 mr-4 mb-2 rounded-md"
                      onClick={() => handleTransactionClick(refundTx)}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs">退款 · {format(new Date(refundTx.createdAt), "MM-dd HH:mm", { locale: zhCN })}</span>
                      </div>
                      <span className="text-xs font-medium tabular-nums">+¥{refundTx.amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />上一页
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums px-2">
                {currentPage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                下一页<ChevronRight className="h-4 w-4 ml-1" />
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
