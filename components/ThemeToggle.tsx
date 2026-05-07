"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = stored ?? (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  function handleChange() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      return nextTheme;
    });
  }

  return (
    <label className="theme-toggle">
      <input
        aria-label="切换暗黑模式"
        className="theme-checkbox"
        type="checkbox"
        checked={theme === "dark"}
        onChange={handleChange}
      />
      <span aria-hidden="true" className="theme-icon" />
      <span className="theme-text theme-text-light">Light</span>
      <span className="theme-text theme-text-dark">Dark</span>
    </label>
  );
}
