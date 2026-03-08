import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("请输入邮箱和密码");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("邮箱或密码错误");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("请先验证邮箱后再登录");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("登录成功");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      toast.error("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Brand */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background font-bold text-xl mb-5 shadow-lg">
            F
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">FFk Barber</h1>
          <p className="text-sm text-muted-foreground mt-1">理发店会员管理系统</p>
        </div>

        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-base font-medium text-foreground">登录管理后台</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  className="h-11 pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中…
                </>
              ) : (
                "登录"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground/50">
            如需账号，请联系管理员
          </p>
        </div>

        <p className="mt-16 text-center text-[11px] text-muted-foreground/30 tracking-wide">
          FFk Barber v1.0
        </p>
      </div>
    </div>
  );
}
