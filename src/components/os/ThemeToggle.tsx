"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "mh-theme";

const systemTheme = (): Theme => (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

/** Light/dark switch. Without a stored choice the page follows the system setting. */
export function ThemeToggle({ labels }: { labels: { light: string; dark: string } }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme | undefined) ?? systemTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setTheme(next);
  };

  const label = theme === "light" ? labels.dark : labels.light;
  return (
    <button
      type="button"
      onClick={toggle}
      className="focus-ring grid size-7 place-items-center border border-line-strong text-fg hover:border-harpoon"
      aria-label={label}
      title={label}
    >
      {theme === "light" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
    </button>
  );
}
