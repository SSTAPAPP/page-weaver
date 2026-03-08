import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between", className)}
        {...props}
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {children}
          </div>
        )}
      </div>
    );
  }
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
