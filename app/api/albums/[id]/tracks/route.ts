import {
  NextRequest,
  NextResponse,
} from "next/server";
import { auth } from "@/auth";
import { fetchAlbumTracklist } from "@/lib/musicbrainz-tracklist";
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

async function findAlbumWithTracks(id: number) {
  return prisma.album.findUnique({
    where: {
      id,
    },
    include: {
      owner: {
        select: {
          status: true,
          isProfilePublic: true,
        },
      },
      tracks: {
        orderBy: [
          {
            discNumber: "asc",
          },
          {
            position: "asc",
          },
        ],
      },
    },
  });
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const params = await context.params;
    const id = parseAlbumId(params.id);

    if (id === null) {
      return NextResponse.json(
        {
          error: "Invalid album ID",
        },
        {
          status: 400,
        },
      );
    }

    const album = await findAlbumWithTracks(id);

    if (!album) {
      return NextResponse.json(
        {
          error: "Album not found",
        },
        {
          status: 404,
        },
      );
    }

    const session = await auth();

    const isApprovedOwner =
      session?.user?.id === album.ownerId &&
      session.user.status === "APPROVED";

    const isPublicAlbum =
      album.owner.status === "APPROVED" &&
      album.owner.isProfilePublic;

    /*
     * Return 404 rather than revealing that a private
     * album ID exists.
     */
    if (!isApprovedOwner && !isPublicAlbum) {
      return NextResponse.json(
        {
          error: "Album not found",
        },
        {
          status: 404,
        },
      );
    }

    const forceRefresh =
      request.nextUrl.searchParams.get("refresh") ===
      "1";

    /*
     * Public visitors may read a cached tracklist or cause
     * an uncached public tracklist to be fetched. Only the
     * chart owner may explicitly replace cached data.
     */
    if (forceRefresh && !isApprovedOwner) {
      return NextResponse.json(
        {
          error:
            "Only the chart owner can refresh this track listing",
        },
        {
          status: 403,
        },
      );
    }

    if (album.tracks.length > 0 && !forceRefresh) {
      return NextResponse.json({
        releaseId: album.tracklistReleaseId,
        fetchedAt: album.tracklistFetchedAt,
        tracks: album.tracks,
      });
    }

    if (!album.musicBrainzId) {
      return NextResponse.json(
        {
          error:
            "No MusicBrainz ID is stored for this album",
        },
        {
          status: 422,
        },
      );
    }

    let tracklist;

    try {
      tracklist = await fetchAlbumTracklist(
        album.musicBrainzId,
      );
    } catch (error) {
      console.error(
        `Unable to retrieve tracks for album ${id}:`,
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to retrieve this track listing from MusicBrainz",
        },
        {
          status: 502,
        },
      );
    }

    const fetchedAt = new Date();

    await prisma.$transaction(async (transaction) => {
      await transaction.albumTrack.deleteMany({
        where: {
          albumId: id,
        },
      });

      await transaction.albumTrack.createMany({
        data: tracklist.tracks.map((track) => ({
          albumId: id,
          discNumber: track.discNumber,
          position: track.position,
          trackNumber: track.trackNumber,
          title: track.title,
          lengthMs: track.lengthMs,
        })),
      });

      await transaction.album.update({
        where: {
          id,
        },
        data: {
          tracklistReleaseId: tracklist.releaseId,
          tracklistFetchedAt: fetchedAt,
        },
      });
    });

    const updatedAlbum =
      await findAlbumWithTracks(id);

    if (!updatedAlbum) {
      return NextResponse.json(
        {
          error: "Album not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      releaseId: updatedAlbum.tracklistReleaseId,
      fetchedAt: updatedAlbum.tracklistFetchedAt,
      tracks: updatedAlbum.tracks,
    });
  } catch (error) {
    console.error(
      "Unable to retrieve album tracks:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to retrieve album tracks",
      },
      {
        status: 500,
      },
    );
  }
}