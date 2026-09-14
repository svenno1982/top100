"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CollisionDetection,
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlbumArtwork } from "@/components/AlbumArtwork";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

const TOP_100_SIZE = 100;
const OUTSIDE_DROP_ID = "outside-top-100";
const PREVIEW_VOLUME = 0.2;

const cursorCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  return pointerCollisions.length > 0
    ? pointerCollisions
    : closestCenter(args);
};

const stableSortingStrategy = () => null;

export type ChartSong = {
  id: number;
  position: number;
  title: string;
  artist: string;
  releaseYear: number | null;
  artworkUrl: string | null;
  appleTrackId: string | null;
  trackUrl: string | null;
  previewUrl: string | null;
};

type SongChartProps = {
  initialSongs: ChartSong[];
};

type SongItemProps = {
  song: ChartSong;
  isSaving: boolean;
  isPlaying: boolean;
  onTogglePreview: (song: ChartSong) => void;
  onEdit: (song: ChartSong) => void;
  onDelete: (song: ChartSong) => void;
};

type EditSongModalProps = {
  song: ChartSong;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (song: ChartSong) => Promise<void>;
};

function SongDragPreview({ song }: { song: ChartSong }) {
  return (
    <article className="w-36 overflow-hidden rounded-xl border border-sky-400 bg-neutral-900 shadow-2xl shadow-black/60">
      <div className="relative aspect-square overflow-hidden bg-neutral-800">
        <AlbumArtwork
          src={song.artworkUrl}
          title={song.title}
          artist={song.artist}
          className="h-full w-full object-cover"
        />

        <div className="absolute left-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-neutral-950/90 px-2 text-sm font-bold text-sky-400 shadow-lg">
          {song.position}
        </div>
      </div>
    </article>
  );
}

