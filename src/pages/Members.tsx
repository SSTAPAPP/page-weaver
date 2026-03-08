import { useState, useMemo } from "react";
import { Search, UserPlus, Phone, CreditCard, Wallet, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/stores/useStore";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { MemberDetailDialog } from "@/components/dialogs/MemberDetailDialog";
import { matchMemberSearch } from "@/lib/pinyin";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";


export default function Members() {
  const { members, transactions } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    return members.filter((m) => matchMemberSearch(m.name, m.phone, searchQuery));
  }, [members, searchQuery]);

  const totalBalance = useMemo(() => {
    return members.reduce((sum, m) => sum + m.balance, 0);
  }, [members]);

  // 计算每位会员的消费次数
  const memberConsumeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((t) => {
      if ((t.type === "consume" || t.type === "card_deduct") && !t.voided) {
        counts[t.memberId] = (counts[t.memberId] || 0) + 1;
      }
    });
    return counts;
  }, [transactions]);

  // 计算每位会员的累计消费金额
  const memberTotalSpent = useMemo(() => {
    const totals: Record<string, number> = {};
    transactions.forEach((t) => {
      if ((t.type === "consume" || t.type === "card_deduct") && !t.voided) {
        totals[t.memberId] = (totals[t.memberId] || 0) + t.amount;
      }
    });
    return totals;
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="会员管理"
        description={`当前共 ${members.length} 位会员，储值总余额 ¥${totalBalance.toFixed(2)}，支持开卡、充值与查询`}
      >
        <Button variant="outline" onClick={() => setRechargeDialogOpen(true)}>
          <Wallet className="mr-2 h-4 w-4" />
          会员充值
        </Button>
        <Button onClick={() => setMemberDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          快速开卡
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索姓名、拼音首字母或手机号"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-8 -translate-y-1/2 px-2"
            onClick={() => setSearchQuery("")}
            aria-label="清除搜索"
          >
            清除
          </Button>
        )}
      </div>

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={searchQuery ? "未找到匹配的会员" : "暂无会员"}
          description={searchQuery ? "请尝试其他搜索条件" : '点击"快速开卡"添加第一位会员'}
          action={
            !searchQuery ? (
              <Button onClick={() => setMemberDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                快速开卡
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => {
            const consumeCount = memberConsumeCounts[member.id] || 0;
            const totalSpent = memberTotalSpent[member.id] || 0;
            const totalCardRemaining = member.cards.reduce((s, c) => s + c.remainingCount, 0);
            const memberSince = formatDistanceToNow(new Date(member.createdAt), { locale: zhCN, addSuffix: true });

            return (
              <Card
                key={member.id}
                className="group cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                onClick={() => setSelectedMemberId(member.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMemberId(member.id); } }}
              >
                <CardContent className="p-5">
                  {/* Top: Avatar + Name + Level */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary transition-colors duration-150 group-hover:bg-primary/20">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-base">{member.name}</p>
                          <Badge variant={member.gender === "male" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                            {member.gender === "male" ? "男" : "女"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-semibold border ${level.color}`}>
                      {level.label}
                    </Badge>
                  </div>

                  <Separator className="my-3" />

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground">储值余额</p>
                      <p className="text-base font-bold mt-0.5">¥{member.balance.toFixed(0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground">次卡剩余</p>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <CreditCard className="h-3.5 w-3.5 text-chart-2" />
                        <span className="text-base font-bold">{totalCardRemaining}</span>
                        <span className="text-[11px] text-muted-foreground">次</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground">到店次数</p>
                      <p className="text-base font-bold mt-0.5">{consumeCount}</p>
                    </div>
                  </div>

                  {/* Cards list */}
                  {member.cards.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex flex-wrap gap-1.5">
                        {member.cards.slice(0, 3).map((card) => (
                          <Badge
                            key={card.id}
                            variant={card.remainingCount <= 1 ? "destructive" : "secondary"}
                            className="text-[11px]"
                          >
                            {card.templateName} 余{card.remainingCount}/{card.originalTotalCount}
                          </Badge>
                        ))}
                        {member.cards.length > 3 && (
                          <Badge variant="outline" className="text-[11px]">
                            +{member.cards.length - 3}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}

                  {/* Footer: joined time + total spent */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{memberSince}加入</span>
                    </div>
                    {totalSpent > 0 && (
                      <span>累计消费 ¥{totalSpent.toFixed(0)}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <QuickMemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} />
      <QuickRechargeDialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen} />
      <MemberDetailDialog
        memberId={selectedMemberId}
        open={!!selectedMemberId}
        onOpenChange={(open) => !open && setSelectedMemberId(null)}
      />
    </div>
  );
}
