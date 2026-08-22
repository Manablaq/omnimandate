"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

const STORAGE_KEY = "omnimandate-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function resolveTheme(theme: ThemePreference, prefersDark: boolean): ResolvedTheme {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

function applyTheme(theme: ThemePreference, resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = theme;
  root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme = isThemePreference(storedTheme) ? storedTheme : "system";

    const sync = (nextTheme: ThemePreference) => {
      const nextResolvedTheme = resolveTheme(nextTheme, media.matches);
      setThemeState(nextTheme);
      setResolvedTheme(nextResolvedTheme);
      applyTheme(nextTheme, nextResolvedTheme);
    };

    sync(initialTheme);
    const handlePreferenceChange = () => {
      if (theme === "system") sync("system");
    };
    media.addEventListener("change", handlePreferenceChange);
    return () => media.removeEventListener("change", handlePreferenceChange);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    const nextResolvedTheme = resolveTheme(nextTheme, window.matchMedia("(prefers-color-scheme: dark)").matches);
    setThemeState(nextTheme);
    setResolvedTheme(nextResolvedTheme);
    applyTheme(nextTheme, nextResolvedTheme);
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
