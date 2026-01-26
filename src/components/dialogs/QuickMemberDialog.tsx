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

interface QuickMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickMemberDialog({ open, onOpenChange }: QuickMemberDialogProps) {
  const { toast } = useToast();
  const {
    addMember,
    getMemberByPhone,
    rechargeMember,
    addCardToMember,
    cardTemplates,
    addTransaction,
  } = useStore();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [action, setAction] = useState<"none" | "recharge" | "card">("none");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "cash">("wechat");

  const resetForm = () => {
    setPhone("");
    setName("");
    setGender("male");
    setAction("none");
    setRechargeAmount("");
    setSelectedTemplate("");
    setPaymentMethod("wechat");
  };

  const handleSubmit = () => {
    if (!phone || !name) {
      toast({
        title: "请填写必要信息",
        description: "手机号和姓名为必填项",
        variant: "destructive",
      });
      return;
    }

    if (phone.length !== 11) {
      toast({
        title: "手机号格式错误",
        description: "请输入11位手机号",
        variant: "destructive",
      });
      return;
    }

    const existing = getMemberByPhone(phone);
    if (existing) {
      toast({
        title: "会员已存在",
        description: `手机号 ${phone} 已注册为会员 ${existing.name}`,
        variant: "destructive",
      });
      return;
    }

    // 创建会员
    const member = addMember({ phone, name, gender, balance: 0 });

    // 处理开卡/充值
    if (action === "recharge" && rechargeAmount) {
      const amount = parseFloat(rechargeAmount);
      if (amount > 0) {
        rechargeMember(member.id, amount);
        addTransaction({
          memberId: member.id,
          memberName: member.name,
          type: "recharge",
          amount,
          paymentMethod,
          description: `充值 ¥${amount}`,
        });
      }
    } else if (action === "card" && selectedTemplate) {
      const template = cardTemplates.find((t) => t.id === selectedTemplate);
      if (template) {
        addCardToMember(member.id, selectedTemplate);
        addTransaction({
          memberId: member.id,
          memberName: member.name,
          type: "recharge",
          amount: template.price,
          paymentMethod,
          description: `购买 ${template.name}`,
        });
      }
    }

    toast({
      title: "开卡成功",
      description: `会员 ${name} 已成功注册`,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>极速开卡</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号 *</Label>
              <Input
                id="phone"
                placeholder="请输入11位手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                className="font-mono text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">姓名/昵称 *</Label>
              <Input
                id="name"
                placeholder="请输入姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>性别</Label>
              <RadioGroup
                value={gender}
                onValueChange={(v) => setGender(v as "male" | "female")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">男</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">女</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* 开卡选项 */}
          <div className="space-y-3 rounded-lg border border-border p-4">
            <Label>开卡选项</Label>
            <RadioGroup
              value={action}
              onValueChange={(v) => setAction(v as "none" | "recharge" | "card")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none">仅注册会员</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recharge" id="recharge" />
                <Label htmlFor="recharge">注册并充值</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card">注册并购买次卡</Label>
              </div>
            </RadioGroup>

            {/* 充值金额 */}
            {action === "recharge" && (
              <div className="mt-3 space-y-2">
                <Label htmlFor="amount">充值金额</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="请输入金额"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                />
              </div>
            )}

            {/* 次卡选择 */}
            {action === "card" && (
              <div className="mt-3 space-y-2">
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
            {action !== "none" && (
              <div className="mt-3 space-y-2">
                <Label>支付方式</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "wechat" | "alipay" | "cash")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wechat" id="wechat" />
                    <Label htmlFor="wechat">微信</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="alipay" id="alipay" />
                    <Label htmlFor="alipay">支付宝</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">现金</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleSubmit}>
              确认开卡
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