function SongCard({
  song,
  isSaving,
  isPlaying,
  onTogglePreview,
  onEdit,
  onDelete,
}: SongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: song.id,
    disabled: isSaving,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 20 : "auto",
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden rounded-xl border bg-neutral-900 transition-colors ${
        isOver && !isDragging
          ? "border-sky-400"
          : "border-neutral-800"
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-800">
        <AlbumArtwork
          src={song.artworkUrl}
          title={song.title}
          artist={song.artist}
          className="h-full w-full object-cover"
        />

        <div className="absolute left-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-neutral-950/90 px-2 text-sm font-bold text-sky-400 shadow-lg">
          {song.position}
        </div>

        <button
          type="button"
          disabled={isSaving}
          aria-label={`Move ${song.title}`}
          title="Drag to reorder"
          className="absolute right-2 top-2 cursor-grab touch-none select-none rounded-lg bg-neutral-950/90 px-2 py-1 text-lg text-neutral-300 shadow-lg transition hover:text-white active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
          {...attributes}
          {...listeners}
        >
          ☰
        </button>

        <button
          type="button"
          disabled={isSaving || !song.previewUrl}
          onClick={() => onTogglePreview(song)}
          aria-label={`${isPlaying ? "Pause" : "Play"} preview of ${song.title}`}
          title={
            song.previewUrl
              ? isPlaying
                ? "Pause preview"
                : "Play 30-second preview"
              : "Song not available, Sorry!"
          }
          className={`absolute bottom-2 left-2 flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isPlaying
              ? "border-sky-300 bg-sky-400 text-neutral-950"
              : "border-neutral-700 bg-neutral-950/90 text-white hover:border-sky-400 hover:text-sky-300"
          }`}
        >
          <span aria-hidden="true">
            {isPlaying ? "Ⅱ" : "▶"}
          </span>
        </button>
      </div>

      <div className="p-3">
        <h2
          title={song.title}
          className="truncate text-sm font-semibold"
        >
          {song.title}
        </h2>

        <p
          title={song.artist}
          className="mt-1 truncate text-xs text-neutral-400"
        >
          {song.artist}
        </p>

        <div className="mt-2 flex min-h-7 items-center justify-between gap-1">
          <span className="text-xs text-neutral-500">
            {song.releaseYear ?? "—"}
          </span>

          <div className="flex">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onEdit(song)}
              className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
            >
              Edit
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => onDelete(song)}
              className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SongListRow({
  song,
  isSaving,
  isPlaying,
  onTogglePreview,
  onEdit,
  onDelete,
}: SongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: song.id,
    disabled: isSaving,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 20 : "auto",
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-neutral-900 px-3 py-2 transition-colors sm:grid-cols-[4rem_minmax(0,1.5fr)_minmax(0,1fr)_5rem_auto] ${
        isOver && !isDragging
          ? "border-sky-400"
          : "border-neutral-800"
      }`}
    >
      <div className="text-center text-sm font-bold text-neutral-500">
        {song.position}
      </div>

      <div className="min-w-0">
        <p
          title={song.title}
          className="truncate text-sm font-semibold"
        >
          {song.title}
        </p>

        <p className="truncate text-xs text-neutral-400 sm:hidden">
          {song.artist}
        </p>
      </div>

      <p
        title={song.artist}
        className="hidden truncate text-sm text-neutral-400 sm:block"
      >
        {song.artist}
      </p>

      <p className="hidden text-sm text-neutral-500 sm:block">
        {song.releaseYear ?? "—"}
      </p>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          disabled={isSaving || !song.previewUrl}
          onClick={() => onTogglePreview(song)}
          aria-label={`${isPlaying ? "Pause" : "Play"} preview of ${song.title}`}
          title={
            song.previewUrl
              ? isPlaying
                ? "Pause preview"
                : "Play 30-second preview"
              : "Song not available, Sorry!"
          }
          className={`rounded px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isPlaying
              ? "bg-sky-400 text-neutral-950"
              : "text-sky-400 hover:bg-neutral-800 hover:text-sky-300"
          }`}
        >
          {isPlaying ? "Pause" : "Preview"}
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => onEdit(song)}
          className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
        >
          Edit
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => onDelete(song)}
          className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
        >
          Delete
        </button>

        <button
          type="button"
          disabled={isSaving}
          aria-label={`Move ${song.title}`}
          title="Drag to reorder"
          className="cursor-grab touch-none select-none rounded px-2 py-1 text-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-white active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
          {...attributes}
          {...listeners}
        >
          ☰
        </button>
      </div>
    </article>
  );
}

function SongPreviewPlayer({
  song,
  onStop,
}: {
  song: ChartSong;
  onStop: () => void;
}) {
  return (
    <aside className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-xl border border-sky-400/60 bg-neutral-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur">
      <AlbumArtwork
        src={song.artworkUrl}
        title={song.title}
        artist={song.artist}
        className="h-12 w-12 shrink-0 rounded-md object-cover"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {song.title}
        </p>

        <p className="truncate text-xs text-neutral-400">
          {song.artist}
        </p>

        <p className="mt-0.5 text-[10px] text-neutral-500">
          Preview provided courtesy of iTunes
        </p>
      </div>

      {song.trackUrl && (
        <a
          href={song.trackUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-lg px-3 py-2 text-xs font-medium text-sky-400 transition hover:bg-neutral-800 hover:text-sky-300 sm:block"
        >
          View on Apple Music
        </a>
      )}

      <button
        type="button"
        onClick={onStop}
        aria-label={`Stop preview of ${song.title}`}
        title="Stop preview"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400 font-semibold text-neutral-950 transition hover:bg-sky-300"
      >
        <span aria-hidden="true">■</span>
      </button>
    </aside>
  );
}

function OutsideDropZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: OUTSIDE_DROP_ID,
  });

  return (
    <div
      ref={setNodeRef}
      className={`my-6 rounded-xl border border-dashed px-4 py-3 text-center text-sm transition ${
        isOver
          ? "border-sky-400 bg-sky-400/10 text-sky-300"
          : "border-neutral-700 text-neutral-500"
      }`}
    >
      Drop here to move a song outside the Top 100
    </div>
  );
}

function EditSongModal({
  song,
  isSaving,
  onCancel,
  onSave,
}: EditSongModalProps) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [releaseYear, setReleaseYear] = useState(
    song.releaseYear ? String(song.releaseYear) : "",
  );
  const [artworkUrl, setArtworkUrl] = useState(
    song.artworkUrl ?? "",
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanedArtworkUrl = artworkUrl.trim();
    await onSave({
      ...song,
      title: title.trim(),
      artist: artist.trim(),
      releaseYear: releaseYear
        ? Number(releaseYear)
        : null,
      artworkUrl: cleanedArtworkUrl || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            Edit song
          </h2>

          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-neutral-400">
              Song title
            </span>

            <input
              required
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-neutral-400">
              Artist
            </span>

            <input
              required
              value={artist}
              onChange={(event) =>
                setArtist(event.target.value)
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-neutral-400">
              Release year
            </span>

            <input
              type="number"
              min="1900"
              max="2100"
              value={releaseYear}
              onChange={(event) =>
                setReleaseYear(event.target.value)
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-neutral-400">
              Artwork URL
            </span>

            <input
              type="url"
              value={artworkUrl}
              onChange={(event) =>
                setArtworkUrl(event.target.value)
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-sky-400"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="rounded-lg border border-neutral-700 px-5 py-3 font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              isSaving || !title.trim() || !artist.trim()
            }
            className="rounded-lg bg-sky-400 px-5 py-3 font-semibold text-neutral-950 transition hover:bg-sky-300 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SongChart({
  initialSongs,
}: SongChartProps) {
  const router = useRouter();

  const [hasMounted, setHasMounted] = useState(false);
  const [songs, setSongs] = useState(initialSongs);
  const [editingSong, setEditingSong] =
    useState<ChartSong | null>(null);
  const [deletingSong, setDeletingSong] =
    useState<ChartSong | null>(null);
  const [activeSong, setActiveSong] =
    useState<ChartSong | null>(null);
  const [playingSongId, setPlayingSongId] =
    useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setSongs(initialSongs);
  }, [initialSongs]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;

      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audioRef.current = null;
      }
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const chartSongs = songs.slice(0, TOP_100_SIZE);
  const outsideSongs = songs.slice(TOP_100_SIZE);
  const playingSong =
    songs.find((song) => song.id === playingSongId) ??
    null;

  function stopPreview() {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    }

    setPlayingSongId(null);
  }

  async function handleTogglePreview(song: ChartSong) {
    if (!song.previewUrl) {
      setPreviewError(
        `No audio preview is available for ${song.title}.`,
      );
      return;
    }

    if (playingSongId === song.id) {
      stopPreview();
      return;
    }

    stopPreview();
    setPreviewError("");

    const audio = new Audio(song.previewUrl);
audio.volume = PREVIEW_VOLUME;
audio.preload = "none";
audioRef.current = audio;

    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingSongId(null);
      }
    };

    audio.onerror = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingSongId(null);
        setPreviewError(
          `The preview for ${song.title} could not be played.`,
        );
      }
    };

    try {
      setPlayingSongId(song.id);
      await audio.play();
    } catch {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingSongId(null);
      }

      setPreviewError(
        `The preview for ${song.title} could not be started.`,
      );
    }
  }

  async function saveSongOrder(
    reorderedSongs: ChartSong[],
    previousSongs: ChartSong[],
  ) {
    setSongs(reorderedSongs);
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/songs",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderedIds: reorderedSongs.map(
              (song) => song.id,
            ),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to save chart order",
        );
      }

      router.refresh();
    } catch (error) {
      setSongs(previousSongs);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save chart order",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveSong(null);

    if (!over || isSaving) {
      return;
    }

    const oldIndex = songs.findIndex(
      (song) => song.id === active.id,
    );

    if (oldIndex === -1) {
      return;
    }

    let newIndex: number;

    if (over.id === OUTSIDE_DROP_ID) {
      if (songs.length <= TOP_100_SIZE) {
        return;
      }

      newIndex = TOP_100_SIZE;
    } else {
      newIndex = songs.findIndex(
        (song) => song.id === over.id,
      );
    }

    if (newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const previousSongs = songs;

    const reorderedSongs = arrayMove(
      songs,
      oldIndex,
      newIndex,
    ).map((song, index) => ({
      ...song,
      position: index + 1,
    }));

    await saveSongOrder(
      reorderedSongs,
      previousSongs,
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const draggedSong = songs.find(
      (song) => song.id === event.active.id,
    );

    setActiveSong(draggedSong ?? null);
  }

  function handleDragCancel() {
    setActiveSong(null);
  }

  async function handleSave(song: ChartSong) {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/songs/${song.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(song),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to update song",
        );
      }

      setSongs((currentSongs) =>
        currentSongs.map((currentSong) =>
          currentSong.id === song.id
            ? {
                ...currentSong,
                ...result,
              }
            : currentSong,
        ),
      );

      setEditingSong(null);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update song",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingSong) {
      return;
    }

    setError("");
    setIsSaving(true);

    if (playingSongId === deletingSong.id) {
      stopPreview();
    }

    try {
      const response = await fetch(
        `/api/songs/${deletingSong.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const result = await response.json();

        throw new Error(
          result.error || "Unable to delete song",
        );
      }

      setSongs((currentSongs) =>
        currentSongs
          .filter(
            (currentSong) =>
              currentSong.id !== deletingSong.id,
          )
          .map((currentSong, index) => ({
            ...currentSong,
            position: index + 1,
          })),
      );

      setDeletingSong(null);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete song",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!hasMounted) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-400">
        Loading chart…
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-700 p-12 text-center">
        <h2 className="text-xl font-semibold">
          Your chart is empty
        </h2>

        <p className="mt-2 text-neutral-400">
          Add your first song to begin building the chart.
        </p>
      </div>
    );
  }

  return (
    <>
      <section>
        <div className="mb-3 h-6">
          {isSaving && (
            <p className="text-sm text-neutral-400">
              Saving changes…
            </p>
          )}

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          {!error && previewError && (
            <p className="text-sm text-red-400">
              {previewError}
            </p>
          )}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={cursorCollisionDetection}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
  <SortableContext
    items={songs.map((song) => song.id)}
    strategy={stableSortingStrategy}
  >
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
      {chartSongs.map((song) => (
        <SongCard
          key={song.id}
          song={song}
          isSaving={isSaving}
          isPlaying={playingSongId === song.id}
          onTogglePreview={handleTogglePreview}
          onEdit={setEditingSong}
          onDelete={setDeletingSong}
        />
      ))}
    </div>

    {outsideSongs.length > 0 && (
      <>
        <OutsideDropZone />

        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Outside the chart
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Beyond the Top 100
            </h2>
          </div>

          <p className="text-sm text-neutral-500">
            {outsideSongs.length}{" "}
            {outsideSongs.length === 1
              ? "song"
              : "songs"}
          </p>
        </div>

        <div className="space-y-2">
          {outsideSongs.map((song) => (
            <SongListRow
              key={song.id}
              song={song}
              isSaving={isSaving}
              isPlaying={playingSongId === song.id}
              onTogglePreview={handleTogglePreview}
              onEdit={setEditingSong}
              onDelete={setDeletingSong}
            />
          ))}
        </div>
      </>
    )}
  </SortableContext>

  <DragOverlay
    dropAnimation={null}
    modifiers={[snapCenterToCursor]}
  >
    {activeSong ? (
      <SongDragPreview song={activeSong} />
    ) : null}
  </DragOverlay>
</DndContext>
      </section>

      {editingSong && (
        <EditSongModal
          key={editingSong.id}
          song={editingSong}
          isSaving={isSaving}
          onCancel={() => setEditingSong(null)}
          onSave={handleSave}
        />
      )}

      {deletingSong && (
        <ConfirmDeleteModal
          itemType="song"
          title={deletingSong.title}
          artist={deletingSong.artist}
          isDeleting={isSaving}
          onCancel={() => setDeletingSong(null)}
          onConfirm={handleConfirmDelete}
/>
      )}

      {playingSong && (
        <SongPreviewPlayer
          song={playingSong}
          onStop={stopPreview}
        />
      )}
    </>
  );
}
