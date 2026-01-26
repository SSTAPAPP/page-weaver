import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/stores/useStore";
import { Phone, Calendar, CreditCard, Wallet } from "lucide-react";

interface MemberDetailSheetProps {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailSheet({ memberId, open, onOpenChange }: MemberDetailSheetProps) {
  const { getMember, transactions, services } = useStore();
  const member = memberId ? getMember(memberId) : null;

  if (!member) return null;

  const memberTransactions = transactions
    .filter((t) => t.memberId === member.id)
    .slice(0, 20);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>会员详情</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 基本信息 */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {member.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{member.name}</h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {member.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                注册于 {format(new Date(member.createdAt), "yyyy-MM-dd", { locale: zhCN })}
              </div>
            </div>
          </div>

          {/* 账户信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                账户余额
              </div>
              <p className="mt-1 text-2xl font-bold">¥{member.balance.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                持有次卡
              </div>
              <p className="mt-1 text-2xl font-bold">{member.cards.length}张</p>
            </div>
          </div>

          {/* 次卡列表 */}
          {member.cards.length > 0 && (
            <div>
              <h4 className="mb-3 font-semibold">次卡详情</h4>
              <div className="space-y-2">
                {member.cards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{card.templateName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(card.createdAt), "yyyy-MM-dd", { locale: zhCN })} 购买
                      </p>
                    </div>
                    <Badge variant={card.remainingCount <= 1 ? "destructive" : "default"}>
                      剩余 {card.remainingCount} 次
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* 交易记录 */}
          <div>
            <h4 className="mb-3 font-semibold">最近交易</h4>
            {memberTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground">暂无交易记录</p>
            ) : (
              <div className="space-y-2">
                {memberTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.createdAt), "MM-dd HH:mm", { locale: zhCN })}
                      </p>
                    </div>
                    <span
                      className={`font-semibold ${
                        tx.type === "recharge" ? "text-chart-2" : "text-destructive"
                      }`}
                    >
                      {tx.type === "recharge" ? "+" : "-"}¥{tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
