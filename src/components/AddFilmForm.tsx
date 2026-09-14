"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FilmSearchResult = {
  tmdbId: number;
  title: string;
  director: string | null;
  releaseYear: number | null;
  posterUrl: string;
};

type AddFilmFormProps = {
  chartSize: number;
};

type FilmPosterProps = {
  src: string;
  title: string;
  className: string;
};

function FilmPoster({
  src,
  title,
  className,
}: FilmPosterProps) {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [src]);

  if (!src || hasFailed) {
    return (
      <div
        title={`No poster available for ${title}`}
        className={`${className} flex items-center justify-center bg-neutral-800 text-neutral-500`}
      >
        <span className="text-xl">◆</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${title} poster`}
      className={className}
      onError={() => setHasFailed(true)}
    />
  );
}

export function AddFilmForm({
  chartSize,
}: AddFilmFormProps) {
  const router = useRouter();
  const maximumPosition = chartSize + 1;

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    FilmSearchResult[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  const [title, setTitle] = useState("");
  const [director, setDirector] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [position, setPosition] = useState(
    String(maximumPosition),
  );
  const [posterUrl, setPosterUrl] = useState("");
  const [tmdbId, setTmdbId] = useState<number | null>(
    null,
  );

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPosition(String(maximumPosition));
  }, [maximumPosition]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(
          `/api/film-search?q=${encodeURIComponent(
            search.trim(),
          )}`,
          {
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Film search failed",
          );
        }

        setResults(data);
      } catch (error) {
        if (
          error instanceof Error &&
          error.name !== "AbortError"
        ) {
          setResults([]);
          setError(error.message);
        }
      } finally {
        setIsSearching(false);
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  function selectFilm(film: FilmSearchResult) {
    setTitle(film.title);
    setDirector(film.director ?? "");
    setReleaseYear(
      film.releaseYear ? String(film.releaseYear) : "",
    );
    setPosterUrl(film.posterUrl);
    setTmdbId(film.tmdbId);

    setSearch("");
    setResults([]);
    setError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/films", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          director: director || null,
          releaseYear: releaseYear || null,
          position: Number(position),
          posterUrl: posterUrl || null,
          tmdbId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to add film",
        );
      }

      setSearch("");
      setResults([]);
      setTitle("");
      setDirector("");
      setReleaseYear("");
      setPosterUrl("");
      setTmdbId(null);

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to add film",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="relative flex-[2]">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-400">
              Search TMDB
            </span>

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setError("");
              }}
              placeholder="Search by film title…"
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          {(isSearching || results.length > 0) && (
            <div className="absolute z-30 mt-2 max-h-96 w-full min-w-[320px] overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950 shadow-2xl">
              {isSearching && results.length === 0 ? (
                <p className="p-4 text-sm text-neutral-400">
                  Searching…
                </p>
              ) : (
                results.map((film) => (
                  <button
                    key={film.tmdbId}
                    type="button"
                    onClick={() => selectFilm(film)}
                    className="flex w-full items-center gap-3 border-b border-neutral-800 p-3 text-left transition last:border-0 hover:bg-neutral-800"
                  >
                    <FilmPoster
                      src={film.posterUrl}
                      title={film.title}
                      className="h-16 w-11 shrink-0 rounded object-cover"
                    />

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {film.title}
                      </span>

                      <span className="block truncate text-xs text-neutral-400">
                        {film.director ??
                          "Director unavailable"}
                        {film.releaseYear
                          ? ` · ${film.releaseYear}`
                          : ""}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <label className="block flex-[1.5]">
          <span className="mb-1 block text-xs font-medium text-neutral-400">
            Film title
          </span>

          <input
            required
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-sky-400"
          />
        </label>

        <label className="block flex-[1.5]">
          <span className="mb-1 block text-xs font-medium text-neutral-400">
            Director
          </span>

          <input
            value={director}
            onChange={(event) =>
              setDirector(event.target.value)
            }
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-sky-400"
          />
        </label>

        <label className="block w-full lg:w-24">
          <span className="mb-1 block text-xs font-medium text-neutral-400">
            Year
          </span>

          <input
            type="number"
            min="1800"
            max="2100"
            value={releaseYear}
            onChange={(event) =>
              setReleaseYear(event.target.value)
            }
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-sky-400"
          />
        </label>

        <label className="block w-full lg:w-24">
          <span className="mb-1 block text-xs font-medium text-neutral-400">
            Position
          </span>

          <input
            required
            type="number"
            min="1"
            max={maximumPosition}
            value={position}
            onChange={(event) =>
              setPosition(event.target.value)
            }
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-sky-400"
          />
        </label>

        <button
          type="submit"
          disabled={isSaving || !title.trim()}
          className="h-10 shrink-0 rounded-lg bg-sky-400 px-5 text-sm font-semibold text-neutral-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Adding…" : "Add film"}
        </button>
      </div>

      {posterUrl && (
        <div className="mt-3 flex items-center gap-3 border-t border-neutral-800 pt-3">
          <FilmPoster
            src={posterUrl}
            title={title}
            className="h-16 w-11 rounded object-cover"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              Selected: {title}
            </p>

            <p className="truncate text-xs text-neutral-500">
              {director || "Director unavailable"}
              {releaseYear ? ` · ${releaseYear}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPosterUrl("")}
            className="rounded px-3 py-2 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          >
            Remove poster
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
