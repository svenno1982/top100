"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlbumArtwork } from "@/components/AlbumArtwork";

type SongSearchResult = {
  appleTrackId: string;
  title: string;
  artist: string;
  albumTitle: string | null;
  releaseYear: number | null;
  artworkUrl: string;
  trackUrl: string | null;
  previewUrl: string | null;
};

type AddSongFormProps = {
  chartSize: number;
};

export function AddSongForm({
  chartSize,
}: AddSongFormProps) {
  const router = useRouter();
  const maximumPosition = chartSize + 1;

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    SongSearchResult[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [position, setPosition] = useState(
    String(maximumPosition),
  );
  const [artworkUrl, setArtworkUrl] = useState("");
  const [appleTrackId, setAppleTrackId] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

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
          `/api/song-search?q=${encodeURIComponent(
            search.trim(),
          )}`,
          {
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Song search failed",
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
    }, 1100);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  function selectSong(song: SongSearchResult) {
    setTitle(song.title);
    setArtist(song.artist);
    setReleaseYear(
      song.releaseYear ? String(song.releaseYear) : "",
    );
    setArtworkUrl(song.artworkUrl);
    setAppleTrackId(song.appleTrackId);
    setTrackUrl(song.trackUrl ?? "");
    setPreviewUrl(song.previewUrl ?? "");

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
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          artist,
          releaseYear: releaseYear || null,
          position: Number(position),
          artworkUrl: artworkUrl || null,
          appleTrackId: appleTrackId || null,
          trackUrl: trackUrl || null,
          previewUrl: previewUrl || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to add song",
        );
      }

      setSearch("");
      setResults([]);
      setTitle("");
      setArtist("");
      setReleaseYear("");
      setArtworkUrl("");
      setAppleTrackId("");
      setTrackUrl("");
      setPreviewUrl("");

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to add song",
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
              Search Apple Music
            </span>

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setError("");
              }}
              placeholder="Search by song or artist…"
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm outline-none focus:border-sky-400"
            />
          </label>

          {(isSearching || results.length > 0) && (
            <div className="absolute z-30 mt-2 max-h-96 w-full min-w-[320px] overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950 shadow-2xl">
              {isSearching && results.length === 0 ? (
                <p className="p-4 text-sm text-neutral-400">
                  Searching…
                </p>
              ) : (
                results.map((song) => (
                  <button
                    key={song.appleTrackId}
                    type="button"
                    onClick={() => selectSong(song)}
                    className="flex w-full items-center gap-3 border-b border-neutral-800 p-3 text-left transition last:border-0 hover:bg-neutral-800"
                  >
                    <AlbumArtwork
                      src={song.artworkUrl}
                      title={song.title}
                      artist={song.artist}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {song.title}
                      </span>

                      <span className="block truncate text-xs text-neutral-400">
                        {song.artist}
                        {song.releaseYear
                          ? ` · ${song.releaseYear}`
                          : ""}
                      </span>

                      {song.albumTitle && (
                        <span className="mt-0.5 block truncate text-[11px] text-neutral-600">
                          {song.albumTitle}
                        </span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <label className="block flex-[1.5]">
          <span className="mb-1 block text-xs font-medium text-neutral-400">
            Song title
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
            Artist
          </span>

          <input
            required
            value={artist}
            onChange={(event) =>
              setArtist(event.target.value)
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
          disabled={
            isSaving || !title.trim() || !artist.trim()
          }
          className="h-10 shrink-0 rounded-lg bg-sky-400 px-5 text-sm font-semibold text-neutral-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Adding…" : "Add song"}
        </button>
      </div>

      {artworkUrl && (
        <div className="mt-3 flex items-center gap-3 border-t border-neutral-800 pt-3">
          <AlbumArtwork
            src={artworkUrl}
            title={title}
            artist={artist}
            className="h-12 w-12 rounded-md object-cover"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              Selected: {title}
            </p>

            <p className="truncate text-xs text-neutral-500">
              {artist}
              {releaseYear ? ` · ${releaseYear}` : ""}
            </p>
          </div>

          {trackUrl && (
            <a
              href={trackUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded px-3 py-2 text-xs text-sky-400 transition hover:bg-neutral-800 hover:text-sky-300"
            >
              View on Apple Music
            </a>
          )}

          <button
            type="button"
            onClick={() => setArtworkUrl("")}
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