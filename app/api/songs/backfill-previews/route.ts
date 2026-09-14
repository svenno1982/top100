import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AppleSong = {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackViewUrl?: string;
  previewUrl?: string;
};

type AppleLookupResponse = {
  resultCount?: number;
  results?: AppleSong[];
};

const LOOKUP_BATCH_SIZE = 50;

function getSecureUrl(url?: string) {
  if (!url) {
    return null;
  }

  return url.replace(/^http:/, "https:");
}

export async function POST() {
  try {
    const songs = await prisma.song.findMany({
      where: {
        appleTrackId: {
          not: null,
        },
        previewUrl: null,
      },
      select: {
        id: true,
        appleTrackId: true,
        trackUrl: true,
      },
      orderBy: {
        position: "asc",
      },
    });

    if (songs.length === 0) {
      return NextResponse.json({
        checked: 0,
        updated: 0,
        unavailable: 0,
        message:
          "Every eligible song already has preview information",
      });
    }

    let updated = 0;

    for (
      let startIndex = 0;
      startIndex < songs.length;
      startIndex += LOOKUP_BATCH_SIZE
    ) {
      const batch = songs.slice(
        startIndex,
        startIndex + LOOKUP_BATCH_SIZE,
      );

      const appleTrackIds = batch
        .map((song) => song.appleTrackId)
        .filter(
          (appleTrackId): appleTrackId is string =>
            Boolean(appleTrackId),
        );

      if (appleTrackIds.length === 0) {
        continue;
      }

      const searchParameters = new URLSearchParams({
        id: appleTrackIds.join(","),
        country: "GB",
        entity: "song",
      });

      const response = await fetch(
        `https://itunes.apple.com/lookup?${searchParameters.toString()}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "MyTop100/1.0 (https://top100.rkrp.co.uk)",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        console.error(
          "Apple preview lookup failed:",
          response.status,
          response.statusText,
        );

        return NextResponse.json(
          {
            error:
              "Apple could not provide the song previews",
          },
          { status: 502 },
        );
      }

      const data =
        (await response.json()) as AppleLookupResponse;

      const appleResults = new Map<
        string,
        AppleSong
      >();

      for (const result of data.results ?? []) {
        if (
          result.wrapperType === "track" &&
          result.kind === "song" &&
          result.trackId
        ) {
          appleResults.set(
            String(result.trackId),
            result,
          );
        }
      }

      for (const song of batch) {
        if (!song.appleTrackId) {
          continue;
        }

        const appleSong = appleResults.get(
          song.appleTrackId,
        );

        const previewUrl = getSecureUrl(
          appleSong?.previewUrl,
        );

        if (!previewUrl) {
          continue;
        }

        await prisma.song.update({
          where: {
            id: song.id,
          },
          data: {
            previewUrl,
            trackUrl:
              song.trackUrl ??
              getSecureUrl(appleSong?.trackViewUrl),
          },
        });

        updated++;
      }
    }

    return NextResponse.json({
      checked: songs.length,
      updated,
      unavailable: songs.length - updated,
    });
  } catch (error) {
    console.error(
      "Unable to backfill song previews:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to backfill the existing song previews",
      },
      { status: 500 },
    );
  }
}