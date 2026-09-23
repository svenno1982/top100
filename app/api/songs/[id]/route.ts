import { NextRequest, NextResponse } from "next/server";
import { requireApprovedApiUser } from "@/lib/auth-access";
import { prisma } from "@/lib/prisma";

type SongRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseSongId(value: string) {
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

function parseOptionalUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const url = value.trim();

  return url ? url.replace(/^http:/, "https:") : null;
}

export async function PATCH(
  request: NextRequest,
  context: SongRouteContext,
) {
  try {
    const access = await requireApprovedApiUser();

    if (access.response) {
      return access.response;
    }

    const ownerId = access.userId;
    const { id: idValue } = await context.params;
    const id = parseSongId(idValue);

    if (id === null) {
      return NextResponse.json(
        { error: "A valid song ID is required" },
        { status: 400 },
      );
    }

    const existingSong = await prisma.song.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    if (!existingSong) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 },
      );
    }

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

    if (
      appleTrackId !== null &&
      appleTrackId !== existingSong.appleTrackId
    ) {
      const duplicateSong =
        await prisma.song.findUnique({
          where: {
            ownerId_appleTrackId: {
              ownerId,
              appleTrackId,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicateSong) {
        return NextResponse.json(
          {
            error:
              "Another song in your chart already uses this Apple track",
          },
          { status: 409 },
        );
      }
    }

    const song = await prisma.song.update({
      where: {
        id,
      },
      data: {
        title,
        artist,
        releaseYear: parseReleaseYear(
          body.releaseYear,
        ),
        artworkUrl: parseOptionalUrl(
          body.artworkUrl,
        ),
        appleTrackId,
        trackUrl: parseOptionalUrl(body.trackUrl),
        previewUrl:
          body.previewUrl === undefined
            ? existingSong.previewUrl
            : parseOptionalUrl(body.previewUrl),
      },
    });

    return NextResponse.json(song);
  } catch (error) {
    console.error("Unable to update song:", error);

    return NextResponse.json(
      { error: "Unable to update song" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: SongRouteContext,
) {
  try {
    const access = await requireApprovedApiUser();

    if (access.response) {
      return access.response;
    }

    const ownerId = access.userId;
    const { id: idValue } = await context.params;
    const id = parseSongId(idValue);

    if (id === null) {
      return NextResponse.json(
        { error: "A valid song ID is required" },
        { status: 400 },
      );
    }

    const existingSong = await prisma.song.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    if (!existingSong) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.song.delete({
        where: {
          id,
        },
      });

      const songsToShift =
        await transaction.song.findMany({
          where: {
            ownerId,
            position: {
              gt: existingSong.position,
            },
          },
          orderBy: {
            position: "asc",
          },
        });

      for (const song of songsToShift) {
        await transaction.song.update({
          where: {
            id: song.id,
          },
          data: {
            position: -song.position,
          },
        });
      }

      for (const song of songsToShift) {
        await transaction.song.update({
          where: {
            id: song.id,
          },
          data: {
            position: song.position - 1,
          },
        });
      }
    });

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    console.error("Unable to delete song:", error);

    return NextResponse.json(
      { error: "Unable to delete song" },
      { status: 500 },
    );
  }
}