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
import { FilmPoster } from "@/components/FilmPoster";
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

export type ChartFilm = {
  id: number;
  position: number;
  title: string;
  director: string | null;
  releaseYear: number | null;
  posterUrl: string | null;
  tmdbId: number | null;
};

type FilmChartProps = {
  initialFilms: ChartFilm[];
};

type FilmItemProps = {
  film: ChartFilm;
  isSaving: boolean;
  onEdit: (film: ChartFilm) => void;
  onDelete: (film: ChartFilm) => void;
};

type EditFilmModalProps = {
  film: ChartFilm;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (film: ChartFilm) => Promise<void>;
};

function FilmDragPreview({ film }: { film: ChartFilm }) {
  return (
    <article className="w-36 overflow-hidden rounded-xl border border-sky-400 bg-neutral-900 shadow-2xl shadow-black/60">
      <div className="relative aspect-[2/3] overflow-hidden bg-neutral-800">
        <FilmPoster
          src={film.posterUrl}
          title={film.title}
          director={film.director}
          className="h-full w-full object-cover"
        />

        <div className="absolute left-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-neutral-950/90 px-2 text-sm font-bold text-sky-400 shadow-lg">
          {film.position}
        </div>
      </div>
    </article>
  );
}

function FilmCard({
  film,
  isSaving,
  onEdit,
  onDelete,
}: FilmItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: film.id,
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
      <div className="relative aspect-[2/3] overflow-hidden bg-neutral-800">
        <FilmPoster
          src={film.posterUrl}
          title={film.title}
          director={film.director}
          className="h-full w-full object-cover"
        />

        <div className="absolute left-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-neutral-950/90 px-2 text-sm font-bold text-sky-400 shadow-lg">
          {film.position}
        </div>

        <button
          type="button"
          disabled={isSaving}
          aria-label={`Move ${film.title}`}
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
          title={film.title}
          className="truncate text-sm font-semibold"
        >
          {film.title}
        </h2>

        <p
          title={film.director ?? ""}
          className="mt-1 truncate text-xs text-neutral-400"
        >
          {film.director ?? "Director unavailable"}
        </p>

        <div className="mt-2 flex min-h-7 items-center justify-between gap-1">
          <span className="text-xs text-neutral-500">
            {film.releaseYear ?? "—"}
          </span>

          <div className="flex">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onEdit(film)}
              className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
            >
              Edit
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => onDelete(film)}
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

