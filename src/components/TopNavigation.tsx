"use client";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

type Theme =
  | "dark"
  | "light"
  | "rebel-blue"
  | "purple"
  | "ember";

type NavigationUser = {
  username: string | null;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  isSiteOwner: boolean;
};

type TopNavigationProps = {
  user: NavigationUser | null;
};

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

const accessPagePrefixes = [
  "/signin",
  "/onboarding",
  "/pending",
  "/suspended",
];

function isTheme(value: string): value is Theme {
  return themes.some((theme) => theme.value === value);
}

export function TopNavigation({
  user,
}: TopNavigationProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("dark");

  const activeSection = pathname.endsWith("/films")
    ? "films"
    : pathname.endsWith("/songs")
      ? "songs"
      : "albums";

  const hideNavigation = accessPagePrefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  );

  const canManageCharts =
    user?.status === "APPROVED";

    useEffect(() => {
    const currentTheme =
      document.documentElement.dataset.theme;

    if (!currentTheme || !isTheme(currentTheme)) {
      return;
    }

    const animationFrame =
      window.requestAnimationFrame(() => {
        setTheme(currentTheme);
      });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
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

  if (hideNavigation) {
    return null;
  }

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <a
  href={canManageCharts ? "/" : "/signin"}
  className="flex shrink-0 flex-col"
>
  <span className="text-lg font-bold uppercase tracking-[0.22em] text-white sm:text-xl">
    My Top 100
  </span>

  <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-sky-400">
    Created by Svenno
  </span>
</a>

        {canManageCharts && (
          <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
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
        )}

        <div className="flex items-center gap-2">
          <label className="ml-auto">
            <span className="sr-only">
              Colour theme
            </span>

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

          {user ? (
            <>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3">
                <span className="max-w-32 truncate text-sm font-semibold text-neutral-200">
                  {user.username ?? "Account"}
                </span>

                {user.isSiteOwner && (
                  <svg
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Site owner"
                    className="h-5 w-5 fill-amber-300"
                  >
                    <path d="M3 6l4.5 4L12 4l4.5 6L21 6l-2 12H5L3 6Zm3.7 10h10.6l1-6.1-2.1 1.9L12 6.2l-4.2 5.6-2.1-1.9 1 6.1Z" />
                  </svg>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  void signOut({
                    redirectTo: "/signin",
                  });
                }}
                className="h-11 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-800 hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <a
              href="/signin"
              className="flex h-11 items-center rounded-xl bg-sky-400 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-sky-300"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}