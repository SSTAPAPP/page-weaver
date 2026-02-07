import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Scissors, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-6">
          <Scissors className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">页面未找到</p>
        <p className="text-sm text-muted-foreground/60 mb-8 max-w-sm mx-auto">
          您访问的页面不存在或已被移除，请返回首页继续使用系统。
        </p>
        <Button asChild>
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
