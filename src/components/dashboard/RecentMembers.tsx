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
    <section className={cn("transition-opacity duration-500", hidden && "opacity-15")}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-tight">最近会员</h2>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground text-xs h-7 px-2.5"
          onClick={onViewAll}
        >
          全部 <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="暂无会员"
          description="添加第一位会员"
          action={
            <Button size="sm" onClick={onAddMember}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />开卡
            </Button>
          }
        />
      ) : (
        <div className="space-y-1">
          {members.slice(0, 5).map((member) => (
            <div
              key={member.id}
              onClick={onViewAll}
              className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                  {member.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {hidden ? "***" : member.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {hidden ? "****" : member.phone}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold tabular-nums shrink-0 ml-3">
                {hidden ? "****" : `¥${member.balance.toFixed(2)}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
