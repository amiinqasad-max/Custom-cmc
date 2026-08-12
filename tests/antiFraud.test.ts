import { describe, it, expect } from "vitest";

import { clampPercent, clampWatchedSeconds, clampTimeSpent, monotonicMax } from "@/lib/tracking/antiFraud";

describe("clampPercent", () => {
  it("clamps negative values to 0", () => expect(clampPercent(-50)).toBe(0));
  it("clamps values over 100 to 100", () => expect(clampPercent(250)).toBe(100));
  it("rejects NaN / garbage input", () => expect(clampPercent("not a number")).toBe(0));
  it("rounds fractional values", () => expect(clampPercent(42.6)).toBe(43));
});

describe("clampWatchedSeconds", () => {
  it("rejects negative watched time", () => expect(clampWatchedSeconds(-5, 10)).toBe(0));
  it("caps watched seconds at duration + 5% tolerance", () => {
    expect(clampWatchedSeconds(1000, 10)).toBeCloseTo(10.5);
  });
  it("allows unlimited watched seconds when duration is unknown", () => {
    expect(clampWatchedSeconds(500, null)).toBe(500);
  });
});

describe("clampTimeSpent", () => {
  it("never lets cumulative time regress", () => {
    expect(clampTimeSpent(120, 50)).toBe(120);
  });
  it("caps a single update's jump to maxDeltaSeconds", () => {
    expect(clampTimeSpent(0, 99999, 120)).toBe(120);
  });
  it("accepts a normal incremental heartbeat", () => {
    expect(clampTimeSpent(60, 75, 120)).toBe(75);
  });
  it("falls back to the previous value on garbage input", () => {
    expect(clampTimeSpent(60, "nope" as unknown as number)).toBe(60);
  });
});

describe("monotonicMax", () => {
  it("keeps the higher of two values, immune to seeking backward", () => {
    expect(monotonicMax(9, 3)).toBe(9);
    expect(monotonicMax(3, 9)).toBe(9);
  });
});
