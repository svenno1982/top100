"use client";

import { useEffect, useState } from "react";

type FilmPosterProps = {
  src: string | null;
  title: string;
  director: string | null;
  className?: string;
};

export function FilmPoster({
  src,
  title,
  director,
  className = "",
}: FilmPosterProps) {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [src]);

  if (!src || hasFailed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-neutral-800 p-3 text-center ${className}`}
      >
        <span className="mb-2 text-2xl text-neutral-500">
          ◆
        </span>

        <span className="line-clamp-2 text-xs font-medium text-neutral-300">
          {title}
        </span>

        {director && (
          <span className="mt-1 line-clamp-1 text-[10px] text-neutral-500">
            {director}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${title} poster`}
      className={className}
      onError={() => setHasFailed(true)}
    />
  );
}
