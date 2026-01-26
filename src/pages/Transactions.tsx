import { useMemo, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Search, ArrowUpCircle, ArrowDownCircle, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/stores/useStore";

const typeMap = {
  recharge: { label: "充值", icon: ArrowUpCircle, color: "text-chart-2" },
  consume: { label: "消费", icon: ArrowDownCircle, color: "text-destructive" },
  card_deduct: { label: "次卡扣除", icon: CreditCard, color: "text-chart-3" },
  refund: { label: "退款", icon: ArrowUpCircle, color: "text-chart-4" },
};

const paymentMethodMap = {
  balance: "余额",
  wechat: "微信",
  alipay: "支付宝",
  cash: "现金",
};

export default function Transactions() {
  const { transactions } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">交易流水</h1>
        <p className="text-muted-foreground">共 {transactions.length} 条记录</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索会员或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
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
        </CardContent>
      </Card>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <p className="text-lg font-medium">暂无交易记录</p>
            <p className="text-muted-foreground">交易流水将在这里显示</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => {
            const typeInfo = typeMap[tx.type];
            const TypeIcon = typeInfo.icon;

            return (
              <Card key={tx.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${typeInfo.color}`}
                    >
                      <TypeIcon className="h-5 w-5" />
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
      )}
    </div>
  );
}
