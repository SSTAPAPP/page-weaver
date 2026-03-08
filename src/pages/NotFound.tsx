import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-6xl font-bold text-foreground/10">404</p>
        <h1 className="mt-2 text-sm font-medium text-foreground">页面未找到</h1>
        <p className="mt-1 text-xs text-muted-foreground">您访问的页面不存在</p>
        <Button variant="outline" size="sm" className="mt-6" asChild>
          <a href="/">返回首页</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
