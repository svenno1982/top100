"use client";

import type { ReactNode } from "react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type AlbumTrack = {
  discNumber: number;
  position: number;
  trackNumber: string;
  title: string;
  lengthMs: number | null;
};

type TracklistResponse = {
  tracks?: AlbumTrack[];
  error?: string;
};

type TooltipPosition = {
  top: number;
  left: number;
  width: number;
};

type AlbumTrackTooltipProps = {
  albumId: number;
  albumTitle: string;
  hasMusicBrainzId: boolean;
  disabled?: boolean;
  children: ReactNode;
};

function formatDuration(lengthMs: number | null) {
  if (lengthMs === null) {
    return null;
  }

  const totalSeconds = Math.round(lengthMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function AlbumTrackTooltip({
  albumId,
  albumTitle,
  hasMusicBrainzId,
  disabled = false,
  children,
}: AlbumTrackTooltipProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const hasRequestedRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [tracks, setTracks] = useState<AlbumTrack[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] =
    useState<TooltipPosition | null>(null);

  function cancelScheduledClose() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    cancelScheduledClose();

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 120);
  }

    function updatePosition() {
    const anchor = anchorRef.current;

    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 12;

    const width = Math.min(
      360,
      window.innerWidth - viewportPadding * 2,
    );

    const spaceOnRight =
      window.innerWidth -
      rect.right -
      viewportPadding;

    const spaceOnLeft =
      rect.left -
      viewportPadding;

    const forceBelow = window.innerWidth < 768;

    const canFitOnRight =
      spaceOnRight >= width + gap;

    const canFitOnLeft =
      spaceOnLeft >= width + gap;

    let viewportLeft: number;
    let viewportTop: number;
    let isBelow = forceBelow;

    if (forceBelow) {
      viewportLeft =
        rect.left +
        rect.width / 2 -
        width / 2;

      viewportTop = rect.bottom + gap;
    } else if (
      canFitOnRight ||
      (!canFitOnLeft && spaceOnRight >= spaceOnLeft)
    ) {
      viewportLeft = rect.right + gap;
      viewportTop = rect.top;
    } else if (canFitOnLeft) {
      viewportLeft = rect.left - width - gap;
      viewportTop = rect.top;
    } else {
      isBelow = true;

      viewportLeft =
        rect.left +
        rect.width / 2 -
        width / 2;

      viewportTop = rect.bottom + gap;
    }

    const maximumLeft =
      window.innerWidth -
      width -
      viewportPadding;

    const estimatedHeight = Math.min(
      450,
      window.innerHeight -
        viewportPadding * 2,
    );

    const maximumSideTop =
      window.innerHeight -
      estimatedHeight -
      viewportPadding;

    const resolvedTop = isBelow
      ? viewportTop
      : Math.max(
          viewportPadding,
          Math.min(viewportTop, maximumSideTop),
        );

    setPosition({
      top: window.scrollY + resolvedTop,
      left:
        window.scrollX +
        Math.max(
          viewportPadding,
          Math.min(viewportLeft, maximumLeft),
        ),
      width,
    });
  }

  async function loadTracks() {
    if (
      hasRequestedRef.current ||
      !hasMusicBrainzId
    ) {
      return;
    }

    hasRequestedRef.current = true;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/albums/${albumId}/tracks`,
      );

      const result =
        (await response.json()) as TracklistResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to retrieve track listing",
        );
      }

      setTracks(result.tracks ?? []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to retrieve track listing",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function openTooltip() {
    if (disabled) {
      return;
    }

    cancelScheduledClose();
    updatePosition();
    setIsOpen(true);
    void loadTracks();
  }

  function closeTooltip() {
    cancelScheduledClose();
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleResize() {
      updatePosition();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
                if (closeTimerRef.current !== null) {
          window.clearTimeout(
            closeTimerRef.current,
          );
          closeTimerRef.current = null;
        }

        setIsOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        anchorRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }

              if (closeTimerRef.current !== null) {
          window.clearTimeout(
            closeTimerRef.current,
          );
          closeTimerRef.current = null;
        }

        setIsOpen(false);
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      cancelScheduledClose();
    };
  }, []);

  const tracksByDisc = new Map<number, AlbumTrack[]>();

  for (const track of tracks) {
    const discTracks =
      tracksByDisc.get(track.discNumber) ?? [];

    discTracks.push(track);
    tracksByDisc.set(track.discNumber, discTracks);
  }

  const hasMultipleDiscs = tracksByDisc.size > 1;

  return (
    <div
      ref={anchorRef}
      className="relative"
      onMouseEnter={openTooltip}
      onMouseLeave={scheduleClose}
      onFocusCapture={openTooltip}
      onBlurCapture={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget,
          )
        ) {
          scheduleClose();
        }
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "mouse") {
          return;
        }

        const target = event.target;

        if (
          target instanceof Element &&
          target.closest(
            "button, a, input, textarea, select",
          )
        ) {
          return;
        }

        if (isOpen) {
          closeTooltip();
        } else {
          openTooltip();
        }
      }}
    >
      {children}

      {isOpen &&
        !disabled &&
        position &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="absolute z-[100] overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950 shadow-2xl shadow-black/70"
            onMouseEnter={cancelScheduledClose}
            onMouseLeave={scheduleClose}
          >
            <div className="border-b border-neutral-800 px-4 py-3">
              <p className="truncate text-sm font-semibold text-white">
                {albumTitle}
              </p>

              <p className="mt-0.5 text-xs text-neutral-500">
                Track listing
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto p-3">
              {!hasMusicBrainzId ? (
                <p className="py-3 text-center text-sm text-neutral-400">
                  Track listing unavailable
                </p>
              ) : isLoading ? (
                <p className="py-3 text-center text-sm text-neutral-400">
                  Loading tracks…
                </p>
              ) : error ? (
                <p className="py-3 text-center text-sm text-red-300">
                  {error}
                </p>
              ) : tracks.length === 0 ? (
                <p className="py-3 text-center text-sm text-neutral-400">
                  No tracks found
                </p>
              ) : (
                <div className="space-y-4">
                  {Array.from(
                    tracksByDisc.entries(),
                  ).map(
                    ([discNumber, discTracks]) => (
                      <section key={discNumber}>
                        {hasMultipleDiscs && (
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
                            Disc {discNumber}
                          </h3>
                        )}

                        <ol className="space-y-1.5">
                          {discTracks.map((track) => {
                            const duration =
                              formatDuration(
                                track.lengthMs,
                              );

                            return (
                              <li
                                key={`${discNumber}-${track.position}`}
                                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-2 text-xs"
                              >
                                <span className="text-right text-neutral-600">
                                  {track.trackNumber}
                                </span>

                                <span className="text-neutral-200">
                                  {track.title}
                                </span>

                                {duration && (
                                  <span className="text-neutral-500">
                                    {duration}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      </section>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}