"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme =
  | "dark"
  | "light"
  | "rebel-blue"
  | "purple"
  | "ember";

const themes: Array<{
  value: Theme;
  label: string;
}> = [
  {
    value: "dark",
    label: "Dark",
  },
  {
    value: "light",
    label: "Light",
  },
  {
    value: "rebel-blue",
    label: "Rebel Blue",
  },
  {
    value: "purple",
    label: "Purple",
  },
  {
    value: "ember",
    label: "Ember",
  },
];

const navigationItems = [
  {
    label: "Albums",
    href: "/",
    section: "albums",
  },
  {
    label: "Films",
    href: "/films",
    section: "films",
  },
  {
    label: "Songs",
    href: "/songs",
    section: "songs",
  },
];

function isTheme(value: string): value is Theme {
  return themes.some((theme) => theme.value === value);
}

export function TopNavigation() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("dark");

  const activeSection = pathname.endsWith("/films")
    ? "films"
    : pathname.endsWith("/songs")
      ? "songs"
      : "albums";

  useEffect(() => {
    const currentTheme =
      document.documentElement.dataset.theme;

    if (currentTheme && isTheme(currentTheme)) {
      setTheme(currentTheme);
    }
  }, []);

  function handleThemeChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    const selectedTheme = event.target.value;

    if (!isTheme(selectedTheme)) {
      return;
    }

    setTheme(selectedTheme);
    document.documentElement.dataset.theme =
      selectedTheme;

    try {
      localStorage.setItem(
        "top100-theme",
        selectedTheme,
      );
    } catch {
      // The selected theme still works for the
      // current page if storage is unavailable.
    }
  }

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="/"
          className="shrink-0 text-sm font-bold uppercase tracking-[0.25em] text-white"
        >
          My Top 100
        </a>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
            {navigationItems.map((item) => {
              const isActive =
                activeSection === item.section;

              return (
                <a
                  key={item.section}
                  href={item.href}
                  aria-current={
                    isActive ? "page" : undefined
                  }
                  className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition sm:flex-none sm:px-4 ${
                    isActive
                      ? "bg-sky-400 text-neutral-950"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          <label>
            <span className="sr-only">Colour theme</span>

            <select
              value={theme}
              onChange={handleThemeChange}
              aria-label="Colour theme"
              title="Change colour theme"
              className="h-11 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-sm font-medium text-white outline-none transition hover:border-neutral-700 focus:border-sky-400"
            >
              {themes.map((themeOption) => (
                <option
                  key={themeOption.value}
                  value={themeOption.value}
                >
                  {themeOption.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </nav>
  );
}