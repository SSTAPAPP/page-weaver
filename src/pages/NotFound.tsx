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
      <div className="text-center animate-fade-in">
        <p className="text-7xl font-bold text-foreground/6">404</p>
        <h1 className="mt-3 text-base font-semibold text-foreground">页面未找到</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">您访问的页面不存在</p>
        <Button variant="outline" className="mt-8" asChild>
          <a href="/">返回首页</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
