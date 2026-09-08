import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseAlbumId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    return null;
  }

  return id;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const params = await context.params;
    const id = parseAlbumId(params.id);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid album ID" },
        { status: 400 },
      );
    }

    const existingAlbum = await prisma.album.findUnique({
      where: { id },
    });

    if (!existingAlbum) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const title = body.title?.trim();
    const artist = body.artist?.trim();

    if (!title || !artist) {
      return NextResponse.json(
        { error: "Album title and artist are required" },
        { status: 400 },
      );
    }

    const album = await prisma.album.update({
      where: { id },
      data: {
        title,
        artist,
        releaseYear: body.releaseYear
          ? Number(body.releaseYear)
          : null,
        artworkUrl: body.artworkUrl?.trim() || null,
        artworkSource:
          body.artworkSource?.trim() || null,
        musicBrainzId:
          body.musicBrainzId?.trim() || null,
      },
    });

    return NextResponse.json(album);
  } catch (error) {
    console.error("Unable to update album:", error);

    return NextResponse.json(
      { error: "Unable to update album" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const params = await context.params;
    const id = parseAlbumId(params.id);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid album ID" },
        { status: 400 },
      );
    }

    const existingAlbum = await prisma.album.findUnique({
      where: { id },
    });

    if (!existingAlbum) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.album.delete({
        where: { id },
      });

      const remainingAlbums =
        await transaction.album.findMany({
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
          },
        });

      // Move everything temporarily to negative positions
      // to avoid unique-position collisions.
      for (
        let index = 0;
        index < remainingAlbums.length;
        index++
      ) {
        await transaction.album.update({
          where: {
            id: remainingAlbums[index].id,
          },
          data: {
            position: -(index + 1),
          },
        });
      }

      // Restore a clean sequence starting at position 1.
      for (
        let index = 0;
        index < remainingAlbums.length;
        index++
      ) {
        await transaction.album.update({
          where: {
            id: remainingAlbums[index].id,
          },
          data: {
            position: index + 1,
          },
        });
      }
    });

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    console.error("Unable to delete album:", error);

    return NextResponse.json(
      { error: "Unable to delete album" },
      { status: 500 },
    );
  }
}
