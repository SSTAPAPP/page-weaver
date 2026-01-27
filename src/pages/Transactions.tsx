import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Search, ArrowUpCircle, ArrowDownCircle, CreditCard, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/stores/useStore";

const typeMap = {
  recharge: { label: "充值", icon: ArrowUpCircle, color: "text-chart-2", bgColor: "bg-chart-2/10" },
  consume: { label: "消费", icon: ArrowDownCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
  card_deduct: { label: "次卡扣除", icon: CreditCard, color: "text-chart-3", bgColor: "bg-chart-3/10" },
  refund: { label: "退款", icon: ArrowUpCircle, color: "text-chart-4", bgColor: "bg-chart-4/10" },
};

const paymentMethodMap = {
  balance: "余额",
  wechat: "微信",
  alipay: "支付宝",
  cash: "现金",
};

const PAGE_SIZE = 8;
const MAX_PAGES = 5;

export default function Transactions() {
  const { transactions } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        searchQuery === "" ||
        tx.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "all" || tx.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, typeFilter]);

  // 当筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  // 分页逻辑
  const totalPages = Math.min(Math.ceil(filteredTransactions.length / PAGE_SIZE), MAX_PAGES);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
  };

  const hasFilters = searchQuery !== "" || typeFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="交易流水"
        description={`共 ${filteredTransactions.length} 条记录${filteredTransactions.length > PAGE_SIZE * MAX_PAGES ? `（显示前 ${PAGE_SIZE * MAX_PAGES} 条）` : ""}`}
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索会员或描述..."
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
      {paginatedTransactions.length === 0 ? (
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
            {paginatedTransactions.map((tx) => {
              const typeInfo = typeMap[tx.type];
              const TypeIcon = typeInfo.icon;

              return (
                <Card
                  key={tx.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${typeInfo.bgColor}`}
                      >
                        <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tx.description}</p>
                          <Badge variant="secondary" className="text-xs">
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{tx.memberName}</span>
                          <span>•</span>
                          <span>
                            {format(new Date(tx.createdAt), "MM-dd HH:mm", { locale: zhCN })}
                          </span>
                          {tx.paymentMethod && (
                            <>
                              <span>•</span>
                              <span>{paymentMethodMap[tx.paymentMethod]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-lg font-semibold ${
                        tx.type === "recharge" || tx.type === "refund"
                          ? "text-chart-2"
                          : "text-destructive"
                      }`}
                    >
                      {tx.type === "recharge" || tx.type === "refund" ? "+" : "-"}¥
                      {tx.amount.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
          )}
        </>
      )}
    </div>
  );
}
