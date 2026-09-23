import { NextRequest, NextResponse } from "next/server";
import { requireApprovedApiUser } from "@/lib/auth-access";

type TmdbMovie = {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  poster_path?: string | null;
};

type TmdbSearchResponse = {
  results?: TmdbMovie[];
};

type TmdbCrewMember = {
  job?: string;
  name?: string;
};

type TmdbCreditsResponse = {
  crew?: TmdbCrewMember[];
};

const TMDB_API_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";

function getTmdbHeaders(token: string) {
  return {
    accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function getReleaseYear(releaseDate?: string) {
  if (!releaseDate) {
    return null;
  }

  const year = Number(releaseDate.slice(0, 4));

  return Number.isInteger(year) && year > 1800
    ? year
    : null;
}

async function getDirector(
  tmdbId: number,
  token: string,
) {
  try {
    const response = await fetch(
      `${TMDB_API_URL}/movie/${tmdbId}/credits?language=en-GB`,
      {
        headers: getTmdbHeaders(token),
        next: {
          revalidate: 86400,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const credits =
      (await response.json()) as TmdbCreditsResponse;

    const director = credits.crew?.find(
      (person) => person.job === "Director",
    );

    return director?.name ?? null;
  } catch (error) {
    console.error(
      `Unable to retrieve director for TMDB film ${tmdbId}:`,
      error,
    );

    return null;
  }
}

export async function GET(request: NextRequest) {
    const access = await requireApprovedApiUser();

  if (access.response) {
    return access.response;
  }
  const query =
    request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  const token = process.env.TMDB_READ_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "TMDB is not configured" },
      { status: 500 },
    );
  }

  try {
    const searchUrl = new URL(
      `${TMDB_API_URL}/search/movie`,
    );

    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("include_adult", "false");
    searchUrl.searchParams.set("language", "en-GB");
    searchUrl.searchParams.set("page", "1");

    const response = await fetch(searchUrl, {
      headers: getTmdbHeaders(token),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        "TMDB search failed:",
        response.status,
        await response.text(),
      );

      return NextResponse.json(
        { error: "Unable to search for films" },
        { status: 502 },
      );
    }

    const data =
      (await response.json()) as TmdbSearchResponse;

    const films = await Promise.all(
      (data.results ?? []).slice(0, 12).map(
        async (film) => {
          const director = await getDirector(
            film.id,
            token,
          );

          return {
            tmdbId: film.id,
            title: film.title,
            originalTitle: film.original_title,
            director,
            releaseYear: getReleaseYear(
              film.release_date,
            ),
            posterUrl: film.poster_path
              ? `${TMDB_IMAGE_URL}${film.poster_path}`
              : "",
          };
        },
      ),
    );

    return NextResponse.json(films);
  } catch (error) {
    console.error("Unable to search TMDB:", error);

    return NextResponse.json(
      { error: "Unable to search for films" },
      { status: 500 },
    );
  }
}