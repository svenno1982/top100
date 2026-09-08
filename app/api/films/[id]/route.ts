import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type FilmRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseFilmId(value: string) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseReleaseYear(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const year = Number(value);

  if (
    !Number.isInteger(year) ||
    year < 1800 ||
    year > 2100
  ) {
    return null;
  }

  return year;
}

function parseTmdbId(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const tmdbId = Number(value);

  return Number.isInteger(tmdbId) && tmdbId > 0
    ? tmdbId
    : null;
}

export async function PATCH(
  request: NextRequest,
  context: FilmRouteContext,
) {
  try {
    const { id: idValue } = await context.params;
    const id = parseFilmId(idValue);

    if (id === null) {
      return NextResponse.json(
        { error: "A valid film ID is required" },
        { status: 400 },
      );
    }

    const existingFilm = await prisma.film.findUnique({
      where: {
        id,
      },
    });

    if (!existingFilm) {
      return NextResponse.json(
        { error: "Film not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json(
        { error: "Film title is required" },
        { status: 400 },
      );
    }

    const tmdbId = parseTmdbId(body.tmdbId);

    if (
      tmdbId !== null &&
      tmdbId !== existingFilm.tmdbId
    ) {
      const duplicateFilm =
        await prisma.film.findUnique({
          where: {
            tmdbId,
          },
        });

      if (duplicateFilm) {
        return NextResponse.json(
          {
            error:
              "Another film in the chart already uses this TMDB entry",
          },
          { status: 409 },
        );
      }
    }

    const film = await prisma.film.update({
      where: {
        id,
      },
      data: {
        title,
        director: body.director?.trim() || null,
        releaseYear: parseReleaseYear(
          body.releaseYear,
        ),
        posterUrl: body.posterUrl?.trim() || null,
        tmdbId,
      },
    });

    return NextResponse.json(film);
  } catch (error) {
    console.error("Unable to update film:", error);

    return NextResponse.json(
      { error: "Unable to update film" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: FilmRouteContext,
) {
  try {
    const { id: idValue } = await context.params;
    const id = parseFilmId(idValue);

    if (id === null) {
      return NextResponse.json(
        { error: "A valid film ID is required" },
        { status: 400 },
      );
    }

    const existingFilm = await prisma.film.findUnique({
      where: {
        id,
      },
    });

    if (!existingFilm) {
      return NextResponse.json(
        { error: "Film not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.film.delete({
        where: {
          id,
        },
      });

      const filmsToShift =
        await transaction.film.findMany({
          where: {
            position: {
              gt: existingFilm.position,
            },
          },
          orderBy: {
            position: "asc",
          },
        });

      for (const film of filmsToShift) {
        await transaction.film.update({
          where: {
            id: film.id,
          },
          data: {
            position: -film.position,
          },
        });
      }

      for (const film of filmsToShift) {
        await transaction.film.update({
          where: {
            id: film.id,
          },
          data: {
            position: film.position - 1,
          },
        });
      }
    });

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    console.error("Unable to delete film:", error);

    return NextResponse.json(
      { error: "Unable to delete film" },
      { status: 500 },
    );
  }
}