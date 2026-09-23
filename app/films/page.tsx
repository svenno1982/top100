import type { Metadata } from "next";
import { AddFilmForm } from "@/components/AddFilmForm";
import { FilmChart } from "@/components/FilmChart";
import { prisma } from "@/lib/prisma";
import { requireApprovedPageUser } from "@/lib/page-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Films",
  description: "My definitive Top 100 films.",
};

export default async function FilmsPage() {
  const user = await requireApprovedPageUser();

  const films = await prisma.film.findMany({
    where: {
      ownerId: user.id,
    },
    orderBy: {
      position: "asc",
    },
  });

  const rankedFilmCount = Math.min(films.length, 100);
  const outsideFilmCount = Math.max(
    films.length - 100,
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
            My Top 100 Films
          </h1>

          <p className="mt-4 text-neutral-400">
            {rankedFilmCount} of 100 films ranked
            {outsideFilmCount > 0
              ? ` · ${outsideFilmCount} outside the chart`
              : ""}
          </p>
        </header>

        <AddFilmForm chartSize={films.length} />

        <FilmChart
          initialFilms={films.map((film) => ({
            id: film.id,
            position: film.position,
            title: film.title,
            director: film.director,
            releaseYear: film.releaseYear,
            posterUrl: film.posterUrl,
            tmdbId: film.tmdbId,
          }))}
        />

        <p className="mt-10 text-xs text-neutral-600">
          This product uses the TMDB API but is not
          endorsed or certified by TMDB.
        </p>
      </div>
    </main>
  );
}
