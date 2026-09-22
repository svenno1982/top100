const MUSICBRAINZ_API_ROOT =
  "https://musicbrainz.org/ws/2";

const MINIMUM_REQUEST_INTERVAL_MS = 1100;

let requestQueue: Promise<void> = Promise.resolve();
let lastRequestStartedAt = 0;

type MusicBrainzTrack = {
  position?: number;
  number?: string;
  title?: string;
  length?: number | null;
  recording?: {
    title?: string;
  };
};

type MusicBrainzMedium = {
  position?: number;
  tracks?: MusicBrainzTrack[];
};

type MusicBrainzRelease = {
  id: string;
  date?: string;
  status?: string;
  media?: MusicBrainzMedium[];
};

type MusicBrainzReleaseResponse = {
  releases?: MusicBrainzRelease[];
};

export type TracklistTrack = {
  discNumber: number;
  position: number;
  trackNumber: string;
  title: string;
  lengthMs: number | null;
};

export type MusicBrainzTracklist = {
  releaseId: string;
  tracks: TracklistTrack[];
};

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function fetchMusicBrainzJson<T>(
  url: URL,
): Promise<T> {
  let resolveRequest!: (value: T) => void;
  let rejectRequest!: (reason: unknown) => void;

  const result = new Promise<T>((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });

  requestQueue = requestQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        const elapsed =
          Date.now() - lastRequestStartedAt;

        if (elapsed < MINIMUM_REQUEST_INTERVAL_MS) {
          await wait(
            MINIMUM_REQUEST_INTERVAL_MS - elapsed,
          );
        }

        lastRequestStartedAt = Date.now();

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              process.env.MUSICBRAINZ_USER_AGENT ??
              "Top100Albums/1.0",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `MusicBrainz returned HTTP ${response.status}`,
          );
        }

        resolveRequest((await response.json()) as T);
      } catch (error) {
        rejectRequest(error);
      }
    });

  return result;
}

function hasTracks(release: MusicBrainzRelease) {
  return (
    release.media?.some(
      (medium) => (medium.tracks?.length ?? 0) > 0,
    ) ?? false
  );
}

function totalTrackCount(release: MusicBrainzRelease) {
  return (
    release.media?.reduce(
      (total, medium) =>
        total + (medium.tracks?.length ?? 0),
      0,
    ) ?? 0
  );
}

function compareReleases(
  first: MusicBrainzRelease,
  second: MusicBrainzRelease,
) {
  const firstDate = first.date || "9999-99-99";
  const secondDate = second.date || "9999-99-99";

  const dateComparison =
    firstDate.localeCompare(secondDate);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return (
    totalTrackCount(first) -
    totalTrackCount(second)
  );
}

async function fetchReleases(
  releaseGroupId: string,
  officialOnly: boolean,
) {
  const url = new URL(
    `${MUSICBRAINZ_API_ROOT}/release`,
  );

  url.searchParams.set(
    "release-group",
    releaseGroupId,
  );
  url.searchParams.set("inc", "recordings");
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "100");

  if (officialOnly) {
    url.searchParams.set("status", "official");
  }

  const data =
    await fetchMusicBrainzJson<MusicBrainzReleaseResponse>(
      url,
    );

  return (data.releases ?? []).filter(hasTracks);
}

export async function fetchAlbumTracklist(
  releaseGroupId: string,
): Promise<MusicBrainzTracklist> {
  let releases = await fetchReleases(
    releaseGroupId,
    true,
  );

  if (releases.length === 0) {
    releases = await fetchReleases(
      releaseGroupId,
      false,
    );
  }

  const selectedRelease = [...releases].sort(
    compareReleases,
  )[0];

  if (!selectedRelease) {
    throw new Error(
      "No MusicBrainz release with a track listing was found",
    );
  }

  const tracks =
    selectedRelease.media?.flatMap(
      (medium, mediumIndex) => {
        const discNumber =
          medium.position ?? mediumIndex + 1;

        return (medium.tracks ?? []).flatMap(
          (track, trackIndex) => {
            const position =
              track.position ?? trackIndex + 1;

            const title = (
              track.title ??
              track.recording?.title ??
              ""
            ).trim();

            if (!title) {
              return [];
            }

            return [
              {
                discNumber,
                position,
                trackNumber:
                  track.number?.trim() ||
                  String(position),
                title,
                lengthMs:
                  typeof track.length === "number"
                    ? track.length
                    : null,
              },
            ];
          },
        );
      },
    ) ?? [];

  if (tracks.length === 0) {
    throw new Error(
      "The selected MusicBrainz release has no tracks",
    );
  }

  return {
    releaseId: selectedRelease.id,
    tracks,
  };
}