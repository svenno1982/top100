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

function parseAppleTrackId(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const appleTrackId = String(value).trim();

  return appleTrackId || null;
}

export async function GET() {
  try {
    const songs = await prisma.song.findMany({
      orderBy: {
        position: "asc",
      },
    });

    return NextResponse.json(songs);
  } catch (error) {
    console.error("Unable to retrieve songs:", error);

    return NextResponse.json(
      { error: "Unable to retrieve songs" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = body.title?.trim();
    const artist = body.artist?.trim();

    if (!title || !artist) {
      return NextResponse.json(
        {
          error: "Song title and artist are required",
        },
        { status: 400 },
      );
    }

    const appleTrackId = parseAppleTrackId(
      body.appleTrackId,
    );

    if (appleTrackId !== null) {
      const existingSong =
        await prisma.song.findUnique({
          where: {
            appleTrackId,
          },
        });

      if (existingSong) {
        return NextResponse.json(
          {
            error:
              "This song is already in the chart",
          },
          { status: 409 },
        );
      }
    }

    const songCount = await prisma.song.count();
    const requestedPosition = Number(body.position);

    const position =
      Number.isInteger(requestedPosition) &&
      requestedPosition >= 1
        ? Math.min(requestedPosition, songCount + 1)
        : songCount + 1;

    const song = await prisma.$transaction(
      async (transaction) => {
        const songsToShift =
          await transaction.song.findMany({
            where: {
              position: {
                gte: position,
              },
            },
            orderBy: {
              position: "asc",
            },
          });

        // Temporarily move affected positions below zero
        // to avoid collisions with the unique constraint.
        for (const existingSong of songsToShift) {
          await transaction.song.update({
            where: {
              id: existingSong.id,
            },
            data: {
              position: -existingSong.position,
            },
          });
        }

        const createdSong =
          await transaction.song.create({
            data: {
              position,
              title,
              artist,
              releaseYear: parseReleaseYear(
                body.releaseYear,
              ),
              artworkUrl:
                body.artworkUrl?.trim() || null,
              appleTrackId,
              trackUrl:
                body.trackUrl?.trim() || null,
            },
          });

        for (const existingSong of songsToShift) {
          await transaction.song.update({
            where: {
              id: existingSong.id,
            },
            data: {
              position:
                existingSong.position + 1,
            },
          });
        }

        return createdSong;
      },
    );

    return NextResponse.json(song, {
      status: 201,
    });
  } catch (error) {
    console.error("Unable to create song:", error);

    return NextResponse.json(
      { error: "Unable to create song" },
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
        {
          error:
            "A valid orderedIds array is required",
        },
        { status: 400 },
      );
    }

    const existingSongs =
      await prisma.song.findMany({
        select: {
          id: true,
        },
      });

    const existingIds = existingSongs
      .map((song) => song.id)
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
            "The submitted order does not match the song chart",
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
        await transaction.song.update({
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
        await transaction.song.update({
          where: {
            id: orderedIds[index],
          },
          data: {
            position: index + 1,
          },
        });
      }
    });

    const songs = await prisma.song.findMany({
      orderBy: {
        position: "asc",
      },
    });

    return NextResponse.json(songs);
  } catch (error) {
    console.error("Unable to reorder songs:", error);

    return NextResponse.json(
      { error: "Unable to reorder songs" },
      { status: 500 },
    );
  }
}