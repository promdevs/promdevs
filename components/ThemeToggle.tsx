"use client";
import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
export function ThemeToggle() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem("theme");
      } catch {}
      document.documentElement.classList.toggle(
        "dark",
        stored === "dark" || (stored !== "light" && media.matches),
      );
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-button theme-toggle"
      aria-label="Toggle color theme"
    >
      <Sun className="hidden dark:block" size={16} aria-hidden />
      <Moon className="dark:hidden" size={16} aria-hidden />
    </button>
  );
}
