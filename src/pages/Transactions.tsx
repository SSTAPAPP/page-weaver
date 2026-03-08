import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Search, CreditCard, ChevronLeft, ChevronRight, Filter, X, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/stores/useStore";
import { TransactionRefundDialog } from "@/components/dialogs/TransactionRefundDialog";
import type { Transaction } from "@/types";

const typeMap: Record<string, { label: string; sign: string; color: string }> = {
  recharge: { label: "充值", sign: "+", color: "text-chart-2" },
  consume: { label: "消费", sign: "-", color: "text-foreground" },
  card_deduct: { label: "次卡", sign: "-", color: "text-foreground" },
  refund: { label: "退款", sign: "+", color: "text-chart-4" },
  price_diff: { label: "补差价", sign: "-", color: "text-chart-1" },
};

const paymentMethodMap: Record<string, string> = {
  balance: "余额",
  wechat: "微信",
  alipay: "支付宝",
  cash: "现金",
};

const PAGE_SIZE = 8;
const MAX_PAGES = 5;

interface GroupedTransaction {
  mainTransaction: Transaction;
  refundTransaction?: Transaction;
}

export default function Transactions() {
  const { transactions } = useStore();
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
      const matchesSearch =
        searchQuery === "" ||
        tx.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || tx.type === typeFilter ||
        (typeFilter === "refund" && group.refundTransaction);
      return matchesSearch && matchesType;
    });
  }, [groupedTransactions, searchQuery, typeFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, typeFilter]);

  const totalPages = Math.min(Math.ceil(filteredGroups.length / PAGE_SIZE), MAX_PAGES);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + PAGE_SIZE);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const clearFilters = () => { setSearchQuery(""); setTypeFilter("all"); };
  const hasFilters = searchQuery !== "" || typeFilter !== "all";

  const handleTransactionClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setRefundDialogOpen(true);
  };

  const renderRow = (tx: Transaction, isRefundRow = false) => {
    const info = typeMap[tx.type] || typeMap.consume;
    const isVoided = tx.voided;
    const isIncome = tx.type === "recharge" || tx.type === "refund";
    const methodLabel = tx.paymentMethod ? paymentMethodMap[tx.paymentMethod] : null;

    // 构建副标题：会员 · 时间 · 支付方式
    const metaParts = [tx.memberName, format(new Date(tx.createdAt), "MM-dd HH:mm", { locale: zhCN })];
    if (methodLabel) metaParts.push(methodLabel);

    return (
      <div
        className={cn(
          "flex items-center gap-3 py-3 cursor-pointer transition-colors duration-150 hover:bg-muted/30 -mx-2 px-2 rounded-md",
          isVoided && "opacity-50",
          isRefundRow && "ml-8"
        )}
        onClick={() => handleTransactionClick(tx)}
      >
        {/* Left: description + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn(
              "text-sm font-medium truncate",
              isVoided && "line-through text-muted-foreground"
            )}>
              {tx.description}
            </p>
            {isVoided && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 font-normal shrink-0">
                已作废
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {metaParts.join(" · ")}
          </p>
        </div>

        {/* Right: amount + type */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "text-sm font-medium tabular-nums",
            isVoided ? "line-through text-muted-foreground" : info.color
          )}>
            {info.sign}¥{tx.amount.toFixed(2)}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal w-8 justify-center">
            {info.label}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="交易流水"
        description={`完整的充值、消费、退款记录，共 ${filteredGroups.length} 条${filteredGroups.length > PAGE_SIZE * MAX_PAGES ? `（显示前 ${PAGE_SIZE * MAX_PAGES} 条）` : ""}`}
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索会员姓名 / 交易描述"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <Filter className="mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="全部类型" />
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
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={clearFilters} aria-label="清除筛选">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      {paginatedGroups.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={hasFilters ? "未找到匹配的记录" : "暂无交易记录"}
          description={hasFilters ? "请尝试其他筛选条件" : "交易流水将在这里显示"}
          action={hasFilters ? <Button variant="outline" size="sm" onClick={clearFilters}>清除筛选</Button> : undefined}
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="divide-y divide-border">
                {paginatedGroups.map((group) => {
                  const tx = group.mainTransaction;
                  const refundTx = group.refundTransaction;
                  const hasRefund = !!refundTx;

                  return (
                    <div key={tx.id}>
                      <div className="relative">
                        {renderRow(tx)}
                        {hasRefund && !tx.voided && (
                          <div className="absolute right-2 top-3">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal text-chart-4 border-chart-4/30">
                              <Link2 className="h-2.5 w-2.5 mr-0.5" />
                              已退款
                            </Badge>
                          </div>
                        )}
                      </div>
                      {refundTx && renderRow(refundTx, true)}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="gap-1 h-8"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                上一页
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8"
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="gap-1 h-8"
              >
                下一页
                <ChevronRight className="h-3.5 w-3.5" />
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
