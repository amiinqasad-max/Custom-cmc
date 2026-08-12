import { describe, it, expect } from "vitest";

import { resolvePlacements, type CandidatePlacement, type AdSafetySettings } from "@/lib/ads/resolvePlacements";

const safety: AdSafetySettings = {
  maxAdsPerArticle: 5,
  minParagraphsBetweenAds: 4,
  minContentLengthBeforeAds: 100,
  disableOnPages: true,
  disableOnShortArticles: true,
  shortArticleWordCount: 300,
  excludedCategoryIds: [],
  excludedPostIds: [],
};

function candidate(overrides: Partial<CandidatePlacement>): CandidatePlacement {
  return { id: "p", positionType: "after_paragraph", paragraphNumber: 1, videoSlot: null, priority: 0, adSlotId: "slot", ...overrides };
}

const baseContext = {
  isPage: false,
  postId: "post-1",
  categoryId: "cat-1",
  wordCount: 1000,
  paragraphCount: 12,
  videoSlotsPresent: [1, 2, 3],
  adsEnabledOnEntity: true,
};

describe("resolvePlacements", () => {
  it("enforces maxAdsPerArticle, keeping the highest-priority candidates", () => {
    const candidates = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      candidate({ id: `p${n}`, paragraphNumber: n, priority: n })
    );
    const result = resolvePlacements({ candidates, safety: { ...safety, minParagraphsBetweenAds: 0 }, context: baseContext });
    expect(result.length).toBe(5);
    expect(result.map((r) => r.id)).toEqual(expect.arrayContaining(["p3", "p4", "p5", "p6", "p7"]));
  });

  it("enforces minParagraphsBetweenAds, dropping placements too close together", () => {
    const candidates = [
      candidate({ id: "p1", paragraphNumber: 2 }),
      candidate({ id: "p2", paragraphNumber: 3 }), // only 1 apart -> dropped
      candidate({ id: "p3", paragraphNumber: 8 }), // far enough from p1
    ];
    const result = resolvePlacements({ candidates, safety, context: baseContext });
    expect(result.map((r) => r.id)).toEqual(["p1", "p3"]);
  });

  it("drops after_paragraph placements referencing a paragraph beyond the article's actual length", () => {
    const candidates = [candidate({ id: "p1", paragraphNumber: 999 })];
    const result = resolvePlacements({ candidates, safety, context: baseContext });
    expect(result).toHaveLength(0);
  });

  it("drops before/after_video placements for a video slot not present in this article", () => {
    const candidates = [candidate({ id: "p1", positionType: "before_video", paragraphNumber: null, videoSlot: 3 })];
    const result = resolvePlacements({
      candidates,
      safety,
      context: { ...baseContext, videoSlotsPresent: [1, 2] },
    });
    expect(result).toHaveLength(0);
  });

  it("disables all ads on pages when disableOnPages is set", () => {
    const candidates = [candidate({ id: "p1" })];
    const result = resolvePlacements({ candidates, safety, context: { ...baseContext, isPage: true } });
    expect(result).toHaveLength(0);
  });

  it("disables ads on short articles below the configured word count", () => {
    const candidates = [candidate({ id: "p1" })];
    const result = resolvePlacements({ candidates, safety, context: { ...baseContext, wordCount: 100 } });
    expect(result).toHaveLength(0);
  });

  it("disables ads below the minimum content length gate even if not flagged 'short'", () => {
    const candidates = [candidate({ id: "p1" })];
    const result = resolvePlacements({
      candidates,
      safety: { ...safety, disableOnShortArticles: false, minContentLengthBeforeAds: 5000 },
      context: baseContext,
    });
    expect(result).toHaveLength(0);
  });

  it("excludes specific categories and posts", () => {
    const candidates = [candidate({ id: "p1" })];
    expect(resolvePlacements({ candidates, safety: { ...safety, excludedCategoryIds: ["cat-1"] }, context: baseContext })).toHaveLength(0);
    expect(resolvePlacements({ candidates, safety: { ...safety, excludedPostIds: ["post-1"] }, context: baseContext })).toHaveLength(0);
  });

  it("respects ads_enabled=false on the category/page entity", () => {
    const candidates = [candidate({ id: "p1" })];
    const result = resolvePlacements({ candidates, safety, context: { ...baseContext, adsEnabledOnEntity: false } });
    expect(result).toHaveLength(0);
  });

  it("always keeps top and bottom placements regardless of spacing to neighbors", () => {
    const candidates = [
      candidate({ id: "top", positionType: "top", paragraphNumber: null }),
      candidate({ id: "p1", paragraphNumber: 1 }),
      candidate({ id: "bottom", positionType: "bottom", paragraphNumber: null }),
    ];
    const result = resolvePlacements({ candidates, safety, context: baseContext });
    expect(result.map((r) => r.id)).toEqual(["top", "p1", "bottom"]);
  });
});
