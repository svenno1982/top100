"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AlbumArtwork } from "@/components/AlbumArtwork";

type SearchResult = {
  musicBrainzId: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  artworkUrl: string;
  artworkSource: string;
};

type AddAlbumFormProps = {
  chartSize: number;
};

export function AddAlbumForm({
  chartSize,
}: AddAlbumFormProps) {
  const router = useRouter();
  const maximumPosition = chartSize + 1;

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [position, setPosition] = useState(
    String(maximumPosition),
  );
  const [artworkUrl, setArtworkUrl] = useState("");
  const [artworkSource, setArtworkSource] = useState("");
  const [musicBrainzId, setMusicBrainzId] = useState("");

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
          `/api/search?q=${encodeURIComponent(search.trim())}`,
          {
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Search failed");
        }

        setResults(data);
      } catch (error) {
        if (
          error instanceof Error &&
          error.name !== "AbortError"
        ) {
          setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 1100);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  function selectAlbum(album: SearchResult) {
    setTitle(album.title);
    setArtist(album.artist);
    setReleaseYear(
      album.releaseYear ? String(album.releaseYear) : "",
    );
    setArtworkUrl(album.artworkUrl);
    setArtworkSource(album.artworkSource);
    setMusicBrainzId(album.musicBrainzId);

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
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          artist,
          releaseYear: releaseYear || null,
          artworkUrl: artworkUrl || null,
          artworkSource: artworkSource || null,
          musicBrainzId: musicBrainzId || null,
          position: Number(position),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to add album",
        );
      }

      setSearch("");
      setResults([]);
      setTitle("");
      setArtist("");
      setReleaseYear("");
      setArtworkUrl("");
      setArtworkSource("");
      setMusicBrainzId("");

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to add album",
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
              Search MusicBrainz
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by album or artist…"
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          {(isSearching || results.length > 0) && (
            <div className="absolute z-30 mt-2 max-h-96 w-full min-w-[320px] overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950 shadow-2xl">
              {isSearching && results.length === 0 ? (
                <p className="p-4 text-sm text-neutral-400">
                  Searching…
                </p>
              ) : (
                results.map((album) => (
                  <button
                    key={album.musicBrainzId}
                    type="button"
                    onClick={() => selectAlbum(album)}
                    className="flex w-full items-center gap-3 border-b border-neutral-800 p-3 text-left transition last:border-0 hover:bg-neutral-800"
                  >
                    <AlbumArtwork
  src={album.artworkUrl}
  title={album.title}
  artist={album.artist}
  className="h-12 w-12 shrink-0 rounded-md object-cover"
/>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {album.title}
                      </span>

                      <span className="block truncate text-xs text-neutral-400">
                        {album.artist}
                        {album.releaseYear
                          ? ` · ${album.releaseYear}`
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
            Album title
          </span>

          <input
            required
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <label className="block flex-[1.5]">
          <span className="mb-1 block text-xs font-medium text-neutral-400">
            Artist
          </span>

          <input
            required
            value={artist}
            onChange={(event) =>
              setArtist(event.target.value)
            }
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <label className="block w-full lg:w-24">
          <span className="mb-1 block text-xs font-medium text-neutral-400">
            Year
          </span>

          <input
            type="number"
            min="1900"
            max="2100"
            value={releaseYear}
            onChange={(event) =>
              setReleaseYear(event.target.value)
            }
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <button
          type="submit"
          disabled={
  isSaving ||
  !title.trim() ||
  !artist.trim() ||
  !position
}
          className="h-10 shrink-0 rounded-lg bg-sky-300 px-5 text-sm font-semibold text-neutral-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Adding…" : "Add album"}
        </button>
      </div>

      {artworkUrl && (
        <div className="mt-3 flex items-center gap-3 border-t border-neutral-800 pt-3">
          <AlbumArtwork
  src={artworkUrl}
  title={title}
  artist={artist}
  className="h-12 w-12 shrink-0 rounded-md object-cover"
/>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              Selected: {title}
            </p>

            <p className="truncate text-xs text-neutral-500">
              {artworkUrl}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setArtworkUrl("");
              setArtworkSource("");
              setMusicBrainzId("");
            }}
            className="rounded px-3 py-2 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          >
            Remove artwork
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