"use client";

import { useEffect, useRef } from "react";

import { useArticleTracking } from "@/components/public/article-tracking-provider";

const MILESTONES = [25, 50, 75, 90];
const MIN_PROGRESS_SEND_INTERVAL_MS = 5000;

// How much of the player must be on screen before it autoplays. High enough
// that a video merely scrolled past on the way to something else doesn't
// start playing; low enough to catch one that's only partly visible on a
// short viewport.
const AUTOPLAY_VISIBILITY_RATIO = 0.6;

// Videos start buffering this far before they actually reach the viewport,
// so by the time a reader scrolls to AUTOPLAY_VISIBILITY_RATIO there's
// already a head start on the download instead of starting cold.
const PRELOAD_ROOT_MARGIN = "600px 0px";

export function TrackedVideoPlayer({
  slotIndex,
  src,
  posterUrl,
  durationSeconds,
}: {
  slotIndex: number;
  src: string;
  posterUrl?: string | null;
  durationSeconds?: number | null;
}) {
  const { reportVideoEvent } = useArticleTracking();
  const lastMilestoneRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadStartedRef = useRef(false);

  // Autoplay (muted — required by every browser's autoplay policy) the
  // moment the player scrolls into view, pause the moment it scrolls out.
  // Preloading ramps up earlier than autoplay does (see PRELOAD_ROOT_MARGIN),
  // so playback starts instantly instead of buffering when it finally
  // crosses the autoplay threshold — off-screen videos elsewhere in the
  // article stay unfetched until they're actually approaching, which keeps
  // the page itself fast to load.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Autoplay only succeeds while muted without a user gesture; setting it
    // once here (rather than every render) means a reader who unmutes via
    // the native controls stays unmuted as the video scrolls in and out.
    video.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !preloadStartedRef.current) {
          preloadStartedRef.current = true;
          video.preload = "auto";
        }
        if (entry.intersectionRatio >= AUTOPLAY_VISIBILITY_RATIO) {
          video.play().catch(() => {
            // Autoplay can still be refused (e.g. data-saver mode) — native
            // controls are always visible as a manual fallback.
          });
        } else if (!video.paused) {
          video.pause();
        }
      },
      { threshold: [0, AUTOPLAY_VISIBILITY_RATIO], rootMargin: PRELOAD_ROOT_MARGIN },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      controls
      muted
      playsInline
      preload="metadata"
      poster={posterUrl ?? undefined}
      className="w-full rounded-lg bg-black"
      onPlay={(e) => reportVideoEvent(slotIndex, "play", e.currentTarget.currentTime)}
      onPause={(e) => reportVideoEvent(slotIndex, "pause", e.currentTarget.currentTime)}
      onEnded={(e) => {
        reportVideoEvent(slotIndex, "ended", e.currentTarget.currentTime, e.currentTarget.duration);
        scrollToNextVideoBlock(e.currentTarget);
      }}
      onTimeUpdate={(e) => {
        const video = e.currentTarget;
        const duration = video.duration || durationSeconds || 0;
        const now = Date.now();
        const percent = duration > 0 ? (video.currentTime / duration) * 100 : 0;

        const crossedMilestone = MILESTONES.find((m) => percent >= m && lastMilestoneRef.current < m);
        const heartbeatDue = now - lastSentAtRef.current >= MIN_PROGRESS_SEND_INTERVAL_MS;

        if (crossedMilestone) lastMilestoneRef.current = crossedMilestone;
        if (crossedMilestone || heartbeatDue) {
          lastSentAtRef.current = now;
          reportVideoEvent(slotIndex, "progress", video.currentTime, duration || undefined);
        }
      }}
    >
      <source src={src} />
      Your browser does not support the video tag.
    </video>
  );
}

/**
 * On finishing a video, smooth-scrolls the next `.article-video-block` (the
 * wrapper article-body.tsx puts around every tracked video, in document
 * order) into view. If this was the last of the 3, there's no next block —
 * the existing completion/auto-next flow (ArticleTrackingProvider +
 * AutoNextOverlay) takes over from there once all required videos + reading
 * progress are done.
 */
function scrollToNextVideoBlock(video: HTMLVideoElement) {
  const current = video.closest(".article-video-block");
  if (!current) return;
  const blocks = Array.from(document.querySelectorAll<HTMLElement>(".article-video-block"));
  const next = blocks[blocks.indexOf(current as HTMLElement) + 1];
  next?.scrollIntoView({ behavior: "smooth", block: "start" });
}
