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

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <label
      aria-label="切换暗黑模式"
      className="theme-toggle"
    >
      <input
        className="theme-checkbox"
        type="checkbox"
        checked={theme === "dark"}
        onChange={toggleTheme}
      />
      <span aria-hidden="true">{theme === "dark" ? "☾" : "○"}</span>
      <span>{theme === "dark" ? "Dark" : "Light"}</span>
    </label>
  );
}
