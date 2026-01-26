import { useState } from "react";
import { Search, UserPlus, Phone, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/stores/useStore";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { MemberDetailSheet } from "@/components/sheets/MemberDetailSheet";

export default function Members() {
  const { members, searchMembers } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const filteredMembers = searchQuery ? searchMembers(searchQuery) : members;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">会员管理</h1>
          <p className="text-muted-foreground">共 {members.length} 位会员</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRechargeDialogOpen(true)}>
            会员充值
          </Button>
          <Button onClick={() => setMemberDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            快速开卡
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="输入手机号或姓名搜索会员..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <p className="text-lg font-medium">暂无会员</p>
            <p className="text-muted-foreground">点击"快速开卡"添加第一位会员</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <Card
              key={member.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedMemberId(member.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </div>
                    </div>
                  </div>
                  <Badge variant={member.gender === "male" ? "secondary" : "outline"}>
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
      )}

      {/* Dialogs */}
      <QuickMemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} />
      <QuickRechargeDialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen} />
      <MemberDetailSheet
        memberId={selectedMemberId}
        open={!!selectedMemberId}
        onOpenChange={(open) => !open && setSelectedMemberId(null)}
      />
    </div>
  );
}
