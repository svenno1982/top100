"use client";

import { FormEvent, useEffect, useState } from "react";
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
import { AlbumTrackTooltip } from "@/components/AlbumTrackTooltip";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

const TOP_100_SIZE = 100;
const OUTSIDE_DROP_ID = "outside-top-100";

const cursorCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  return pointerCollisions.length > 0
    ? pointerCollisions
    : closestCenter(args);
};

const stableSortingStrategy = () => null;

export type ChartAlbum = {
  id: number;
  position: number;
  title: string;
  artist: string;
  releaseYear: number | null;
  artworkUrl: string | null;
  artworkSource: string | null;
  musicBrainzId: string | null;
};

type AlbumChartProps = {
  initialAlbums: ChartAlbum[];
};

type AlbumItemProps = {
  album: ChartAlbum;
  isSaving: boolean;
  onEdit: (album: ChartAlbum) => void;
  onDelete: (album: ChartAlbum) => void;
};

type EditAlbumModalProps = {
  album: ChartAlbum;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (album: ChartAlbum) => Promise<void>;
};

function AlbumDragPreview({ album }: { album: ChartAlbum }) {
  return (
    <article className="w-36 overflow-hidden rounded-xl border border-sky-400 bg-neutral-900 shadow-2xl shadow-black/60">
      <div className="relative aspect-square overflow-hidden bg-neutral-800">
        <AlbumArtwork
          src={album.artworkUrl}
          title={album.title}
          artist={album.artist}
          className="h-full w-full object-cover"
        />

        <div className="absolute left-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-neutral-950/90 px-2 text-sm font-bold text--sky-400 shadow-lg">
          {album.position}
        </div>
      </div>
    </article>
  );
}

function AlbumCard({
  album,
  isSaving,
  onEdit,
  onDelete,
}: AlbumItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: album.id,
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
      <AlbumTrackTooltip
        albumId={album.id}
        albumTitle={album.title}
        hasMusicBrainzId={Boolean(
          album.musicBrainzId,
        )}
        disabled={isSaving || isDragging}
      >
        <div className="relative aspect-square overflow-hidden bg-neutral-800">
          <AlbumArtwork
            src={album.artworkUrl}
            title={album.title}
            artist={album.artist}
            className="h-full w-full object-cover"
          />

          <div className="absolute left-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-neutral-950/90 px-2 text-sm font-bold text-sky-400 shadow-lg">
            {album.position}
          </div>

          <button
            type="button"
            disabled={isSaving}
            aria-label={`Move ${album.title}`}
            title="Drag to reorder"
            className="absolute right-2 top-2 cursor-grab touch-none select-none rounded-lg bg-neutral-950/90 px-2 py-1 text-lg text-neutral-300 shadow-lg transition hover:text-white active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
            {...attributes}
            {...listeners}
          >
            ☰
          </button>
        </div>

        <div className="p-3">
          <h2
            title={album.title}
            className="truncate text-sm font-semibold"
          >
            {album.title}
          </h2>

          <p
            title={album.artist}
            className="mt-1 truncate text-xs text-neutral-400"
          >
            {album.artist}
          </p>

          <div className="mt-2 flex min-h-7 items-center justify-between gap-1">
            <span className="text-xs text-neutral-500">
              {album.releaseYear ?? "—"}
            </span>

            <div className="flex">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onEdit(album)}
                className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
              >
                Edit
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => onDelete(album)}
                className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </AlbumTrackTooltip>
    </article>
  );
}

function AlbumListRow({
  album,
  isSaving,
  onEdit,
  onDelete,
}: AlbumItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: album.id,
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
        {album.position}
      </div>

      <div className="min-w-0">
        <p
          title={album.title}
          className="truncate text-sm font-semibold"
        >
          {album.title}
        </p>

        <p className="truncate text-xs text-neutral-400 sm:hidden">
          {album.artist}
        </p>
      </div>

      <p
        title={album.artist}
        className="hidden truncate text-sm text-neutral-400 sm:block"
      >
        {album.artist}
      </p>

      <p className="hidden text-sm text-neutral-500 sm:block">
        {album.releaseYear ?? "—"}
      </p>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onEdit(album)}
          className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
        >
          Edit
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => onDelete(album)}
          className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
        >
          Delete
        </button>

        <button
          type="button"
          disabled={isSaving}
          aria-label={`Move ${album.title}`}
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

function OutsideDropZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: OUTSIDE_DROP_ID,
  });

  return (
    <div
      ref={setNodeRef}
      className={`my-6 rounded-xl border border-dashed px-4 py-3 text-center text-sm transition ${
        isOver
          ? "border-sky-400 bg-sky-400/10 text--sky-400"
          : "border-neutral-700 text-neutral-500"
      }`}
    >
      Drop here to move an album outside the Top 100
    </div>
  );
}

