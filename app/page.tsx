import type { Metadata } from "next";
import { AddAlbumForm } from "@/components/AddAlbumForm";
import { AlbumChart } from "@/components/AlbumChart";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Albums",
  description: "My definitive Top 100 albums.",
};

export default async function Home() {
  const albums = await prisma.album.findMany({
    orderBy: {
      position: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
            The definitive list
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            My Top 100 Albums
          </h1>

          <p className="mt-4 text-neutral-400">
            {Math.min(albums.length, 100)} of 100 albums
            ranked
            {albums.length > 100
              ? ` · ${albums.length - 100} outside the chart`
              : ""}
          </p>
        </header>

        <AddAlbumForm chartSize={albums.length} />

        <AlbumChart
          initialAlbums={albums.map((album) => ({
            id: album.id,
            position: album.position,
            title: album.title,
            artist: album.artist,
            releaseYear: album.releaseYear,
            artworkUrl: album.artworkUrl,
            artworkSource: album.artworkSource,
            musicBrainzId: album.musicBrainzId,
          }))}
        />
      </div>
    </main>
  );
}