function FilmListRow({
  film,
  isSaving,
  onEdit,
  onDelete,
}: FilmItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: film.id,
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
        {film.position}
      </div>

      <div className="min-w-0">
        <p
          title={film.title}
          className="truncate text-sm font-semibold"
        >
          {film.title}
        </p>

        <p className="truncate text-xs text-neutral-400 sm:hidden">
          {film.director ?? "Director unavailable"}
        </p>
      </div>

      <p
        title={film.director ?? ""}
        className="hidden truncate text-sm text-neutral-400 sm:block"
      >
        {film.director ?? "Director unavailable"}
      </p>

      <p className="hidden text-sm text-neutral-500 sm:block">
        {film.releaseYear ?? "—"}
      </p>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onEdit(film)}
          className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
        >
          Edit
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => onDelete(film)}
          className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
        >
          Delete
        </button>

        <button
          type="button"
          disabled={isSaving}
          aria-label={`Move ${film.title}`}
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
          ? "border-sky-400 bg-sky-400/10 text-sky-300"
          : "border-neutral-700 text-neutral-500"
      }`}
    >
      Drop here to move a film outside the Top 100
    </div>
  );
}

function EditFilmModal({
  film,
  isSaving,
  onCancel,
  onSave,
}: EditFilmModalProps) {
  const [title, setTitle] = useState(film.title);
  const [director, setDirector] = useState(
    film.director ?? "",
  );
  const [releaseYear, setReleaseYear] = useState(
    film.releaseYear ? String(film.releaseYear) : "",
  );
  const [posterUrl, setPosterUrl] = useState(
    film.posterUrl ?? "",
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanedPosterUrl = posterUrl.trim();

    await onSave({
      ...film,
      title: title.trim(),
      director: director.trim() || null,
      releaseYear: releaseYear
        ? Number(releaseYear)
        : null,
      posterUrl: cleanedPosterUrl || null,
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
            Edit film
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
              Film title
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
              Director
            </span>

            <input
              required
              value={director}
              onChange={(event) =>
                setDirector(event.target.value)
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
              Poster URL
            </span>

            <input
              type="url"
              value={posterUrl}
              onChange={(event) =>
                setPosterUrl(event.target.value)
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
              isSaving || !title.trim()
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

export function FilmChart({
  initialFilms,
}: FilmChartProps) {
  const router = useRouter();

  const [hasMounted, setHasMounted] = useState(false);
  const [films, setFilms] = useState(initialFilms);
  const [editingFilm, setEditingFilm] =
    useState<ChartFilm | null>(null);
  const [deletingFilm, setDeletingFilm] =
    useState<ChartFilm | null>(null);
  const [activeFilm, setActiveFilm] =
    useState<ChartFilm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setFilms(initialFilms);
  }, [initialFilms]);

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

  const chartFilms = films.slice(0, TOP_100_SIZE);
  const outsideFilms = films.slice(TOP_100_SIZE);

  async function saveFilmOrder(
    reorderedFilms: ChartFilm[],
    previousFilms: ChartFilm[],
  ) {
    setFilms(reorderedFilms);
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/films",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderedIds: reorderedFilms.map(
              (film) => film.id,
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
      setFilms(previousFilms);

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

    setActiveFilm(null);

    if (!over || isSaving) {
      return;
    }

    const oldIndex = films.findIndex(
      (film) => film.id === active.id,
    );

    if (oldIndex === -1) {
      return;
    }

    let newIndex: number;

    if (over.id === OUTSIDE_DROP_ID) {
      if (films.length <= TOP_100_SIZE) {
        return;
      }

      newIndex = TOP_100_SIZE;
    } else {
      newIndex = films.findIndex(
        (film) => film.id === over.id,
      );
    }

    if (newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const previousFilms = films;

    const reorderedFilms = arrayMove(
      films,
      oldIndex,
      newIndex,
    ).map((film, index) => ({
      ...film,
      position: index + 1,
    }));

    await saveFilmOrder(
      reorderedFilms,
      previousFilms,
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const draggedFilm = films.find(
      (film) => film.id === event.active.id,
    );

    setActiveFilm(draggedFilm ?? null);
  }

  function handleDragCancel() {
    setActiveFilm(null);
  }

  async function handleSave(film: ChartFilm) {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/films/${film.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(film),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to update film",
        );
      }

      setFilms((currentFilms) =>
        currentFilms.map((currentFilm) =>
          currentFilm.id === film.id
            ? {
                ...currentFilm,
                ...result,
              }
            : currentFilm,
        ),
      );

      setEditingFilm(null);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update film",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingFilm) {
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/films/${deletingFilm.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const result = await response.json();

        throw new Error(
          result.error || "Unable to delete film",
        );
      }

      setFilms((currentFilms) =>
        currentFilms
          .filter(
            (currentFilm) =>
              currentFilm.id !== deletingFilm.id,
          )
          .map((currentFilm, index) => ({
            ...currentFilm,
            position: index + 1,
          })),
      );

      setDeletingFilm(null);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete film",
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

  if (films.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-700 p-12 text-center">
        <h2 className="text-xl font-semibold">
          Your chart is empty
        </h2>

        <p className="mt-2 text-neutral-400">
          Add your first film to begin building the chart.
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

        <DndContext
          sensors={sensors}
          collisionDetection={cursorCollisionDetection}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
  <SortableContext
    items={films.map((film) => film.id)}
    strategy={stableSortingStrategy}
  >
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
      {chartFilms.map((film) => (
        <FilmCard
          key={film.id}
          film={film}
          isSaving={isSaving}
          onEdit={setEditingFilm}
          onDelete={setDeletingFilm}
        />
      ))}
    </div>

    {outsideFilms.length > 0 && (
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
            {outsideFilms.length}{" "}
            {outsideFilms.length === 1
              ? "film"
              : "films"}
          </p>
        </div>

        <div className="space-y-2">
          {outsideFilms.map((film) => (
            <FilmListRow
              key={film.id}
              film={film}
              isSaving={isSaving}
              onEdit={setEditingFilm}
              onDelete={setDeletingFilm}
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
    {activeFilm ? (
      <FilmDragPreview film={activeFilm} />
    ) : null}
  </DragOverlay>
</DndContext>
      </section>

      {editingFilm && (
        <EditFilmModal
          key={editingFilm.id}
          film={editingFilm}
          isSaving={isSaving}
          onCancel={() => setEditingFilm(null)}
          onSave={handleSave}
        />
      )}

      {deletingFilm && (
        <ConfirmDeleteModal
          title={deletingFilm.title}
          artist={
            deletingFilm.director ??
            "Director unavailable"
          }
          isDeleting={isSaving}
          onCancel={() => setDeletingFilm(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}
