import slugify from "slugify";

export function slugifyTitle(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true }).slice(0, 200);
}

/**
 * Normalizes free-typed slug input as the user types, so it always matches
 * postSchema/pageSchema's `^[a-z0-9-]+$` rule. Needed because mobile
 * keyboards auto-capitalize the first letter of a plain text input by
 * default — without this, typing directly into the slug field produces an
 * invalid slug and the save/publish button silently does nothing (zodResolver
 * blocks submission on invalid input with no native browser feedback).
 */
export function sanitizeSlugInput(input: string): string {
  return input.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/**
 * Appends -2, -3, ... until `candidate` isn't in `existingSlugs`. Pure and
 * unit-testable; callers fetch the existing-slugs set from the DB first.
 */
export function uniqueSlug(candidate: string, existingSlugs: Set<string>, ignoreSlug?: string): string {
  const base = candidate || "untitled";
  if (base === ignoreSlug || !existingSlugs.has(base)) return base;

  let n = 2;
  let next = `${base}-${n}`;
  while (next !== ignoreSlug && existingSlugs.has(next)) {
    n += 1;
    next = `${base}-${n}`;
  }
  return next;
}
