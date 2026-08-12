import { describe, it, expect } from "vitest";

import { resolveNextArticle, type PostSummary } from "@/lib/tracking/nextArticle";

function post(overrides: Partial<PostSummary>): PostSummary {
  return {
    id: "id",
    slug: "slug",
    title: "Title",
    status: "published",
    categoryId: "cat-1",
    publishedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("resolveNextArticle", () => {
  const current = post({ id: "current", slug: "current", publishedAt: "2024-01-05T00:00:00Z" });

  it("prefers the manual next_article_id when it's published", () => {
    const manual = post({ id: "manual", slug: "manual" });
    const result = resolveNextArticle({
      current,
      manualNext: manual,
      strategy: "same_category",
      sameCategoryCandidates: [post({ id: "other", slug: "other", publishedAt: "2024-01-06T00:00:00Z" })],
    });
    expect(result?.id).toBe("manual");
  });

  it("never returns a manually-selected article that is not published", () => {
    const manual = post({ id: "manual", status: "draft" });
    const fallback = post({ id: "fallback", slug: "fallback", publishedAt: "2024-01-06T00:00:00Z" });
    const result = resolveNextArticle({
      current,
      manualNext: manual,
      strategy: "same_category",
      sameCategoryCandidates: [fallback],
    });
    expect(result?.id).toBe("fallback");
  });

  it("same_category: picks the next chronologically-published article after the current one", () => {
    const older = post({ id: "older", slug: "older", publishedAt: "2024-01-01T00:00:00Z" });
    const next = post({ id: "next", slug: "next", publishedAt: "2024-01-06T00:00:00Z" });
    const evenLater = post({ id: "later", slug: "later", publishedAt: "2024-01-09T00:00:00Z" });

    const result = resolveNextArticle({
      current,
      manualNext: null,
      strategy: "same_category",
      sameCategoryCandidates: [evenLater, older, next],
    });
    expect(result?.id).toBe("next");
  });

  it("same_category: wraps to the earliest article when the current one is the newest", () => {
    const earliest = post({ id: "earliest", slug: "earliest", publishedAt: "2024-01-01T00:00:00Z" });
    const middle = post({ id: "middle", slug: "middle", publishedAt: "2024-01-03T00:00:00Z" });

    const result = resolveNextArticle({
      current: post({ id: "newest", publishedAt: "2024-02-01T00:00:00Z" }),
      manualNext: null,
      strategy: "same_category",
      sameCategoryCandidates: [earliest, middle],
    });
    expect(result?.id).toBe("earliest");
  });

  it("same_category: returns null with no other published articles in the category", () => {
    const result = resolveNextArticle({
      current,
      manualNext: null,
      strategy: "same_category",
      sameCategoryCandidates: [],
    });
    expect(result).toBeNull();
  });

  it("same_category: never returns an unpublished candidate", () => {
    const draft = post({ id: "draft", status: "draft", publishedAt: "2024-01-06T00:00:00Z" });
    const result = resolveNextArticle({
      current,
      manualNext: null,
      strategy: "same_category",
      sameCategoryCandidates: [draft],
    });
    expect(result).toBeNull();
  });

  it("algorithmic: picks the first published candidate from the pre-ranked list", () => {
    const draft = post({ id: "draft", status: "draft" });
    const ranked = post({ id: "ranked", slug: "ranked" });
    const result = resolveNextArticle({
      current,
      manualNext: null,
      strategy: "algorithmic",
      sameCategoryCandidates: [],
      algorithmicCandidates: [draft, ranked],
    });
    expect(result?.id).toBe("ranked");
  });
});
