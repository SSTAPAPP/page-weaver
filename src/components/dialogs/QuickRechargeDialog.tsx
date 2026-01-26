import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

interface QuickRechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickRechargeDialog({ open, onOpenChange }: QuickRechargeDialogProps) {
  const { toast } = useToast();
  const {
    searchMembers,
    getMemberByPhone,
    rechargeMember,
    addCardToMember,
    cardTemplates,
    addTransaction,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchMembers>>([]);
  const [type, setType] = useState<"balance" | "card">("balance");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "cash">("wechat");

  const handleSearch = () => {
    if (searchQuery.length < 2) return;
    const results = searchMembers(searchQuery);
    setSearchResults(results);
  };

  const selectedMember = searchResults.find((m) => m.id === selectedMemberId);

  const resetForm = () => {
    setSearchQuery("");
    setSelectedMemberId("");
    setSearchResults([]);
    setType("balance");
    setRechargeAmount("");
    setSelectedTemplate("");
    setPaymentMethod("wechat");
  };

  const handleSubmit = () => {
    if (!selectedMember) {
      toast({
        title: "请选择会员",
        variant: "destructive",
      });
      return;
    }

    if (type === "balance") {
      const amount = parseFloat(rechargeAmount);
      if (!amount || amount <= 0) {
        toast({
          title: "请输入有效金额",
          variant: "destructive",
        });
        return;
      }
      rechargeMember(selectedMember.id, amount);
      addTransaction({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        type: "recharge",
        amount,
        paymentMethod,
        description: `充值 ¥${amount}`,
      });
      toast({
        title: "充值成功",
        description: `已为 ${selectedMember.name} 充值 ¥${amount}`,
      });
    } else {
      const template = cardTemplates.find((t) => t.id === selectedTemplate);
      if (!template) {
        toast({
          title: "请选择次卡",
          variant: "destructive",
        });
        return;
      }
      addCardToMember(selectedMember.id, selectedTemplate);
      addTransaction({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        type: "recharge",
        amount: template.price,
        paymentMethod,
        description: `购买 ${template.name}`,
      });
      toast({
        title: "购卡成功",
        description: `已为 ${selectedMember.name} 购买 ${template.name}`,
      });
    }

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>会员充值</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索会员 */}
          <div className="space-y-2">
            <Label>搜索会员</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入手机号或姓名"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="secondary" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>选择会员</Label>
              <div className="max-h-40 space-y-2 overflow-auto">
                {searchResults.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      selectedMemberId === member.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">¥{member.balance.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.cards.length}张次卡
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 充值类型 */}
          {selectedMember && (
            <>
              <div className="space-y-2">
                <Label>充值类型</Label>
                <RadioGroup
                  value={type}
                  onValueChange={(v) => setType(v as "balance" | "card")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balance" id="r-balance" />
                    <Label htmlFor="r-balance">余额充值</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="r-card" />
                    <Label htmlFor="r-card">购买次卡</Label>
                  </div>
                </RadioGroup>
              </div>

              {type === "balance" ? (
                <div className="space-y-2">
                  <Label htmlFor="r-amount">充值金额</Label>
                  <Input
                    id="r-amount"
                    type="number"
                    placeholder="请输入金额"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                  />
                  <div className="flex gap-2">
                    {[100, 200, 300, 500, 1000].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setRechargeAmount(amount.toString())}
                      >
                        ¥{amount}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>选择次卡</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择次卡类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {cardTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - ¥{template.price} ({template.totalCount}次)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 支付方式 */}
              <div className="space-y-2">
                <Label>支付方式</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "wechat" | "alipay" | "cash")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wechat" id="r-wechat" />
                    <Label htmlFor="r-wechat">微信</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="alipay" id="r-alipay" />
                    <Label htmlFor="r-alipay">支付宝</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="r-cash" />
                    <Label htmlFor="r-cash">现金</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!selectedMember}>
              确认充值
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
