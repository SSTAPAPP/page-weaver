import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCardTemplates } from "@/hooks/useCloudData";
import { memberService } from "@/services/memberService";
import { transactionService } from "@/services/transactionService";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useCloudData";

interface QuickMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickMemberDialog({ open, onOpenChange }: QuickMemberDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: cardTemplates = [] } = useCardTemplates();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [action, setAction] = useState<"none" | "recharge" | "card">("none");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "cash">("wechat");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCard = useMemo(() => {
    return cardTemplates.find((t) => t.id === selectedTemplate);
  }, [cardTemplates, selectedTemplate]);

  const resetForm = () => {
    setPhone("");
    setName("");
    setGender("male");
    setAction("none");
    setRechargeAmount("");
    setSelectedTemplate("");
    setPaymentMethod("wechat");
    setErrors({});
  };

  const validateForm = async () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "请输入姓名";
    }

    if (!phone) {
      newErrors.phone = "请输入手机号";
    } else if (phone.length !== 11) {
      newErrors.phone = "请输入11位手机号";
    } else {
      // Check phone uniqueness from cloud
      const isUnique = await memberService.isPhoneUnique(phone);
      if (!isUnique) {
        newErrors.phone = "手机号已被其他会员注册";
      }
    }

    if (action === "recharge" && (!rechargeAmount || parseFloat(rechargeAmount) <= 0)) {
      newErrors.amount = "请输入有效金额";
    }

    if (action === "card" && !selectedTemplate) {
      newErrors.card = "请选择次卡类型";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    const valid = await validateForm();
    if (!valid) return;

    setIsSubmitting(true);
    try {
      // Create member in cloud
      const member = await memberService.create({
        phone,
        name: name.trim(),
        gender,
        balance: 0,
      });

      // Handle recharge
      if (action === "recharge" && rechargeAmount) {
        const amount = parseFloat(rechargeAmount);
        if (amount > 0) {
          await memberService.updateBalance(member.id, amount);
          await transactionService.create({
            memberId: member.id,
            memberName: member.name,
            type: "recharge",
            amount,
            paymentMethod,
            description: `充值 ¥${amount}`,
            voided: false,
          });
        }
      } else if (action === "card" && selectedTemplate) {
        const template = cardTemplates.find((t) => t.id === selectedTemplate);
        if (template) {
          await memberService.addCard(member.id, {
            templateId: template.id,
            templateName: template.name,
            remainingCount: template.totalCount,
            services: template.serviceIds,
            originalPrice: template.price,
            originalTotalCount: template.totalCount,
          });
          await transactionService.create({
            memberId: member.id,
            memberName: member.name,
            type: "recharge",
            amount: template.price,
            paymentMethod,
            description: `购买 ${template.name}`,
            voided: false,
          });
        }
      }

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.todayStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.cloudCounts });

      toast({
        title: "开卡成功",
        description: `会员 ${name} 已成功注册`,
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Create member error:", error);
      toast({ title: "开卡失败", description: "请检查网络连接后重试", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>极速开卡</DialogTitle>
          <DialogDescription>快速注册新会员</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <FormField
              label="姓名/昵称"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              error={errors.name}
            />

            <FormField
              label="手机号"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="请输入11位手机号"
              error={errors.phone}
              className="font-mono text-lg"
            />

            <div className="space-y-2">
              <Label>性别</Label>
              <RadioGroup
                value={gender}
                onValueChange={(v) => setGender(v as "male" | "female")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="cursor-pointer">男</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="cursor-pointer">女</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Separator />

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
                <Label htmlFor="none" className="cursor-pointer">仅注册会员</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recharge" id="recharge" />
                <Label htmlFor="recharge" className="cursor-pointer">注册并充值</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="cursor-pointer">注册并购买次卡</Label>
              </div>
            </RadioGroup>

            {action === "recharge" && (
              <div className="mt-3 space-y-2">
                <FormField
                  label="充值金额"
                  required
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="请输入金额"
                  error={errors.amount}
                />
                <div className="flex flex-wrap gap-2">
                  {[100, 200, 300, 500].map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRechargeAmount(amount.toString())}
                    >
                      ¥{amount}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {action === "card" && (
              <div className="mt-3 space-y-2">
                <Label className={errors.card ? "text-destructive" : ""}>
                  选择次卡 <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className={errors.card ? "border-destructive" : ""}>
                    <SelectValue placeholder="请选择次卡类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {cardTemplates.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        暂无次卡模板
                      </div>
                    ) : (
                      cardTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - ¥{template.price} ({template.totalCount}次)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.card && (
                  <p className="text-sm text-destructive">{errors.card}</p>
                )}
                {selectedCard && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">次卡金额</span>
                      <Badge variant="secondary">¥{selectedCard.price}</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                    <Label htmlFor="wechat" className="cursor-pointer">微信</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="alipay" id="alipay" />
                    <Label htmlFor="alipay" className="cursor-pointer">支付宝</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="cursor-pointer">现金</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <LoadingButton
              className="flex-1"
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              确认开卡
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
