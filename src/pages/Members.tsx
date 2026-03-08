import { useState, useMemo, useEffect } from "react";
import { Search, UserPlus, Phone, CreditCard, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembers } from "@/hooks/useCloudData";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { MemberDetailDialog } from "@/components/dialogs/MemberDetailDialog";
import { matchMemberSearch } from "@/lib/pinyin";

const ITEMS_PER_PAGE = 24;

function MemberCardSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export default function Members() {
  const { data: members = [], isLoading } = useMembers();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredMembers = useMemo(() => {
    if (!debouncedQuery) return members;
    return members.filter((m) => matchMemberSearch(m.name, m.phone, debouncedQuery));
  }, [members, debouncedQuery]);

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  const totalBalance = useMemo(() => {
    return members.reduce((sum, m) => sum + m.balance, 0);
  }, [members]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="会员管理"
        description={isLoading ? "加载中..." : `共 ${members.length} 位会员 · 总余额 ¥${totalBalance.toFixed(2)}`}
      >
        <Button variant="outline" size="sm" onClick={() => setRechargeDialogOpen(true)}>
          <Wallet className="mr-1.5 h-3.5 w-3.5" />
          会员充值
        </Button>
        <Button size="sm" onClick={() => setMemberDialogOpen(true)}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          快速开卡
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="输入姓名或手机号搜索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-2 text-xs" onClick={() => setSearchQuery("")}>
            清除
          </Button>
        )}
      </div>

      {/* Members grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <MemberCardSkeleton />
                <div className="border-t px-4 py-3">
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={searchQuery ? "未找到匹配的会员" : "暂无会员"}
          description={searchQuery ? "请尝试其他搜索条件" : '点击"快速开卡"添加第一位会员'}
          action={!searchQuery ? (
            <Button size="sm" onClick={() => setMemberDialogOpen(true)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />快速开卡
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedMembers.map((member) => (
              <Card
                key={member.id}
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => setSelectedMemberId(member.id)}
              >
                <CardContent className="p-0">
                  {/* Top row */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{member.phone}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                      {member.gender === "male" ? "男" : "女"}
                    </Badge>
                  </div>

                  {/* Bottom row */}
                  <div className="border-t border-border/60 px-4 py-3 flex items-center justify-between bg-muted/20">
                    <div>
                      <p className="text-[11px] text-muted-foreground">余额</p>
                      <p className="text-sm font-semibold tabular-nums">¥{member.balance.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">次卡</p>
                      <p className="text-sm font-semibold">{member.cards.length}张</p>
                    </div>
                  </div>

                  {/* Card badges */}
                  {member.cards.length > 0 && (
                    <div className="border-t border-border/40 px-4 py-2 flex flex-wrap gap-1">
                      {member.cards.slice(0, 3).map((card) => (
                        <Badge
                          key={card.id}
                          variant={card.remainingCount <= 1 ? "destructive" : "outline"}
                          className="text-[10px] font-normal"
                        >
                          {card.templateName} ({card.remainingCount})
                        </Badge>
                      ))}
                      {member.cards.length > 3 && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          +{member.cards.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-2">
                共 {filteredMembers.length} 位
              </span>
            </div>
          )}
        </>
      )}

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
