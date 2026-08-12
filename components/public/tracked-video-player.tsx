"use client";

import { useRef } from "react";

import { useArticleTracking } from "@/components/public/article-tracking-provider";

const MILESTONES = [25, 50, 75, 90];
const MIN_PROGRESS_SEND_INTERVAL_MS = 5000;

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

  return (
    <video
      controls
      preload="metadata"
      poster={posterUrl ?? undefined}
      className="w-full rounded-lg bg-black"
      onPlay={(e) => reportVideoEvent(slotIndex, "play", e.currentTarget.currentTime)}
      onPause={(e) => reportVideoEvent(slotIndex, "pause", e.currentTarget.currentTime)}
      onEnded={(e) => reportVideoEvent(slotIndex, "ended", e.currentTarget.currentTime, e.currentTarget.duration)}
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
