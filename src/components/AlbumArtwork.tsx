"use client";

import { useEffect, useState } from "react";

type AlbumArtworkProps = {
  src: string | null;
  title: string;
  artist?: string;
  className?: string;
};

export function AlbumArtwork({
  src,
  title,
  artist,
  className = "",
}: AlbumArtworkProps) {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [src]);

  if (!src || hasFailed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 p-3 text-center ${className}`}
        title={`No artwork available for ${title}`}
      >
        <div>
          <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-600 text-sm text-neutral-500">
            ♪
          </div>

          <p className="line-clamp-2 text-xs font-medium text-neutral-400">
            {title || "No artwork"}
          </p>

          {artist && (
            <p className="mt-1 line-clamp-1 text-[10px] text-neutral-600">
              {artist}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${title} album artwork`}
      className={className}
      onError={() => setHasFailed(true)}
    />
  );
}