"use client";

import { usePathname } from "next/navigation";

const navigationItems = [
  {
    label: "Albums",
    href: "/top100/",
    section: "albums",
  },
  {
    label: "Films",
    href: "/top100/films",
    section: "films",
  },
  {
    label: "Songs",
    href: "/top100/songs",
    section: "songs",
  },
];

export function TopNavigation() {
  const pathname = usePathname();

  const activeSection = pathname.endsWith("/films")
    ? "films"
    : pathname.endsWith("/songs")
      ? "songs"
      : "albums";

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-4 py-4">
        <a
          href="/top100/"
          className="shrink-0 text-sm font-bold uppercase tracking-[0.25em] text-white"
        >
          My Top 100
        </a>

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
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
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
      </div>
    </nav>
  );
}