function EditAlbumModal({
  album,
  isSaving,
  onCancel,
  onSave,
}: EditAlbumModalProps) {
  const [title, setTitle] = useState(album.title);
  const [artist, setArtist] = useState(album.artist);
  const [releaseYear, setReleaseYear] = useState(
    album.releaseYear ? String(album.releaseYear) : "",
  );
  const [artworkUrl, setArtworkUrl] = useState(
    album.artworkUrl ?? "",
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanedArtworkUrl = artworkUrl.trim();
    const artworkChanged =
      cleanedArtworkUrl !== (album.artworkUrl ?? "");

    await onSave({
      ...album,
      title: title.trim(),
      artist: artist.trim(),
      releaseYear: releaseYear
        ? Number(releaseYear)
        : null,
      artworkUrl: cleanedArtworkUrl || null,
      artworkSource: artworkChanged
        ? cleanedArtworkUrl
          ? "manual"
          : null
        : album.artworkSource,
      musicBrainzId: artworkChanged
        ? null
        : album.musicBrainzId,
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
            Edit album
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
              Album title
            </span>

            <input
              required
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border--sky-400"
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
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border--sky-400"
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
            className="rounded-lg bg-sky-400 px-5 py-3 font-semibold text-neutral-950 transition hover:bg-sky-400 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AlbumChart({
  initialAlbums,
}: AlbumChartProps) {
  const router = useRouter();

  const [hasMounted, setHasMounted] = useState(false);
  const [albums, setAlbums] = useState(initialAlbums);
  const [editingAlbum, setEditingAlbum] =
    useState<ChartAlbum | null>(null);
  const [deletingAlbum, setDeletingAlbum] =
    useState<ChartAlbum | null>(null);
  const [activeAlbum, setActiveAlbum] =
    useState<ChartAlbum | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

    useEffect(() => {
    const animationFrame =
      window.requestAnimationFrame(() => {
        setHasMounted(true);
      });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const animationFrame =
      window.requestAnimationFrame(() => {
        setAlbums(initialAlbums);
      });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [initialAlbums]);

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

  const chartAlbums = albums.slice(0, TOP_100_SIZE);
  const outsideAlbums = albums.slice(TOP_100_SIZE);

  async function saveAlbumOrder(
    reorderedAlbums: ChartAlbum[],
    previousAlbums: ChartAlbum[],
  ) {
    setAlbums(reorderedAlbums);
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/albums",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderedIds: reorderedAlbums.map(
              (album) => album.id,
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
      setAlbums(previousAlbums);

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

    setActiveAlbum(null);

    if (!over || isSaving) {
      return;
    }

    const oldIndex = albums.findIndex(
      (album) => album.id === active.id,
    );

    if (oldIndex === -1) {
      return;
    }

    let newIndex: number;

    if (over.id === OUTSIDE_DROP_ID) {
      if (albums.length <= TOP_100_SIZE) {
        return;
      }

      newIndex = TOP_100_SIZE;
    } else {
      newIndex = albums.findIndex(
        (album) => album.id === over.id,
      );
    }

    if (newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const previousAlbums = albums;

    const reorderedAlbums = arrayMove(
      albums,
      oldIndex,
      newIndex,
    ).map((album, index) => ({
      ...album,
      position: index + 1,
    }));

    await saveAlbumOrder(
      reorderedAlbums,
      previousAlbums,
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const draggedAlbum = albums.find(
      (album) => album.id === event.active.id,
    );

    setActiveAlbum(draggedAlbum ?? null);
  }

  function handleDragCancel() {
    setActiveAlbum(null);
  }

  async function handleSave(album: ChartAlbum) {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/albums/${album.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(album),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to update album",
        );
      }

      setAlbums((currentAlbums) =>
        currentAlbums.map((currentAlbum) =>
          currentAlbum.id === album.id
            ? {
                ...currentAlbum,
                ...result,
              }
            : currentAlbum,
        ),
      );

      setEditingAlbum(null);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update album",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingAlbum) {
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/albums/${deletingAlbum.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const result = await response.json();

        throw new Error(
          result.error || "Unable to delete album",
        );
      }

      setAlbums((currentAlbums) =>
        currentAlbums
          .filter(
            (currentAlbum) =>
              currentAlbum.id !== deletingAlbum.id,
          )
          .map((currentAlbum, index) => ({
            ...currentAlbum,
            position: index + 1,
          })),
      );

      setDeletingAlbum(null);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete album",
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

  if (albums.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-700 p-12 text-center">
        <h2 className="text-xl font-semibold">
          Your chart is empty
        </h2>

        <p className="mt-2 text-neutral-400">
          Add your first album to begin building the chart.
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
        </div>
                <p className="mb-3 text-center text-xs text-neutral-500 sm:hidden">
          Tap an album cover to view its track listing.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={cursorCollisionDetection}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
  <SortableContext
    items={albums.map((album) => album.id)}
    strategy={stableSortingStrategy}
  >
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
      {chartAlbums.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          isSaving={isSaving}
          onEdit={setEditingAlbum}
          onDelete={setDeletingAlbum}
        />
      ))}
    </div>

    {outsideAlbums.length > 0 && (
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
            {outsideAlbums.length}{" "}
            {outsideAlbums.length === 1
              ? "album"
              : "albums"}
          </p>
        </div>

        <div className="space-y-2">
          {outsideAlbums.map((album) => (
            <AlbumListRow
              key={album.id}
              album={album}
              isSaving={isSaving}
              onEdit={setEditingAlbum}
              onDelete={setDeletingAlbum}
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
    {activeAlbum ? (
      <AlbumDragPreview album={activeAlbum} />
    ) : null}
  </DragOverlay>
</DndContext>
      </section>

      {editingAlbum && (
        <EditAlbumModal
          key={editingAlbum.id}
          album={editingAlbum}
          isSaving={isSaving}
          onCancel={() => setEditingAlbum(null)}
          onSave={handleSave}
        />
      )}

      {deletingAlbum && (
        <ConfirmDeleteModal
          title={deletingAlbum.title}
          artist={deletingAlbum.artist}
          isDeleting={isSaving}
          onCancel={() => setDeletingAlbum(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}
