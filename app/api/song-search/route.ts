import { NextRequest, NextResponse } from "next/server";

type AppleSong = {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  releaseDate?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
};

type AppleSearchResponse = {
  resultCount?: number;
  results?: AppleSong[];
};

function getReleaseYear(releaseDate?: string) {
  if (!releaseDate) {
    return null;
  }

  const year = Number(releaseDate.slice(0, 4));

  return Number.isInteger(year) &&
    year >= 1800 &&
    year <= 2100
    ? year
    : null;
}

function getLargerArtworkUrl(
  artworkUrl?: string,
) {
  if (!artworkUrl) {
    return "";
  }

  return artworkUrl
    .replace("100x100bb", "600x600bb")
    .replace("100x100-75", "600x600-75");
}

function createResultKey(song: AppleSong) {
  return `${song.trackName ?? ""}::${
    song.artistName ?? ""
  }`
    .trim()
    .toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const searchParameters = new URLSearchParams({
      term: query,
      country: "GB",
      media: "music",
      entity: "song",
      limit: "25",
      explicit: "Yes",
    });

    const response = await fetch(
      `https://itunes.apple.com/search?${searchParameters.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "MyTop100/1.0 (https://rkrp.co.uk/top100)",
        },
        next: {
          revalidate: 3600,
        },
      },
    );

    if (!response.ok) {
      console.error(
        "Apple song search failed:",
        response.status,
        response.statusText,
      );

      return NextResponse.json(
        { error: "Unable to search for songs" },
        { status: 502 },
      );
    }

    const data =
      (await response.json()) as AppleSearchResponse;

    const uniqueSongs = new Map<string, AppleSong>();

    for (const song of data.results ?? []) {
      if (
        song.wrapperType !== "track" ||
        song.kind !== "song" ||
        !song.trackId ||
        !song.trackName ||
        !song.artistName
      ) {
        continue;
      }

      const resultKey = createResultKey(song);

      if (!uniqueSongs.has(resultKey)) {
        uniqueSongs.set(resultKey, song);
      }
    }

    const results = Array.from(
      uniqueSongs.values(),
    )
      .slice(0, 15)
      .map((song) => ({
        appleTrackId: String(song.trackId),
        title: song.trackName,
        artist: song.artistName,
        albumTitle: song.collectionName ?? null,
        releaseYear: getReleaseYear(
          song.releaseDate,
        ),
        artworkUrl: getLargerArtworkUrl(
          song.artworkUrl100,
        ),
        trackUrl: song.trackViewUrl ?? null,
      }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Unable to search for songs:", error);

    return NextResponse.json(
      { error: "Unable to search for songs" },
      { status: 500 },
    );
  }
}