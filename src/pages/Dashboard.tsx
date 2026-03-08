import { useState } from "react";
import {
  Users,
  Wallet,
  CreditCard,
  TrendingUp,
  Calendar,
  Plus,
  Search,
  UserPlus,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useStore } from "@/stores/useStore";
import { useTodayStats, useMembers, useTransactions } from "@/hooks/useCloudData";
import { QuickMemberDialog } from "@/components/dialogs/QuickMemberDialog";
import { QuickRechargeDialog } from "@/components/dialogs/QuickRechargeDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const metricsInfo: Record<string, { title: string; brief: string; formula: string; example: string; note: string }> = {
  "今日实收": {
    title: "实收金额",
    brief: "真实进账现金流",
    formula: "现金 + 微信 + 支付宝 + 补差价",
    example: "余额50元消费80元，补差价30元现金 → 实收30元",
    note: "余额消费不计入（已在充值时收过）",
  },
  "今日充值": {
    title: "充值金额",
    brief: "储值/次卡销售额",
    formula: "储值卡销售 + 次卡销售",
    example: "会员充值500元储值卡 → 充值500元",
    note: "预收款项，体现客户信任度",
  },
  "今日消耗": {
    title: "消耗金额",
    brief: "余额/次卡核销值",
    formula: "余额消费 + 次卡消费（按原价）",
    example: "用余额支付38元洗剪吹 → 消耗38元",
    note: "补差价不计入（已在实收统计）",
  },
};

