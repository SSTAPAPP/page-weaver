import { Search, X, User, Wallet, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {selectedMember.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{selectedMember.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{selectedMember.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-1.5 text-right">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground leading-none">余额</p>
                  <p className="text-sm font-semibold tabular-nums">¥{selectedMember.balance.toFixed(2)}</p>
                </div>
              </div>
              {selectedMember.cards.length > 0 && (
                <div className="flex items-center gap-1.5 text-right">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground leading-none">次卡</p>
                    <p className="text-sm font-semibold tabular-nums">{selectedMember.cards.length}张</p>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onClearMember}
                title="切换为散客"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground flex-1">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span>散客模式</span>
          <span className="text-muted-foreground/50">·</span>
          <span>搜索选择会员</span>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索姓名或手机号…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-11"
        />
        {searchQuery.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {searchResults.length > 0 && (
        <Card className="overflow-hidden">
          <div className="max-h-[240px] overflow-auto divide-y divide-border">
            {searchResults.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelectMember(member)}
                className="w-full cursor-pointer px-4 py-3 transition-colors hover:bg-muted/40 min-h-[48px] text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{member.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm tabular-nums font-semibold">¥{member.balance.toFixed(2)}</span>
                    {member.cards.length > 0 && (
                      <Badge variant="secondary" className="text-2xs">{member.cards.length}卡</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
      {searchQuery.length >= 1 && searchResults.length === 0 && (
        <p className="text-xs text-muted-foreground px-1 py-2">未找到匹配会员</p>
      )}
    </div>
  );
}
