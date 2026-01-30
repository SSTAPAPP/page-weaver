import { useState, useEffect, useCallback } from "react";
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
import { useStore } from "@/stores/useStore";
import { useToast } from "@/hooks/use-toast";
import { hashPassword, isHashed } from "@/lib/crypto";

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
  const { adminPassword, setAdminPassword } = useStore();
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (isVerifying) return;
    setIsVerifying(true);

    try {
      // Hash the input password
      const inputHash = await hashPassword(password);
      
      // Check if stored password is already hashed
      if (isHashed(adminPassword)) {
        // Compare hashes directly
        if (inputHash === adminPassword) {
          onConfirm();
          setPassword("");
          onOpenChange(false);
        } else {
          toast({
            title: "密码错误",
            description: "管理员密码不正确，请重试",
            variant: "destructive",
          });
        }
      } else {
        // Legacy: stored password is plain text, compare directly and migrate
        if (password === adminPassword) {
          // Migrate to hashed password
          setAdminPassword(inputHash);
          onConfirm();
          setPassword("");
          onOpenChange(false);
        } else {
          toast({
            title: "密码错误",
            description: "管理员密码不正确，请重试",
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsVerifying(false);
    }
  }, [password, adminPassword, onConfirm, onOpenChange, setAdminPassword, toast, isVerifying]);

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
