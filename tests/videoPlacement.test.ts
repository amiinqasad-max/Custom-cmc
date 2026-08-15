import { describe, it, expect } from "vitest";

import { resolveVideoPlacements, groupVideoPlacementsByParagraph } from "@/lib/content/videoPlacement";

describe("resolveVideoPlacements", () => {
  it("places all 3 videos at 30/60/90% of a 10-paragraph article", () => {
    const result = resolveVideoPlacements({ paragraphCount: 10, configuredSlots: [1, 2, 3] });
    expect(result).toEqual([
      { slotIndex: 1, afterParagraph: 3 }, // round(0.30 * 10)
      { slotIndex: 2, afterParagraph: 6 }, // round(0.60 * 10)
      { slotIndex: 3, afterParagraph: 9 }, // round(0.90 * 10)
    ]);
  });

  it("only places configured slots — an unconfigured slot is skipped entirely", () => {
    const result = resolveVideoPlacements({ paragraphCount: 10, configuredSlots: [2] });
    expect(result).toEqual([{ slotIndex: 2, afterParagraph: 6 }]);
  });

  it("always returns results sorted by slot index regardless of input order", () => {
    const result = resolveVideoPlacements({ paragraphCount: 10, configuredSlots: [3, 1, 2] });
    expect(result.map((r) => r.slotIndex)).toEqual([1, 2, 3]);
  });

  it("never targets a boundary before paragraph 1, even for a very low percentage", () => {
    const result = resolveVideoPlacements({
      paragraphCount: 20,
      configuredSlots: [1],
      percentagesBySlot: [1, 60, 90],
    });
    expect(result[0].afterParagraph).toBeGreaterThanOrEqual(1);
  });

  it("never targets a boundary past the last paragraph, even at 100%", () => {
    const result = resolveVideoPlacements({
      paragraphCount: 5,
      configuredSlots: [3],
      percentagesBySlot: [30, 60, 100],
    });
    expect(result[0].afterParagraph).toBeLessThanOrEqual(5);
  });

  it("clamps every slot to paragraph 1 on a single-paragraph article — never paragraph 0", () => {
    const result = resolveVideoPlacements({ paragraphCount: 1, configuredSlots: [1, 2, 3] });
    expect(result).toEqual([
      { slotIndex: 1, afterParagraph: 1 },
      { slotIndex: 2, afterParagraph: 1 },
      { slotIndex: 3, afterParagraph: 1 },
    ]);
  });

  it("falls back to afterParagraph 0 (render-at-end sentinel) when there are no paragraphs at all", () => {
    const result = resolveVideoPlacements({ paragraphCount: 0, configuredSlots: [1, 2] });
    expect(result).toEqual([
      { slotIndex: 1, afterParagraph: 0 },
      { slotIndex: 2, afterParagraph: 0 },
    ]);
  });

  it("respects custom configured percentages from settings", () => {
    const result = resolveVideoPlacements({
      paragraphCount: 10,
      configuredSlots: [1, 2, 3],
      percentagesBySlot: [10, 50, 80],
    });
    expect(result).toEqual([
      { slotIndex: 1, afterParagraph: 1 },
      { slotIndex: 2, afterParagraph: 5 },
      { slotIndex: 3, afterParagraph: 8 },
    ]);
  });

  it("ignores out-of-range slot numbers", () => {
    const result = resolveVideoPlacements({ paragraphCount: 10, configuredSlots: [0, 1, 4, 99] });
    expect(result).toEqual([{ slotIndex: 1, afterParagraph: 3 }]);
  });

  it("de-duplicates a slot listed more than once", () => {
    const result = resolveVideoPlacements({ paragraphCount: 10, configuredSlots: [1, 1, 1] });
    expect(result).toEqual([{ slotIndex: 1, afterParagraph: 3 }]);
  });
});

describe("groupVideoPlacementsByParagraph", () => {
  it("groups placements by target paragraph, preserving ascending slot order within a group", () => {
    const grouped = groupVideoPlacementsByParagraph([
      { slotIndex: 1, afterParagraph: 3 },
      { slotIndex: 2, afterParagraph: 3 },
      { slotIndex: 3, afterParagraph: 5 },
    ]);
    expect(grouped.get(3)).toEqual([1, 2]);
    expect(grouped.get(5)).toEqual([3]);
    expect(grouped.get(1)).toBeUndefined();
  });

  it("returns an empty map for no placements", () => {
    expect(groupVideoPlacementsByParagraph([]).size).toBe(0);
  });
});
