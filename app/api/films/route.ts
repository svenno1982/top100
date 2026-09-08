import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  try {
    const films = await prisma.film.findMany({
      orderBy: {
        position: "asc",
      },
    });

    return NextResponse.json(films);
  } catch (error) {
    console.error("Unable to retrieve films:", error);

    return NextResponse.json(
      { error: "Unable to retrieve films" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = body.title?.trim();
    const director = body.director?.trim() || null;
    const posterUrl = body.posterUrl?.trim() || null;
    const releaseYear = parseReleaseYear(
      body.releaseYear,
    );
    const tmdbId = parseTmdbId(body.tmdbId);

    if (!title) {
      return NextResponse.json(
        { error: "Film title is required" },
        { status: 400 },
      );
    }

    if (tmdbId !== null) {
      const existingFilm = await prisma.film.findUnique({
        where: {
          tmdbId,
        },
      });

      if (existingFilm) {
        return NextResponse.json(
          { error: "This film is already in the chart" },
          { status: 409 },
        );
      }
    }

    const filmCount = await prisma.film.count();

    const requestedPosition = Number(body.position);

    const position =
      Number.isInteger(requestedPosition) &&
      requestedPosition >= 1
        ? Math.min(requestedPosition, filmCount + 1)
        : filmCount + 1;

    const film = await prisma.$transaction(
      async (transaction) => {
        const filmsToShift =
          await transaction.film.findMany({
            where: {
              position: {
                gte: position,
              },
            },
            orderBy: {
              position: "asc",
            },
          });

        // Move affected positions temporarily below zero.
        // This avoids collisions with the unique position field.
        for (const existingFilm of filmsToShift) {
          await transaction.film.update({
            where: {
              id: existingFilm.id,
            },
            data: {
              position: -existingFilm.position,
            },
          });
        }

        const createdFilm =
          await transaction.film.create({
            data: {
              position,
              title,
              director,
              releaseYear,
              posterUrl,
              tmdbId,
            },
          });

        // Restore the displaced films one position lower.
        for (const existingFilm of filmsToShift) {
          await transaction.film.update({
            where: {
              id: existingFilm.id,
            },
            data: {
              position: existingFilm.position + 1,
            },
          });
        }

        return createdFilm;
      },
    );

    return NextResponse.json(film, {
      status: 201,
    });
  } catch (error) {
    console.error("Unable to create film:", error);

    return NextResponse.json(
      { error: "Unable to create film" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const orderedIds = body.orderedIds;

    if (
      !Array.isArray(orderedIds) ||
      orderedIds.some(
        (id) => !Number.isInteger(id) || id < 1,
      )
    ) {
      return NextResponse.json(
        { error: "A valid orderedIds array is required" },
        { status: 400 },
      );
    }

    const existingFilms = await prisma.film.findMany({
      select: {
        id: true,
      },
    });

    const existingIds = existingFilms
      .map((film) => film.id)
      .sort((a, b) => a - b);

    const submittedIds = [...orderedIds].sort(
      (a, b) => a - b,
    );

    if (
      existingIds.length !== submittedIds.length ||
      existingIds.some(
        (id, index) => id !== submittedIds[index],
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The submitted order does not match the film chart",
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (transaction) => {
      for (
        let index = 0;
        index < orderedIds.length;
        index++
      ) {
        await transaction.film.update({
          where: {
            id: orderedIds[index],
          },
          data: {
            position: -(index + 1),
          },
        });
      }

      for (
        let index = 0;
        index < orderedIds.length;
        index++
      ) {
        await transaction.film.update({
          where: {
            id: orderedIds[index],
          },
          data: {
            position: index + 1,
          },
        });
      }
    });

    const films = await prisma.film.findMany({
      orderBy: {
        position: "asc",
      },
    });

    return NextResponse.json(films);
  } catch (error) {
    console.error("Unable to reorder films:", error);

    return NextResponse.json(
      { error: "Unable to reorder films" },
      { status: 500 },
    );
  }
}