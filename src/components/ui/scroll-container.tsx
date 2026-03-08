import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ScrollContainer({ children, className, ...props }: ScrollContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollHint, setScrollHint] = React.useState<"none" | "top" | "bottom" | "both">("none");

  const updateScrollHint = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const isScrollable = scrollHeight > clientHeight;
    const atTop = scrollTop <= 1;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

    if (!isScrollable) {
      setScrollHint("none");
    } else if (atTop && !atBottom) {
      setScrollHint("bottom");
    } else if (atBottom && !atTop) {
      setScrollHint("top");
    } else if (!atTop && !atBottom) {
      setScrollHint("both");
    } else {
      setScrollHint("none");
    }
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial check
    updateScrollHint();

    // Check on resize
    const resizeObserver = new ResizeObserver(updateScrollHint);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [updateScrollHint]);

  return (
    <div
      ref={containerRef}
      onScroll={updateScrollHint}
      className={cn(
        "overflow-y-auto overflow-x-hidden overscroll-contain",
        scrollHint === "top" && "scroll-hint-top",
        scrollHint === "bottom" && "scroll-hint-bottom",
        scrollHint === "both" && "scroll-hint-both",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
