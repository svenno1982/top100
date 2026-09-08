import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const albums = await prisma.album.findMany({
      orderBy: {
        position: "asc",
      },
    });

    return NextResponse.json(albums);
  } catch (error) {
    console.error("Unable to retrieve albums:", error);

    return NextResponse.json(
      { error: "Unable to retrieve albums" },
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
        { error: "Album title and artist are required" },
        { status: 400 },
      );
    }

    const existingAlbums = await prisma.album.findMany({
      orderBy: {
        position: "asc",
      },
      select: {
        id: true,
      },
    });


    const requestedPosition = Number(body.position);

    const position =
      Number.isInteger(requestedPosition) &&
      requestedPosition >= 1 &&
      requestedPosition <= existingAlbums.length + 1
        ? requestedPosition
        : existingAlbums.length + 1;

    const album = await prisma.$transaction(
      async (transaction) => {
        /*
         * Move every existing album temporarily into a
         * negative position. This prevents collisions with
         * the unique position constraint while inserting.
         */
        for (
          let index = 0;
          index < existingAlbums.length;
          index++
        ) {
          await transaction.album.update({
            where: {
              id: existingAlbums[index].id,
            },
            data: {
              position: -(index + 1),
            },
          });
        }

        /*
         * Create the new album directly in its requested
         * chart position.
         */
        const createdAlbum =
          await transaction.album.create({
            data: {
              position,
              title,
              artist,
              releaseYear: body.releaseYear
                ? Number(body.releaseYear)
                : null,
              artworkUrl:
                body.artworkUrl?.trim() || null,
              artworkSource:
                body.artworkSource?.trim() || null,
              musicBrainzId:
                body.musicBrainzId?.trim() || null,
            },
          });

        /*
         * Restore the existing albums to positive positions,
         * moving albums at or below the insertion point down
         * by one place.
         */
        for (
          let index = 0;
          index < existingAlbums.length;
          index++
        ) {
          const originalPosition = index + 1;

          const restoredPosition =
            originalPosition >= position
              ? originalPosition + 1
              : originalPosition;

          await transaction.album.update({
            where: {
              id: existingAlbums[index].id,
            },
            data: {
              position: restoredPosition,
            },
          });
        }

        return createdAlbum;
      },
    );

    return NextResponse.json(album, {
      status: 201,
    });
  } catch (error) {
    console.error("Unable to create album:", error);

    return NextResponse.json(
      { error: "Unable to create album" },
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

    const existingAlbums = await prisma.album.findMany({
      select: {
        id: true,
      },
    });

    const existingIds = existingAlbums
      .map((album) => album.id)
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
            "The submitted order does not match the chart",
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (transaction) => {
      /*
       * Move positions temporarily into negative numbers.
       * This prevents collisions with the unique position
       * field.
       */
      for (
        let index = 0;
        index < orderedIds.length;
        index++
      ) {
        await transaction.album.update({
          where: {
            id: orderedIds[index],
          },
          data: {
            position: -(index + 1),
          },
        });
      }

      // Apply the final positive positions.
      for (
        let index = 0;
        index < orderedIds.length;
        index++
      ) {
        await transaction.album.update({
          where: {
            id: orderedIds[index],
          },
          data: {
            position: index + 1,
          },
        });
      }
    });

    const albums = await prisma.album.findMany({
      orderBy: {
        position: "asc",
      },
    });

    return NextResponse.json(albums);
  } catch (error) {
    console.error("Unable to reorder albums:", error);

    return NextResponse.json(
      { error: "Unable to reorder albums" },
      { status: 500 },
    );
  }
}