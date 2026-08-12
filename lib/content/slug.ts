import slugify from "slugify";

export function slugifyTitle(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true }).slice(0, 200);
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
