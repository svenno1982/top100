import { NextRequest, NextResponse } from "next/server";
import { requireApprovedApiUser } from "@/lib/auth-access";

type MusicBrainzArtist = {
  name: string;
  joinphrase?: string;
};

type MusicBrainzReleaseGroup = {
  id: string;
  title: string;
  "first-release-date"?: string;
  "primary-type"?: string;
  "artist-credit"?: MusicBrainzArtist[];
};

type MusicBrainzResponse = {
  "release-groups"?: MusicBrainzReleaseGroup[];
};

export async function GET(request: NextRequest) {
    const access = await requireApprovedApiUser();

  if (access.response) {
    return access.response;
  }
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const searchQuery = `${query} AND primarytype:album`;

    const url = new URL(
      "https://musicbrainz.org/ws/2/release-group/",
    );

    url.searchParams.set("query", searchQuery);
    url.searchParams.set("fmt", "json");
    url.searchParams.set("limit", "10");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          process.env.MUSICBRAINZ_USER_AGENT ??
          "Top100Albums/1.0",
      },
      next: {
        revalidate: 3600,
      },
    });

    if (!response.ok) {
      throw new Error(
        `MusicBrainz returned HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as MusicBrainzResponse;

    const results = (data["release-groups"] ?? []).map(
      (releaseGroup) => {
        const artist =
          releaseGroup["artist-credit"]
            ?.map(
              (credit) =>
                `${credit.name}${credit.joinphrase ?? ""}`,
            )
            .join("") ?? "Unknown artist";

        const releaseDate =
          releaseGroup["first-release-date"] ?? "";

        return {
          musicBrainzId: releaseGroup.id,
          title: releaseGroup.title,
          artist,
          releaseYear: releaseDate
            ? Number(releaseDate.slice(0, 4))
            : null,
          artworkUrl:
            `https://coverartarchive.org/release-group/` +
            `${releaseGroup.id}/front-250`,
          artworkSource: "cover-art-archive",
        };
      },
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("MusicBrainz search failed:", error);

    return NextResponse.json(
      {
        error: "Unable to search MusicBrainz",
      },
      {
        status: 502,
      },
    );
  }
}
