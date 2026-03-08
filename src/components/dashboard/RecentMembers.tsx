import { Users, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Member } from "@/types";

interface RecentMembersProps {
  members: Member[];
  isLoading: boolean;
  hidden: boolean;
  onToggleHidden: () => void;
  onViewAll: () => void;
  onAddMember: () => void;
}

export function RecentMembers({
  members,
  isLoading,
  hidden,
  onViewAll,
  onAddMember,
}: RecentMembersProps) {
  return (
    <section className={cn("transition-opacity duration-300", hidden && "opacity-30")}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">最近会员</h2>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground text-xs h-7"
          onClick={onViewAll}
        >
          全部 <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border rounded-lg border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-14" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="暂无会员"
          description="点击下方按钮添加第一位会员"
          action={
            <Button size="sm" onClick={onAddMember}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              快速开卡
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border">
          {members.slice(0, 5).map((member) => (
            <div
              key={member.id}
              onClick={onViewAll}
              className="flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand text-xs font-medium">
                  {member.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {hidden ? "***" : member.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hidden ? "****" : member.phone}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-medium tabular-nums">
                  {hidden ? "****" : `¥${member.balance.toFixed(2)}`}
                </p>
                {member.cards.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {member.cards.length}张次卡
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
