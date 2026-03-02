import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormField } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useMembers, useCardTemplates, queryKeys } from "@/hooks/useCloudData";
import { memberService } from "@/services/memberService";
import { transactionService } from "@/services/transactionService";
import { useQueryClient } from "@tanstack/react-query";
import { Search, User, CreditCard, Wallet } from "lucide-react";
import { matchMemberSearch } from "@/lib/pinyin";
import type { Member } from "@/types";

interface QuickRechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickRechargeDialog({ open, onOpenChange }: QuickRechargeDialogProps) {
  const queryClient = useQueryClient();
  const { data: members = [] } = useMembers();
  const { data: cardTemplates = [] } = useCardTemplates();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [type, setType] = useState<"balance" | "card">("balance");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "cash">("wechat");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const searchResults = useMemo(() => {
    if (searchQuery.length < 1) return [];
    return members.filter((m) => matchMemberSearch(m.name, m.phone, searchQuery)).slice(0, 10);
  }, [members, searchQuery]);

  const selectedCard = cardTemplates.find((t) => t.id === selectedTemplate);

  const resetForm = () => {
    setSearchQuery("");
    setSelectedMember(null);
    setType("balance");
    setRechargeAmount("");
    setSelectedTemplate("");
    setPaymentMethod("wechat");
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedMember) newErrors.member = "请选择会员";
    if (type === "balance" && (!rechargeAmount || parseFloat(rechargeAmount) <= 0)) newErrors.amount = "请输入有效金额";
    if (type === "card" && !selectedTemplate) newErrors.card = "请选择次卡类型";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedMember) return;

    setIsSubmitting(true);
    try {
      if (type === "balance") {
        const amount = parseFloat(rechargeAmount);
        await memberService.incrementBalance(selectedMember.id, amount);
        await transactionService.create({
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          type: "recharge",
          amount,
          paymentMethod,
          description: `充值 ¥${amount}`,
          voided: false,
        });
        toast.success("充值成功", { description: `已为 ${selectedMember.name} 充值 ¥${amount}` });
      } else {
        const template = cardTemplates.find((t) => t.id === selectedTemplate);
        if (template) {
          await memberService.addCard(selectedMember.id, {
            templateId: template.id,
            templateName: template.name,
            remainingCount: template.totalCount,
            services: template.serviceIds,
            originalPrice: template.price,
            originalTotalCount: template.totalCount,
          });
          await transactionService.create({
            memberId: selectedMember.id,
            memberName: selectedMember.name,
            type: "recharge",
            amount: template.price,
            paymentMethod,
            description: `购买 ${template.name}`,
            voided: false,
          });
          toast.success("购卡成功", { description: `已为 ${selectedMember.name} 购买 ${template.name}` });
        }
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.todayStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.cloudCounts });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("操作失败", { description: "请检查网络连接" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>会员充值</DialogTitle>
          <DialogDescription>为会员充值余额或购买次卡</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-auto">
          <div className="space-y-2">
            <Label className={errors.member ? "text-destructive" : ""}>
              选择会员 <span className="text-destructive">*</span>
            </Label>
            
            {selectedMember ? (
              <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedMember.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedMember.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">¥{selectedMember.balance.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.cards.length}张次卡</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedMember(null); setSearchQuery(""); }}>更换</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="输入姓名或手机号搜索" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-[160px] space-y-1 overflow-auto rounded-lg border border-border">
                    {searchResults.map((member) => (
                      <div key={member.id} onClick={() => { setSelectedMember(member); setSearchQuery(""); setErrors({}); }} className="cursor-pointer p-3 transition-colors hover:bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.phone}</p>
                          </div>
                          <p className="font-medium">¥{member.balance.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.member && <p className="text-sm text-destructive">{errors.member}</p>}
              </>
            )}
          </div>

          {selectedMember && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>充值类型</Label>
                <RadioGroup value={type} onValueChange={(v) => setType(v as "balance" | "card")} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balance" id="r-balance" />
                    <Label htmlFor="r-balance" className="flex cursor-pointer items-center gap-1"><Wallet className="h-4 w-4" />余额充值</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="r-card" />
                    <Label htmlFor="r-card" className="flex cursor-pointer items-center gap-1"><CreditCard className="h-4 w-4" />购买次卡</Label>
                  </div>
                </RadioGroup>
              </div>

              {type === "balance" ? (
                <div className="space-y-2">
                  <FormField label="充值金额" required type="number" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} placeholder="请输入金额" error={errors.amount} />
                  <div className="flex flex-wrap gap-2">
                    {[100, 200, 300, 500, 1000].map((amount) => (
                      <Button key={amount} variant="outline" size="sm" onClick={() => setRechargeAmount(amount.toString())}>¥{amount}</Button>
                    ))}
                  </div>
                  {rechargeAmount && parseFloat(rechargeAmount) > 0 && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">当前余额</span>
                        <span>¥{selectedMember.balance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-chart-2">
                        <span>充值后余额</span>
                        <span>¥{(selectedMember.balance + parseFloat(rechargeAmount)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className={errors.card ? "text-destructive" : ""}>选择次卡 <span className="text-destructive">*</span></Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className={errors.card ? "border-destructive" : ""}><SelectValue placeholder="请选择次卡类型" /></SelectTrigger>
                    <SelectContent>
                      {cardTemplates.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">暂无次卡模板</div>
                      ) : (
                        cardTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>{template.name} - ¥{template.price} ({template.totalCount}次)</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.card && <p className="text-sm text-destructive">{errors.card}</p>}
                  {selectedCard && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">次卡金额</span><Badge variant="secondary">¥{selectedCard.price}</Badge></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">可用次数</span><span>{selectedCard.totalCount}次</span></div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>支付方式</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "wechat" | "alipay" | "cash")} className="flex gap-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="wechat" id="r-wechat" /><Label htmlFor="r-wechat" className="cursor-pointer">微信</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="alipay" id="r-alipay" /><Label htmlFor="r-alipay" className="cursor-pointer">支付宝</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="r-cash" /><Label htmlFor="r-cash" className="cursor-pointer">现金</Label></div>
                </RadioGroup>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSubmitting}>取消</Button>
            <LoadingButton className="flex-1" onClick={handleSubmit} loading={isSubmitting} disabled={!selectedMember}>确认充值</LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
