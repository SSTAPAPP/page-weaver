import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Search, ArrowUpCircle, ArrowDownCircle, CreditCard, ChevronLeft, ChevronRight, Filter, X, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { useStore } from "@/stores/useStore";
import { useTransactions } from "@/hooks/useCloudData";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionRefundDialog } from "@/components/dialogs/TransactionRefundDialog";
import type { Transaction } from "@/types";

const typeMap = {
  recharge: { label: "充值", icon: ArrowUpCircle, color: "text-chart-2", bgColor: "bg-chart-2/10" },
  consume: { label: "消费", icon: ArrowDownCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
  card_deduct: { label: "次卡扣除", icon: CreditCard, color: "text-chart-3", bgColor: "bg-chart-3/10" },
  refund: { label: "退款", icon: ArrowUpCircle, color: "text-chart-4", bgColor: "bg-chart-4/10" },
  price_diff: { label: "补差价", icon: ArrowDownCircle, color: "text-chart-1", bgColor: "bg-chart-1/10" },
};

const paymentMethodMap: Record<string, string> = {
  balance: "余额",
  wechat: "微信",
  alipay: "支付宝",
  cash: "现金",
};

const PAGE_SIZE = 8;
// Removed MAX_PAGES limit to show all transactions

// 将交易进行分组：消费和对应退款合并显示
interface GroupedTransaction {
  mainTransaction: Transaction;
  refundTransaction?: Transaction;
}

export default function Transactions() {
  const { data: cloudTransactions = [] } = useTransactions();
  const { transactions: localTransactions } = useStore();
  const transactions = cloudTransactions.length > 0 ? cloudTransactions : localTransactions;
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [jumpToPage, setJumpToPage] = useState("");

  // 对交易进行分组处理
  const groupedTransactions = useMemo(() => {
    const groups: GroupedTransaction[] = [];
    const processedIds = new Set<string>();
    
    // 先找出所有退款交易的关联ID
    const refundMap = new Map<string, Transaction>();
    transactions.forEach((tx) => {
      if (tx.type === 'refund' && tx.relatedTransactionId) {
        refundMap.set(tx.relatedTransactionId, tx);
      }
    });
    
    transactions.forEach((tx) => {
      // 跳过已处理的交易和独立的旧price_diff交易
      if (processedIds.has(tx.id)) return;
      
      // 跳过退款交易（会作为关联显示）
      if (tx.type === 'refund') {
        // 如果这个退款没有关联到任何交易，单独显示
        if (!tx.relatedTransactionId) {
          groups.push({ mainTransaction: tx });
        }
        processedIds.add(tx.id);
        return;
      }
      
      // 处理主交易
      const refundTx = refundMap.get(tx.id);
      groups.push({
        mainTransaction: tx,
        refundTransaction: refundTx,
      });
      processedIds.add(tx.id);
      if (refundTx) {
        processedIds.add(refundTx.id);
      }
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

  // 当筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  // 分页逻辑 - 无最大页数限制
  const totalPages = Math.ceil(filteredGroups.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setJumpToPage("");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
  };

  const hasFilters = searchQuery !== "" || typeFilter !== "all";

  const handleTransactionClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setRefundDialogOpen(true);
  };

  // 生成页码显示（最多显示5个页码）
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxVisible / 2);
      let start = currentPage - half;
      let end = currentPage + half;
      
      if (start < 1) {
        start = 1;
        end = maxVisible;
      }
      
      if (end > totalPages) {
        end = totalPages;
        start = totalPages - maxVisible + 1;
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="交易流水"
        description={`共 ${filteredGroups.length} 条记录，显示 ${startIndex + 1}-${Math.min(endIndex, filteredGroups.length)} 条`}
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="输入姓名或手机号搜索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <Filter className="mr-2 h-4 w-4" />
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
              <Button variant="ghost" size="icon" onClick={clearFilters}>
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
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                清除筛选
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginatedGroups.map((group) => {
              const tx = group.mainTransaction;
              const refundTx = group.refundTransaction;
              const typeInfo = typeMap[tx.type] || typeMap.consume;
              const TypeIcon = typeInfo.icon;
              const isVoided = tx.voided;
              const hasRefund = !!refundTx;

              return (
                <Card
                  key={tx.id}
                  className={`transition-colors hover:bg-muted/30 ${isVoided ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-0">
                    {/* 主交易 */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => handleTransactionClick(tx)}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${typeInfo.bgColor}`}
                        >
                          <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium truncate ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                              {tx.description}
                            </p>
                            <Badge variant={isVoided ? "outline" : "secondary"} className="text-xs shrink-0">
                              {typeInfo.label}
                            </Badge>
                            {isVoided && (
                              <Badge variant="destructive" className="text-xs shrink-0">
                                已作废
                              </Badge>
                            )}
                            {hasRefund && (
                              <Badge variant="outline" className="text-xs text-chart-4 border-chart-4/30 shrink-0">
                                <Link2 className="h-3 w-3 mr-1" />
                                已退款
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <span className="truncate">{tx.memberName}</span>
                            <span>•</span>
                            <span className="shrink-0">
                              {format(new Date(tx.createdAt), "MM-dd HH:mm", { locale: zhCN })}
                            </span>
                            {tx.paymentMethod && (
                              <>
                                <span>•</span>
                                <span className="shrink-0">{paymentMethodMap[tx.paymentMethod]}</span>
                              </>
                            )}
                          </div>
                          {/* 显示合并的子交易 */}
                          {tx.subTransactions && tx.subTransactions.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {tx.subTransactions.map((sub, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {sub.type === 'balance' ? '余额' : sub.type === 'card' ? '次卡' : '补差价'}
                                  ¥{sub.amount}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-lg font-semibold shrink-0 ml-4 ${
                          isVoided 
                            ? "line-through text-muted-foreground" 
                            : tx.type === "recharge" || tx.type === "refund"
                              ? "text-chart-2"
                              : "text-destructive"
                        }`}
                      >
                        {tx.type === "recharge" || tx.type === "refund" ? "+" : "-"}¥
                        {tx.amount.toFixed(2)}
                      </div>
                    </div>
                    
                    {/* 关联退款记录（合并显示） */}
                    {refundTx && (
                      <div 
                        className="flex items-center justify-between px-4 py-3 border-t border-dashed border-border bg-chart-4/5 cursor-pointer hover:bg-chart-4/10"
                        onClick={() => handleTransactionClick(refundTx)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-4/10 ml-1">
                            <ArrowUpCircle className="h-4 w-4 text-chart-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">退款记录</p>
                              <Badge variant="outline" className="text-xs text-chart-4 border-chart-4/30">
                                退款
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(refundTx.createdAt), "MM-dd HH:mm", { locale: zhCN })}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-chart-4">
                          +¥{refundTx.amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination - Enhanced with jump to page */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="w-10"
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
                  className="gap-1"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Jump to page */}
              {totalPages > 5 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">跳转至</span>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJumpToPage()}
                    className="w-16 h-8"
                    placeholder={currentPage.toString()}
                  />
                  <span className="text-muted-foreground">/ {totalPages} 页</span>
                  <Button variant="outline" size="sm" onClick={handleJumpToPage}>
                    确定
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Refund Dialog */}
      <TransactionRefundDialog
        transaction={selectedTransaction}
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
      />
    </div>
  );
}
