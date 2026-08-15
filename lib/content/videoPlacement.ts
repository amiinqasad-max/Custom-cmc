/**
 * Automatic video placement. Pure — takes the article's paragraph count and
 * which of the 3 video slots are actually configured, returns where each one
 * should render. No TipTap mutation involved: the admin only ever picks a
 * video file per slot (services/posts.service.ts#syncPostVideos writes
 * post_videos independently of `content`); the public page
 * (components/public/article-body.tsx) calls this at render time to decide
 * where to interleave each `<TrackedVideoPlayer>` among the article's
 * existing top-level blocks.
 *
 * "Safe content boundary" means exactly one thing here: a video can only
 * land *between* two top-level blocks (after a paragraph has fully closed),
 * never inside one — so a paragraph or any other HTML element can never be
 * split. That's enforced structurally: the only unit this function reasons
 * about is "after paragraph N", clamped to 1..paragraphCount.
 */

export type VideoPlacement = { slotIndex: number; afterParagraph: number };

export type ResolveVideoPlacementsParams = {
  /** Top-level paragraph count in the article body (analyzeContent().paragraphCount). */
  paragraphCount: number;
  /** Slots (1-3) that actually have a video configured — an unconfigured slot is skipped entirely. */
  configuredSlots: number[];
  /**
   * Reading-progress percentage (1-100) at which each slot appears, indexed
   * by slot number: index 0 = slot 1's trigger point, etc. Defaults to
   * [30, 60, 90] if omitted (Settings -> Reading normally supplies this).
   */
  percentagesBySlot?: readonly [number, number, number];
};

const DEFAULT_PERCENTAGES: readonly [number, number, number] = [30, 60, 90];

/**
 * Computes, purely from paragraph count and configured percentages, which
 * paragraph each configured video slot renders after.
 *
 *  - Never targets a boundary before paragraph 1 or after the last paragraph
 *    — every placement lands strictly between two existing blocks.
 *  - If the article has zero paragraphs (e.g. only headings/images), there's
 *    no safe mid-content boundary to use; every configured video still needs
 *    to render, so it's returned with `afterParagraph: 0`, a sentinel the
 *    caller (ArticleBody) renders at the very end of the content instead of
 *    dropping it.
 *  - Multiple slots can land on the same paragraph on a very short article
 *    (e.g. only 2 paragraphs but 3 videos) — the caller stacks them there,
 *    in ascending slot order, which this function guarantees by always
 *    returning results sorted by slotIndex.
 */
export function resolveVideoPlacements(params: ResolveVideoPlacementsParams): VideoPlacement[] {
  const { paragraphCount, configuredSlots } = params;
  const percentages = params.percentagesBySlot ?? DEFAULT_PERCENTAGES;

  const slots = [...new Set(configuredSlots)].filter((s) => s >= 1 && s <= 3).sort((a, b) => a - b);

  return slots.map((slotIndex) => {
    if (paragraphCount <= 0) return { slotIndex, afterParagraph: 0 };

    const percent = percentages[slotIndex - 1] ?? DEFAULT_PERCENTAGES[slotIndex - 1] ?? 90;
    const target = Math.round((percent / 100) * paragraphCount);
    const afterParagraph = Math.min(Math.max(target, 1), paragraphCount);
    return { slotIndex, afterParagraph };
  });
}

/** Groups placements by their target paragraph, for O(1) lookup while walking the document. */
export function groupVideoPlacementsByParagraph(placements: VideoPlacement[]): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const p of placements) {
    const list = map.get(p.afterParagraph) ?? [];
    list.push(p.slotIndex);
    map.set(p.afterParagraph, list);
  }
  return map;
}
