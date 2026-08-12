/**
 * Computes which ads actually render on a given article, applying the
 * safety rules from Settings -> Advertisements (§18/§19). Pure — takes
 * plain candidate data, returns an ordered list of placements to render.
 * Never mutates anything, never fires network requests; the caller
 * (article page) resolves candidates from the DB and this just decides.
 */

export type CandidatePlacement = {
  id: string;
  positionType: "top" | "after_paragraph" | "before_video" | "after_video" | "middle" | "before_conclusion" | "bottom";
  paragraphNumber: number | null;
  videoSlot: number | null;
  priority: number;
  adSlotId: string;
};

export type AdSafetySettings = {
  maxAdsPerArticle: number;
  minParagraphsBetweenAds: number;
  minContentLengthBeforeAds: number; // word count
  disableOnPages: boolean;
  disableOnShortArticles: boolean;
  shortArticleWordCount: number;
  excludedCategoryIds: string[];
  excludedPostIds: string[];
};

export type ResolvePlacementsInput = {
  candidates: CandidatePlacement[];
  safety: AdSafetySettings;
  context: {
    isPage: boolean;
    postId: string;
    categoryId: string | null;
    wordCount: number;
    paragraphCount: number;
    videoSlotsPresent: number[]; // which of 1/2/3 actually appear in this article's content
    adsEnabledOnEntity: boolean; // categories.ads_enabled / pages.ads_enabled
  };
};

/** A rough position number so placements can be ordered/compared for the min-gap rule, regardless of type. */
function positionRank(p: CandidatePlacement, paragraphCount: number): number {
  switch (p.positionType) {
    case "top":
      return 0;
    case "after_paragraph":
      return p.paragraphNumber ?? 0;
    case "before_video":
      return (p.videoSlot ?? 0) * 1000 - 0.5; // videos are interleaved with paragraphs; treat as coming after roughly that many paragraphs in a typical 3-video article
    case "after_video":
      return (p.videoSlot ?? 0) * 1000 + 0.5;
    case "middle":
      return paragraphCount / 2;
    case "before_conclusion":
      return Math.max(0, paragraphCount - 1);
    case "bottom":
      return paragraphCount + 1;
  }
}

export function resolvePlacements(input: ResolvePlacementsInput): CandidatePlacement[] {
  const { candidates, safety, context } = input;

  if (context.isPage && safety.disableOnPages) return [];
  if (!context.adsEnabledOnEntity) return [];
  if (safety.excludedPostIds.includes(context.postId)) return [];
  if (context.categoryId && safety.excludedCategoryIds.includes(context.categoryId)) return [];
  if (safety.disableOnShortArticles && context.wordCount < safety.shortArticleWordCount) return [];
  if (context.wordCount < safety.minContentLengthBeforeAds) return [];

  const valid = candidates.filter((c) => {
    if (c.positionType === "after_paragraph") {
      return c.paragraphNumber != null && c.paragraphNumber > 0 && c.paragraphNumber <= context.paragraphCount;
    }
    if (c.positionType === "before_video" || c.positionType === "after_video") {
      return c.videoSlot != null && context.videoSlotsPresent.includes(c.videoSlot);
    }
    return true;
  });

  // Highest priority first so the cap keeps the placements that matter most.
  const byPriority = [...valid].sort((a, b) => b.priority - a.priority);
  const capped = byPriority.slice(0, Math.max(0, safety.maxAdsPerArticle));

  // top/bottom are structural edges, not paragraph-spaced content — they
  // always render if selected above and never compete for the min-gap rule.
  // The gap rule only applies among placements interleaved with the content.
  const edges = capped.filter((p) => p.positionType === "top" || p.positionType === "bottom");
  const middle = capped.filter((p) => p.positionType !== "top" && p.positionType !== "bottom");

  const inDocOrder = [...middle].sort(
    (a, b) => positionRank(a, context.paragraphCount) - positionRank(b, context.paragraphCount)
  );

  const kept: CandidatePlacement[] = [];
  let lastRank: number | null = null;
  for (const placement of inDocOrder) {
    const rank = positionRank(placement, context.paragraphCount);
    if (lastRank === null || rank - lastRank >= safety.minParagraphsBetweenAds) {
      kept.push(placement);
      lastRank = rank;
    }
  }

  return [...edges.filter((p) => p.positionType === "top"), ...kept, ...edges.filter((p) => p.positionType === "bottom")];
}
