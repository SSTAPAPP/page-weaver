import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { verifyAdminPassword } from "@/lib/adminApi";

interface AdminPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export function AdminPasswordDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "需要管理员验证",
  description = "请输入管理员密码以继续操作",
}: AdminPasswordDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (isVerifying) return;
    setIsVerifying(true);

    try {
      // Use server-side password verification
      const result = await verifyAdminPassword(password);
      
      if (result.success) {
        onConfirm();
        setPassword("");
        onOpenChange(false);
      } else {
        toast({
          title: "密码错误",
          description: result.error || "管理员密码不正确，请重试",
          variant: "destructive",
        });
      }
    } finally {
      setIsVerifying(false);
    }
  }, [password, onConfirm, onOpenChange, toast, isVerifying]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="admin-password">管理员密码</Label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入管理员密码"
            className="mt-2"
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            disabled={isVerifying}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPassword("")} disabled={isVerifying}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isVerifying}>
            {isVerifying ? "验证中..." : "确认"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
