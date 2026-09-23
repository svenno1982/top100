import { NextRequest, NextResponse } from "next/server";
import { requireApprovedApiUser } from "@/lib/auth-access";
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
    const access = await requireApprovedApiUser();

    if (access.response) {
      return access.response;
    }

    const ownerId = access.userId;
    const params = await context.params;
    const id = parseAlbumId(params.id);

    if (id === null) {
      return NextResponse.json(
        { error: "Invalid album ID" },
        { status: 400 },
      );
    }

    const existingAlbum =
      await prisma.album.findFirst({
        where: {
          id,
          ownerId,
        },
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

    const musicBrainzId =
      body.musicBrainzId?.trim() || null;

    const musicBrainzIdChanged =
      musicBrainzId !== existingAlbum.musicBrainzId;

    if (musicBrainzId && musicBrainzIdChanged) {
      const duplicateAlbum =
        await prisma.album.findUnique({
          where: {
            ownerId_musicBrainzId: {
              ownerId,
              musicBrainzId,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicateAlbum) {
        return NextResponse.json(
          {
            error:
              "Another album in your chart already uses this MusicBrainz entry",
          },
          { status: 409 },
        );
      }
    }

    const album = await prisma.$transaction(
      async (transaction) => {
        if (musicBrainzIdChanged) {
          await transaction.albumTrack.deleteMany({
            where: {
              albumId: id,
            },
          });
        }

        return transaction.album.update({
          where: {
            id,
          },
          data: {
            title,
            artist,
            releaseYear: body.releaseYear
              ? Number(body.releaseYear)
              : null,
            artworkUrl:
              body.artworkUrl?.trim() || null,
            artworkSource:
              body.artworkSource?.trim() || null,
            musicBrainzId,
            ...(musicBrainzIdChanged
              ? {
                  tracklistReleaseId: null,
                  tracklistFetchedAt: null,
                }
              : {}),
          },
        });
      },
    );

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
    const access = await requireApprovedApiUser();

    if (access.response) {
      return access.response;
    }

    const ownerId = access.userId;
    const params = await context.params;
    const id = parseAlbumId(params.id);

    if (id === null) {
      return NextResponse.json(
        { error: "Invalid album ID" },
        { status: 400 },
      );
    }

    const existingAlbum =
      await prisma.album.findFirst({
        where: {
          id,
          ownerId,
        },
      });

    if (!existingAlbum) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.album.delete({
        where: {
          id,
        },
      });

      const remainingAlbums =
        await transaction.album.findMany({
          where: {
            ownerId,
          },
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
          },
        });

      /*
       * Re-sequence only this user's remaining albums.
       */
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