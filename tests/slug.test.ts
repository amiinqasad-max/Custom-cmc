import { describe, it, expect } from "vitest";

import { slugifyTitle, uniqueSlug } from "@/lib/content/slug";

describe("slugifyTitle", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyTitle("How To Save Money")).toBe("how-to-save-money");
  });

  it("strips punctuation", () => {
    expect(slugifyTitle("What's New? (2024 Edition!)")).toBe("whats-new-2024-edition");
  });
});

describe("uniqueSlug", () => {
  it("returns the candidate unchanged if not taken", () => {
    expect(uniqueSlug("hello-world", new Set(["other"]))).toBe("hello-world");
  });

  it("appends -2, -3, ... until free", () => {
    const existing = new Set(["hello-world", "hello-world-2", "hello-world-3"]);
    expect(uniqueSlug("hello-world", existing)).toBe("hello-world-4");
  });

  it("does not treat a slug as taken if it belongs to the article being edited (ignoreSlug)", () => {
    const existing = new Set(["hello-world"]);
    expect(uniqueSlug("hello-world", existing, "hello-world")).toBe("hello-world");
  });
});
