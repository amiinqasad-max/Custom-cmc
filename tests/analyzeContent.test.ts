import { describe, it, expect } from "vitest";

import { analyzeContent } from "@/lib/content/analyze";
import type { TiptapDoc } from "@/lib/content/types";

function textNode(text: string) {
  return { type: "text", text };
}

const doc: TiptapDoc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [textNode("This is the first paragraph with six words.")] },
    { type: "articleVideo", attrs: { slotIndex: 1 } },
    { type: "paragraph", content: [textNode("Second paragraph here.")] },
    { type: "articleVideo", attrs: { slotIndex: 2 } },
    { type: "paragraph", content: [textNode("Third and final paragraph of this test document.")] },
    { type: "articleVideo", attrs: { slotIndex: 3 } },
  ],
};

describe("analyzeContent", () => {
  it("counts top-level paragraphs only", () => {
    expect(analyzeContent(doc).paragraphCount).toBe(3);
  });

  it("finds all three video slots in document order", () => {
    expect(analyzeContent(doc).videoSlots).toEqual([1, 2, 3]);
  });

  it("computes a word count across all paragraphs", () => {
    expect(analyzeContent(doc).wordCount).toBeGreaterThan(10);
  });

  it("computes a reading time of at least 1 minute", () => {
    expect(analyzeContent(doc).readingTimeMinutes).toBeGreaterThanOrEqual(1);
  });

  it("handles an empty document", () => {
    const empty: TiptapDoc = { type: "doc", content: [] };
    const result = analyzeContent(empty);
    expect(result).toEqual({ paragraphCount: 0, wordCount: 0, readingTimeMinutes: 1, videoSlots: [], characterCount: 0 });
  });
});
