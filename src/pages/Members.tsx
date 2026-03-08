import { useState, useMemo } from "react";
import { Search, UserPlus, Phone, CreditCard, Wallet, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore } from "@/stores/useStore";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { MemberDetailDialog } from "@/components/dialogs/MemberDetailDialog";
import { matchMemberSearch } from "@/lib/pinyin";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MEMBER_TAG_OPTIONS } from "@/types";

const TAG_COLORS: Record<string, string> = {
  '金卡': 'bg-chart-5/15 text-chart-5 border-chart-5/30',
  '银卡': 'bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30',
  '普通': 'bg-muted text-muted-foreground border-border',
};


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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => {
            const consumeCount = memberConsumeCounts[member.id] || 0;
            const totalSpent = memberTotalSpent[member.id] || 0;
            const totalCardRemaining = member.cards.reduce((s, c) => s + c.remainingCount, 0);
            const memberSince = formatDistanceToNow(new Date(member.createdAt), { locale: zhCN, addSuffix: true });

            return (
              <Card
                key={member.id}
                className="group cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-md overflow-hidden"
                onClick={() => setSelectedMemberId(member.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMemberId(member.id); } }}
              >
                <CardContent className="p-0">
                  {/* Top: Avatar + Name + Tag */}
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <div className="relative">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary transition-colors duration-150 group-hover:bg-primary/20">
                        {member.name.charAt(0)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card text-[8px] flex items-center justify-center ${member.gender === 'male' ? 'bg-chart-3 text-card' : 'bg-chart-1 text-card'}`}>
                        {member.gender === 'male' ? '♂' : '♀'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{member.name}</p>
                        {member.tag && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium border ${TAG_COLORS[member.tag] || 'bg-muted text-muted-foreground border-border'}`}>
                            {member.tag}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 divide-x divide-border border-y border-border bg-muted/30">
                    <div className="py-2.5 px-3 text-center">
                      <p className="text-[10px] text-muted-foreground leading-tight">储值余额</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5">¥{member.balance.toFixed(0)}</p>
                    </div>
                    <div className="py-2.5 px-3 text-center">
                      <p className="text-[10px] text-muted-foreground leading-tight">次卡余次</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5">
                        {totalCardRemaining}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">次</span>
                      </p>
                    </div>
                    <div className="py-2.5 px-3 text-center">
                      <p className="text-[10px] text-muted-foreground leading-tight">到店次数</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5">{consumeCount}</p>
                    </div>
                  </div>

                  {/* Cards + Footer */}
                  <div className="p-4 pt-3 space-y-2.5">
                    {/* Cards list */}
                    {member.cards.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {member.cards.slice(0, 3).map((card) => (
                          <Badge
                            key={card.id}
                            variant={card.remainingCount <= 1 ? "destructive" : "secondary"}
                            className="text-[10px] font-normal"
                          >
                            {card.templateName}
                            <span className="ml-1 font-medium">{card.remainingCount}/{card.originalTotalCount}</span>
                          </Badge>
                        ))}
                        {member.cards.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{member.cards.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{memberSince}加入</span>
                      </div>
                      {totalSpent > 0 && (
                        <span className="tabular-nums">累计 ¥{totalSpent.toFixed(0)}</span>
                      )}
                    </div>
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
