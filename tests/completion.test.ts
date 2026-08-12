import { describe, it, expect } from "vitest";

import { isArticleComplete, isVideoComplete, watchPercentage } from "@/lib/tracking/completion";

describe("isArticleComplete", () => {
  it("completes when reading >= threshold and every required video is completed (§7/§41)", () => {
    const result = isArticleComplete({
      progressPercent: 90,
      threshold: 90,
      videos: [
        { postVideoId: "v1", required: true, completed: true },
        { postVideoId: "v2", required: true, completed: true },
        { postVideoId: "v3", required: true, completed: true },
      ],
    });
    expect(result).toBe(true);
  });

  it("does NOT complete if reading progress is below threshold", () => {
    const result = isArticleComplete({
      progressPercent: 89,
      threshold: 90,
      videos: [{ postVideoId: "v1", required: true, completed: true }],
    });
    expect(result).toBe(false);
  });

  it("does NOT complete if any required video is incomplete (video 2 not done)", () => {
    const result = isArticleComplete({
      progressPercent: 95,
      threshold: 90,
      videos: [
        { postVideoId: "v1", required: true, completed: true },
        { postVideoId: "v2", required: true, completed: false },
        { postVideoId: "v3", required: true, completed: true },
      ],
    });
    expect(result).toBe(false);
  });

  it("ignores optional (non-required) videos", () => {
    const result = isArticleComplete({
      progressPercent: 100,
      threshold: 90,
      videos: [
        { postVideoId: "v1", required: true, completed: true },
        { postVideoId: "v2", required: false, completed: false },
      ],
    });
    expect(result).toBe(true);
  });

  it("completes with zero configured videos once reading threshold is met", () => {
    expect(isArticleComplete({ progressPercent: 100, threshold: 90, videos: [] })).toBe(true);
  });
});

describe("isVideoComplete", () => {
  it("is robust even if the browser never fires 'ended' (§6) — driven by watched-seconds vs duration", () => {
    const result = isVideoComplete({ maxWatchedSeconds: 9, durationSeconds: 10, thresholdPercent: 90 });
    expect(result).toBe(true);
  });

  it("is not complete below the threshold", () => {
    const result = isVideoComplete({ maxWatchedSeconds: 5, durationSeconds: 10, thresholdPercent: 90 });
    expect(result).toBe(false);
  });

  it("treats a native ended event as complete regardless of watched-seconds math", () => {
    const result = isVideoComplete({ maxWatchedSeconds: 0, durationSeconds: 10, thresholdPercent: 90, nativeEndedFired: true });
    expect(result).toBe(true);
  });

  it("is never complete without a known duration", () => {
    const result = isVideoComplete({ maxWatchedSeconds: 999, durationSeconds: null, thresholdPercent: 90 });
    expect(result).toBe(false);
  });
});

describe("watchPercentage", () => {
  it("computes percentage from watched seconds over duration", () => {
    expect(watchPercentage(5, 10)).toBe(50);
  });

  it("caps at 100 even if watched seconds slightly exceeds duration", () => {
    expect(watchPercentage(11, 10)).toBe(100);
  });

  it("is 0 with no duration", () => {
    expect(watchPercentage(5, null)).toBe(0);
  });
});
