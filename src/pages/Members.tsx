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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-5 w-8" />
        </div>
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 实时搜索 - 支持拼音首字母和手机号
  const filteredMembers = useMemo(() => {
    if (!debouncedQuery) return members;
    return members.filter((m) => matchMemberSearch(m.name, m.phone, debouncedQuery));
  }, [members, debouncedQuery]);

  // 分页
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  // 计算总余额
  const totalBalance = useMemo(() => {
    return members.reduce((sum, m) => sum + m.balance, 0);
  }, [members]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="会员管理"
        description={isLoading ? "加载中..." : `共 ${members.length} 位会员 · 总余额 ¥${totalBalance.toFixed(2)}`}
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
          placeholder="输入姓名或手机号搜索"
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
          >
            清除
          </Button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MemberCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
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
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedMembers.map((member) => (
              <Card
                key={member.id}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => setSelectedMemberId(member.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary transition-colors group-hover:bg-primary/20">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{member.name}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{member.phone}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={member.gender === "male" ? "secondary" : "outline"} className="shrink-0">
                      {member.gender === "male" ? "男" : "女"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="text-sm text-muted-foreground">余额</p>
                      <p className="text-lg font-bold">¥{member.balance.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">次卡</p>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-chart-2" />
                        <span className="font-bold">{member.cards.length}张</span>
                      </div>
                    </div>
                  </div>

                  {member.cards.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {member.cards.slice(0, 3).map((card) => (
                        <Badge
                          key={card.id}
                          variant={card.remainingCount <= 1 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {card.templateName} ({card.remainingCount})
                        </Badge>
                      ))}
                      {member.cards.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.cards.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">第</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setCurrentPage(Math.min(Math.max(1, val), totalPages));
                  }}
                  className="w-14 h-8 text-center"
                />
                <span className="text-muted-foreground">/ {totalPages} 页</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                共 {filteredMembers.length} 位会员
              </span>
            </div>
          )}
        </>
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
