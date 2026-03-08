import { Search, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Member } from "@/types";

interface CustomerSelectorProps {
  selectedMember: Member | null;
  searchQuery: string;
  searchResults: Member[];
  onSearchChange: (query: string) => void;
  onSelectMember: (member: Member) => void;
  onClearMember: () => void;
}

export function CustomerSelector({
  selectedMember,
  searchQuery,
  searchResults,
  onSearchChange,
  onSelectMember,
  onClearMember,
}: CustomerSelectorProps) {
  if (selectedMember) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
              {selectedMember.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{selectedMember.name}</p>
              <p className="text-xs text-muted-foreground">{selectedMember.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-xs text-muted-foreground leading-none mb-0.5">余额</p>
              <p className="text-sm font-semibold tabular-nums">¥{selectedMember.balance.toFixed(2)}</p>
            </div>
            {selectedMember.cards.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground leading-none mb-0.5">次卡</p>
                <p className="text-sm font-semibold tabular-nums">{selectedMember.cards.length}张</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onClearMember}
              title="切换为散客"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <UserX className="h-3.5 w-3.5 shrink-0" />
        <span>散客模式 · 搜索姓名或手机号选择会员</span>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索会员…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
        {searchQuery.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {searchResults.length > 0 && (
        <div className="max-h-[200px] overflow-auto rounded-lg border divide-y divide-border shadow-sm">
          {searchResults.map((member) => (
            <div
              key={member.id}
              onClick={() => onSelectMember(member)}
              className="cursor-pointer px-3 py-3 transition-colors hover:bg-muted/40 min-h-[48px]"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.phone}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-sm tabular-nums font-medium">¥{member.balance.toFixed(2)}</span>
                  {member.cards.length > 0 && (
                    <Badge variant="secondary" className="text-2xs">{member.cards.length}卡</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {searchQuery.length >= 1 && searchResults.length === 0 && (
        <p className="text-xs text-muted-foreground px-1 py-2">未找到匹配会员</p>
      )}
    </div>
  );
}