function StatMetric({ label, value, sub, loading, hidden, infoKey }: {
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
  hidden?: boolean;
  infoKey?: string;
}) {
  const info = infoKey ? metricsInfo[infoKey] : undefined;

  const content = (
    <div className="flex-1 min-w-0 py-1 cursor-default">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold tracking-tight tabular-nums">
        {loading ? <Skeleton className="h-7 w-20" /> : hidden ? "****" : value}
      </p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>
    </div>
  );

  if (info) {
    return (
      <HoverCard openDelay={100} closeDelay={50}>
        <HoverCardTrigger asChild>{content}</HoverCardTrigger>
        <HoverCardContent className="w-72 text-sm" side="bottom" align="start">
          <p className="font-medium mb-1">{info.title}</p>
          <p className="text-xs text-muted-foreground mb-2">{info.brief}</p>
          <div className="rounded-md bg-muted/50 p-2 mb-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">计算公式</p>
            <p className="font-mono text-xs">{info.formula}</p>
          </div>
          <p className="text-xs text-muted-foreground/80 italic">{info.note}</p>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return content;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { hiddenSections, toggleSectionVisibility } = useStore();
  const { data: stats, isLoading: isStatsLoading } = useTodayStats();
  const { data: members = [], isLoading: isMembersLoading } = useMembers();
  const { data: transactions = [], isLoading: isTxLoading } = useTransactions();
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

  const isHidden = (sectionId: string) => hiddenSections.includes(sectionId);

  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            仪表盘
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/50 hover:text-foreground"
          onClick={() => toggleSectionVisibility("stats")}
        >
          {isHidden("stats") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Stats — horizontal strip */}
      <Card className={`transition-opacity duration-300 ${isHidden("stats") ? "opacity-30" : ""}`}>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-border">
            <div className="px-5 py-4">
              <StatMetric label="今日实收" value={`¥${(stats?.revenue ?? 0).toFixed(2)}`} sub="现金+微信+支付宝+补差价" loading={isStatsLoading} hidden={isHidden("stats")} infoKey="今日实收" />
            </div>
            <div className="px-5 py-4">
              <StatMetric label="今日充值" value={`¥${(stats?.recharge ?? 0).toFixed(2)}`} sub="储值卡/次卡入账" loading={isStatsLoading} hidden={isHidden("stats")} infoKey="今日充值" />
            </div>
            <div className="px-5 py-4">
              <StatMetric label="今日消耗" value={`¥${(stats?.consumption ?? 0).toFixed(2)}`} sub="余额+次卡消费" loading={isStatsLoading} hidden={isHidden("stats")} infoKey="今日消耗" />
            </div>
            <div className="px-5 py-4">
              <StatMetric label="新增会员" value={(stats?.newMembers ?? 0).toString()} sub="今日新注册" loading={isStatsLoading} hidden={isHidden("stats")} />
            </div>
            <div className="px-5 py-4">
              <StatMetric label="今日预约" value={(stats?.appointments ?? 0).toString()} sub="待服务预约" loading={isStatsLoading} hidden={isHidden("stats")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions — compact row */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3 tracking-wide uppercase">快捷操作</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setMemberDialogOpen(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />快速开卡
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRechargeDialogOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />会员充值
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/cashier")}>
            <Wallet className="mr-1.5 h-3.5 w-3.5" />收银结账
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/members")}>
            <Search className="mr-1.5 h-3.5 w-3.5" />查找会员
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/appointments")}>
            <Calendar className="mr-1.5 h-3.5 w-3.5" />新增预约
          </Button>
        </div>
      </div>

      {/* Two-column lists */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Members */}
        <section className={`transition-opacity duration-300 ${isHidden("members") ? "opacity-30" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold">最近会员</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-foreground" onClick={() => toggleSectionVisibility("members")}>
                {isHidden("members") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground text-xs" onClick={() => navigate("/members")}>
                查看全部 <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {isMembersLoading ? (
            <div className="space-y-0 divide-y divide-border rounded-lg border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="space-y-1"><Skeleton className="h-4 w-16" /><Skeleton className="h-3 w-24" /></div>
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState icon={Users} title="暂无会员" description='点击"快速开卡"添加第一位会员'
              action={<Button size="sm" onClick={() => setMemberDialogOpen(true)}><UserPlus className="mr-1.5 h-3.5 w-3.5" />快速开卡</Button>}
            />
          ) : (
            <div className="divide-y divide-border rounded-lg border">
              {members.slice(0, 6).map((member) => (
                <div
                  key={member.id}
                  onClick={() => navigate("/members")}
                  className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-medium text-foreground">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{isHidden("members") ? "***" : member.name}</p>
                      <p className="text-xs text-muted-foreground">{isHidden("members") ? "****" : member.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">{isHidden("members") ? "****" : `¥${member.balance.toFixed(2)}`}</p>
                    {member.cards.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">{member.cards.length}张次卡</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Transactions */}
        <section className={`transition-opacity duration-300 ${isHidden("transactions") ? "opacity-30" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold">最近交易</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-foreground" onClick={() => toggleSectionVisibility("transactions")}>
                {isHidden("transactions") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground text-xs" onClick={() => navigate("/transactions")}>
                查看全部 <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {isTxLoading ? (
            <div className="space-y-0 divide-y divide-border rounded-lg border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <EmptyState icon={CreditCard} title="暂无交易" description="交易记录将在这里显示" />
          ) : (
            <div className="divide-y divide-border rounded-lg border">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between px-4 py-3 ${tx.voided ? "opacity-40" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${tx.voided ? "line-through" : ""}`}>
                        {isHidden("transactions") ? "****" : tx.description}
                      </p>
                      {tx.voided && <Badge variant="destructive" className="text-[10px] shrink-0">已作废</Badge>}
                    </div>
                    <p className={`text-xs text-muted-foreground ${tx.voided ? "line-through" : ""}`}>
                      {isHidden("transactions") ? "***" : tx.memberName} · {format(new Date(tx.createdAt), "HH:mm")}
                    </p>
                  </div>
                  <span className={`text-sm font-medium tabular-nums shrink-0 ml-3 ${
                    tx.voided ? "line-through text-muted-foreground" :
                    tx.type === "recharge" || tx.type === "refund" ? "text-foreground" : "text-foreground"
                  }`}>
                    {isHidden("transactions")
                      ? "****"
                      : `${tx.type === "recharge" || tx.type === "refund" ? "+" : "-"}¥${tx.amount.toFixed(2)}`
                    }
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Dialogs */}
      <QuickMemberDialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen} />
      <QuickRechargeDialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen} />
    </div>
  );
}
