import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // Only handle Escape in inputs
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === ",") {
        e.preventDefault();
        navigate("/settings");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
