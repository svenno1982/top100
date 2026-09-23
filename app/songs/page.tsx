import type { Metadata } from "next";
import { AddSongForm } from "@/components/AddSongForm";
import { SongChart } from "@/components/SongChart";
import { prisma } from "@/lib/prisma";
import { requireApprovedPageUser } from "@/lib/page-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Songs",
  description: "My definitive Top 100 songs.",
};

export default async function SongsPage() {
  const user = await requireApprovedPageUser();

  const songs = await prisma.song.findMany({
    where: {
      ownerId: user.id,
    },
    orderBy: {
      position: "asc",
    },
  });

  const rankedSongCount = Math.min(songs.length, 100);
  const outsideSongCount = Math.max(
    songs.length - 100,
    0,
  );

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
            The definitive list
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            My Top 100 Songs
          </h1>

          <p className="mt-4 text-neutral-400">
            {rankedSongCount} of 100 songs ranked
            {outsideSongCount > 0
              ? ` · ${outsideSongCount} outside the chart`
              : ""}
          </p>
        </header>

        <AddSongForm chartSize={songs.length} />

        <SongChart
          initialSongs={songs.map((song) => ({
            id: song.id,
            position: song.position,
            title: song.title,
            artist: song.artist,
            releaseYear: song.releaseYear,
            artworkUrl: song.artworkUrl,
            appleTrackId: song.appleTrackId,
            trackUrl: song.trackUrl,
            previewUrl: song.previewUrl,
          }))}
        />

        <p className="mt-10 text-xs text-neutral-600">
          Song metadata and artwork are provided by the
          Apple iTunes Search API. Audio previews are
          provided courtesy of iTunes and streamed directly
          from Apple.
        </p>
      </div>
    </main>
  );
}