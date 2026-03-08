import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type FontSize = "xs" | "sm" | "base" | "lg" | "xl";

const THEME_KEY = "barber-shop-theme";
const FONT_SIZE_KEY = "barber-shop-font-size";

const fontSizeMap: Record<FontSize, string> = {
  xs: "13px",
  sm: "14px",
  base: "15px",
  lg: "16px",
  xl: "17px",
};

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(THEME_KEY) as Theme) || "system";
    }
    return "system";
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(FONT_SIZE_KEY) as FontSize) || "base";
    }
    return "base";
  });

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.fontSize = fontSizeMap[fontSize];
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize);
  };

  return { theme, setTheme, fontSize, setFontSize };
}
