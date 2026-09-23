import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ReadOnlyChart } from "@/components/ReadOnlyChart";
import { prisma } from "@/lib/prisma";
import { updateProfileVisibility } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "User profile",
  description: "View a My Top 100 profile and charts.",
};

type ChartType = "albums" | "films" | "songs";

type UserProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{
    chart?: string | string[];
  }>;
};

function selectedChart(value: string | string[] | undefined): ChartType {
  const chart = Array.isArray(value) ? value[0] : value;

  if (chart === "films" || chart === "songs") {
    return chart;
  }

  return "albums";
}

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export default async function UserProfilePage({
  params,
  searchParams,
}: UserProfilePageProps) {
  const [{ username }, parameters, session] =
    await Promise.all([params, searchParams, auth()]);

  const profile = await prisma.user.findUnique({
    where: {
      usernameKey: username.toLowerCase(),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      isProfilePublic: true,
      status: true,
      _count: {
        select: {
          albums: true,
          films: true,
          songs: true,
        },
      },
    },
  });

  if (!profile?.username) {
    notFound();
  }

  const profileUsername = profile.username;

  const isOwner = session?.user?.id === profile.id;
  const isAdministrator =
    session?.user?.status === "APPROVED" &&
    session.user.role === "ADMIN";
  const isPubliclyViewable =
    profile.status === "APPROVED" &&
    profile.isProfilePublic;

  if (isOwner && session.user.status === "SUSPENDED") {
    redirect("/suspended");
  }

  if (
    !isOwner &&
    !isAdministrator &&
    !isPubliclyViewable
  ) {
    notFound();
  }

  const chart = selectedChart(parameters.chart);

  const [albums, films, songs] = await Promise.all([
    prisma.album.findMany({
      where: {
        ownerId: profile.id,
      },
      orderBy: {
        position: "asc",
      },
      select: {
        id: true,
        position: true,
        title: true,
        artist: true,
        releaseYear: true,
        artworkUrl: true,
      },
    }),
    prisma.film.findMany({
      where: {
        ownerId: profile.id,
      },
      orderBy: {
        position: "asc",
      },
      select: {
        id: true,
        position: true,
        title: true,
        director: true,
        releaseYear: true,
        posterUrl: true,
      },
    }),
    prisma.song.findMany({
      where: {
        ownerId: profile.id,
      },
      orderBy: {
        position: "asc",
      },
      select: {
        id: true,
        position: true,
        title: true,
        artist: true,
        releaseYear: true,
        artworkUrl: true,
        trackUrl: true,
      },
    }),
  ]);

  const displayName =
    profile.displayName ?? profileUsername;
  const tabs: Array<{
    type: ChartType;
    label: string;
    count: number;
  }> = [
    {
      type: "albums",
      label: "Albums",
      count: profile._count.albums,
    },
    {
      type: "films",
      label: "Films",
      count: profile._count.films,
    },
    {
      type: "songs",
      label: "Songs",
      count: profile._count.songs,
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
                My Top 100 profile
              </p>

              <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">
                {displayName}
              </h1>

              <p className="mt-2 text-neutral-500">
                @{profileUsername}
              </p>

              {profile.bio && (
                <p className="mt-4 max-w-2xl leading-7 text-neutral-300">
                  {profile.bio}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 md:max-w-md md:justify-end">
              {(isOwner || !profile.isProfilePublic) && (
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                    profile.isProfilePublic
                      ? "border-emerald-700 bg-emerald-950/60 text-emerald-300"
                      : "border-amber-800 bg-amber-950/50 text-amber-300"
                  }`}
                >
                  {profile.isProfilePublic
                    ? "Public profile"
                    : "Private profile"}
                </span>
              )}

              {isOwner && (
                <form action={updateProfileVisibility}>
                  <input
                    type="hidden"
                    name="visibility"
                    value={
                      profile.isProfilePublic
                        ? "private"
                        : "public"
                    }
                  />

                  <button
                    type="submit"
                    className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                  >
                    Make profile {profile.isProfilePublic
                      ? "private"
                      : "public"}
                  </button>
                </form>
              )}

              {profile.status !== "APPROVED" && (
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  {profile.status.toLowerCase()}
                </span>
              )}

              {isAdministrator && (
                <Link
                  href="/admin/users"
                  className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                >
                  ← Back to users
                </Link>
              )}
            </div>
          </div>

          <p className="mt-5 text-sm text-neutral-400">
            {countLabel(profile._count.albums, "album")}
            {" · "}
            {countLabel(profile._count.films, "film")}
            {" · "}
            {countLabel(profile._count.songs, "song")}
          </p>
        </header>

        <nav
          aria-label={`${displayName}'s charts`}
          className="mb-8 flex max-w-xl items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1"
        >
          {tabs.map((tab) => {
            const isActive = chart === tab.type;

            return (
              <Link
                key={tab.type}
                href={`/users/${encodeURIComponent(profileUsername)}?chart=${tab.type}`}
                replace
                aria-current={isActive ? "page" : undefined}
                className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
                  isActive
                    ? "bg-sky-400 text-neutral-950"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-70">
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </nav>

        {chart === "albums" && (
          <ReadOnlyChart
            type="albums"
            ownerName={displayName}
            items={albums}
          />
        )}

        {chart === "films" && (
          <ReadOnlyChart
            type="films"
            ownerName={displayName}
            items={films}
          />
        )}

        {chart === "songs" && (
          <ReadOnlyChart
            type="songs"
            ownerName={displayName}
            items={songs}
          />
        )}
      </div>
    </main>
  );
}
