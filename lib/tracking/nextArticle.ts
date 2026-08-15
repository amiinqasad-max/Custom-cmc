/**
 * Next-article resolution (§8/§9). Pure — takes plain candidate data,
 * returns a decision. The DB-fetching wrapper lives in
 * services/tracking.service.ts. Priority order:
 *
 *   1. Manually selected `next_article_id` on the post, IF it's published.
 *   2. Global strategy: same_category (next chronological article in the
 *      same category after this one; wraps to the category's earliest
 *      article if this was the newest), algorithmic (caller-supplied ranked
 *      candidates, e.g. most recently published), or random (uniformly picks
 *      any published article — including ones already read — so a reader
 *      never runs out; loops forever as long as at least one published
 *      article exists anywhere on the site).
 *   3. Never returns an unpublished post.
 */

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  status: string;
  categoryId: string | null;
  publishedAt: string | null;
};

export function resolveNextArticle(params: {
  current: PostSummary;
  manualNext: PostSummary | null;
  strategy: "same_category" | "algorithmic" | "random";
  sameCategoryCandidates: PostSummary[]; // published, same category, excludes current, any order
  algorithmicCandidates?: PostSummary[]; // published, pre-ranked by caller, excludes current
  /**
   * Pool to pick from for "random". The caller excludes the current article
   * when other published articles exist, and falls back to including the
   * current article only when it's the sole published article on the site
   * (so the infinite loop always has something to hand back rather than
   * dead-ending). Any order — this function picks uniformly at random.
   */
  randomCandidates?: PostSummary[];
  /** Injectable RNG (defaults to Math.random) so "random" is deterministic in tests. */
  random?: () => number;
}): PostSummary | null {
  const isPublished = (p: PostSummary | null): p is PostSummary => !!p && p.status === "published";

  if (isPublished(params.manualNext)) return params.manualNext;

  if (params.strategy === "random") {
    const pool = (params.randomCandidates ?? []).filter(isPublished);
    if (pool.length === 0) return null;
    const rand = params.random ?? Math.random;
    const index = Math.min(Math.floor(rand() * pool.length), pool.length - 1);
    return pool[index];
  }

  if (params.strategy === "algorithmic") {
    const candidate = (params.algorithmicCandidates ?? []).find(isPublished);
    return candidate ?? null;
  }

  // same_category: earliest-published article that came after the current
  // one; if the current article is the newest, wrap to the category's
  // oldest other article so a category never dead-ends.
  const published = params.sameCategoryCandidates.filter(isPublished);
  if (published.length === 0) return null;

  const currentPublishedAt = params.current.publishedAt ? new Date(params.current.publishedAt).getTime() : 0;
  const after = published
    .filter((p) => (p.publishedAt ? new Date(p.publishedAt).getTime() : 0) > currentPublishedAt)
    .sort((a, b) => new Date(a.publishedAt ?? 0).getTime() - new Date(b.publishedAt ?? 0).getTime());

  if (after.length > 0) return after[0];

  const sorted = [...published].sort(
    (a, b) => new Date(a.publishedAt ?? 0).getTime() - new Date(b.publishedAt ?? 0).getTime()
  );
  return sorted[0] ?? null;
}
