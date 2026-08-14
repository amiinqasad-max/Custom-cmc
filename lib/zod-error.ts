import { ZodError, type ZodType } from "zod";

/**
 * Drop-in replacement for `schema.parse(data)` inside server actions.
 *
 * Next.js server actions only serialize a thrown Error's `.message` back to
 * the client (custom properties like `ZodError.issues` are lost), and
 * `ZodError.prototype.message` is a JSON-stringified array of issues — so a
 * raw `schema.parse()` failure shows up as an unreadable blob in whatever
 * `toast.error(err.message)` call catches it in the admin UI. This re-throws
 * the first issue's own message instead, which is exactly the readable text
 * every schema in `schemas/` already defines (e.g. "Lowercase letters,
 * numbers, hyphens only").
 */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(err.issues[0]?.message ?? "Invalid input");
    }
    throw err;
  }
}
