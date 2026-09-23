import { AlbumArtwork } from "@/components/AlbumArtwork";
import { FilmPoster } from "@/components/FilmPoster";

const TOP_100_SIZE = 100;

export type ReadOnlyAlbum = {
  id: number;
  position: number;
  title: string;
  artist: string;
  releaseYear: number | null;
  artworkUrl: string | null;
};

export type ReadOnlyFilm = {
  id: number;
  position: number;
  title: string;
  director: string | null;
  releaseYear: number | null;
  posterUrl: string | null;
};

export type ReadOnlySong = {
  id: number;
  position: number;
  title: string;
  artist: string;
  releaseYear: number | null;
  artworkUrl: string | null;
  trackUrl: string | null;
};

type ReadOnlyChartProps =
  | {
      type: "albums";
      ownerName: string;
      items: ReadOnlyAlbum[];
    }
  | {
      type: "films";
      ownerName: string;
      items: ReadOnlyFilm[];
    }
  | {
      type: "songs";
      ownerName: string;
      items: ReadOnlySong[];
    };

function PositionBadge({ position }: { position: number }) {
  return (
    <div className="absolute left-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-neutral-950/90 px-2 text-sm font-bold text-sky-400 shadow-lg">
      {position}
    </div>
  );
}

function AlbumCard({ album }: { album: ReadOnlyAlbum }) {
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="relative aspect-square overflow-hidden bg-neutral-800">
        <AlbumArtwork
          src={album.artworkUrl}
          title={album.title}
          artist={album.artist}
          className="h-full w-full object-cover"
        />

        <PositionBadge position={album.position} />
      </div>

      <div className="p-3">
        <h3
          title={album.title}
          className="truncate text-sm font-semibold"
        >
          {album.title}
        </h3>

        <p
          title={album.artist}
          className="mt-1 truncate text-xs text-neutral-400"
        >
          {album.artist}
        </p>

        <p className="mt-2 text-xs text-neutral-500">
          {album.releaseYear ?? "—"}
        </p>
      </div>
    </article>
  );
}

function FilmCard({ film }: { film: ReadOnlyFilm }) {
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="relative aspect-[2/3] overflow-hidden bg-neutral-800">
        <FilmPoster
          src={film.posterUrl}
          title={film.title}
          director={film.director}
          className="h-full w-full object-cover"
        />

        <PositionBadge position={film.position} />
      </div>

      <div className="p-3">
        <h3
          title={film.title}
          className="truncate text-sm font-semibold"
        >
          {film.title}
        </h3>

        <p
          title={film.director ?? undefined}
          className="mt-1 truncate text-xs text-neutral-400"
        >
          {film.director ?? "Director unknown"}
        </p>

        <p className="mt-2 text-xs text-neutral-500">
          {film.releaseYear ?? "—"}
        </p>
      </div>
    </article>
  );
}

function SongCard({ song }: { song: ReadOnlySong }) {
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="relative aspect-square overflow-hidden bg-neutral-800">
        <AlbumArtwork
          src={song.artworkUrl}
          title={song.title}
          artist={song.artist}
          className="h-full w-full object-cover"
        />

        <PositionBadge position={song.position} />
      </div>

      <div className="p-3">
        <h3
          title={song.title}
          className="truncate text-sm font-semibold"
        >
          {song.trackUrl ? (
            <a
              href={song.trackUrl}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-sky-400"
            >
              {song.title}
            </a>
          ) : (
            song.title
          )}
        </h3>

        <p
          title={song.artist}
          className="mt-1 truncate text-xs text-neutral-400"
        >
          {song.artist}
        </p>

        <p className="mt-2 text-xs text-neutral-500">
          {song.releaseYear ?? "—"}
        </p>
      </div>
    </article>
  );
}

type ChartGridProps =
  | {
      type: "albums";
      items: ReadOnlyAlbum[];
    }
  | {
      type: "films";
      items: ReadOnlyFilm[];
    }
  | {
      type: "songs";
      items: ReadOnlySong[];
    };

function ChartGrid(props: ChartGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
      {props.type === "albums" &&
        props.items.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}

      {props.type === "films" &&
        props.items.map((film) => (
          <FilmCard key={film.id} film={film} />
        ))}

      {props.type === "songs" &&
        props.items.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
    </div>
  );
}

export function ReadOnlyChart(props: ReadOnlyChartProps) {
  const singular = props.type.slice(0, -1);

  if (props.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-700 p-12 text-center">
        <h2 className="text-xl font-semibold">
          This chart is empty
        </h2>

        <p className="mt-2 text-neutral-400">
          {props.ownerName} has not ranked any {props.type}
          yet.
        </p>
      </div>
    );
  }

  let rankedGrid;
  let outsideGrid;
  let outsideCount: number;

  if (props.type === "albums") {
    const rankedItems = props.items.slice(0, TOP_100_SIZE);
    const outsideItems = props.items.slice(TOP_100_SIZE);

    rankedGrid = (
      <ChartGrid type="albums" items={rankedItems} />
    );
    outsideGrid = (
      <ChartGrid type="albums" items={outsideItems} />
    );
    outsideCount = outsideItems.length;
  } else if (props.type === "films") {
    const rankedItems = props.items.slice(0, TOP_100_SIZE);
    const outsideItems = props.items.slice(TOP_100_SIZE);

    rankedGrid = (
      <ChartGrid type="films" items={rankedItems} />
    );
    outsideGrid = (
      <ChartGrid type="films" items={outsideItems} />
    );
    outsideCount = outsideItems.length;
  } else {
    const rankedItems = props.items.slice(0, TOP_100_SIZE);
    const outsideItems = props.items.slice(TOP_100_SIZE);

    rankedGrid = (
      <ChartGrid type="songs" items={rankedItems} />
    );
    outsideGrid = (
      <ChartGrid type="songs" items={outsideItems} />
    );
    outsideCount = outsideItems.length;
  }

  return (
    <section>
      {rankedGrid}

      {outsideCount > 0 && (
        <div className="mt-12 border-t border-neutral-800 pt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Outside the chart
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Beyond the Top 100
              </h2>
            </div>

            <p className="text-sm text-neutral-500">
              {outsideCount} {singular}
              {outsideCount === 1 ? "" : "s"}
            </p>
          </div>

          {outsideGrid}
        </div>
      )}
    </section>
  );
}
