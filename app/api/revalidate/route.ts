import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ path: z.string().trim().min(1).max(2048) });

/**
 * Generic on-demand revalidation endpoint, secret-protected. Admin server
 * actions already call `revalidatePath()` directly (same process, no need
 * for this), so this exists for *external* triggers — a Supabase Database
 * Webhook on the posts/pages table, a manual `curl`, a CI step, etc.
 *
 *   curl -X POST https://yoursite.com/api/revalidate \
 *     -H "Authorization: Bearer $REVALIDATE_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"path": "/articles/how-to-save-money"}'
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  revalidatePath(parsed.data.path);
  return NextResponse.json({ revalidated: true, path: parsed.data.path });
}
