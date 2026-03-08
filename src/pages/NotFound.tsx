import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">抱歉，您访问的页面不存在或已被移除</p>
        <Button asChild variant="outline">
          <a href="/">
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
