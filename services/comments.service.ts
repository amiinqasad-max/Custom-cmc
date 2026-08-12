import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { logActivity } from "@/services/activity.service";
import type { CommentStatus } from "@/types/database.types";

export async function listComments(status?: CommentStatus | "all") {
  const supabase = await createClient();
  let query = supabase.from("comments").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to list comments: ${error.message}`);

  const postIds = [...new Set((data ?? []).map((c) => c.post_id))];
  const { data: posts } = postIds.length ? await supabase.from("posts").select("id, title, slug").in("id", postIds) : { data: [] };
  const postById = new Map((posts ?? []).map((p) => [p.id, p]));

  return (data ?? []).map((c) => ({ ...c, post: postById.get(c.post_id) ?? null }));
}

export async function setCommentStatus(id: string, status: CommentStatus, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("comments").update({ status }).eq("id", id);
  if (error) throw new Error(`Failed to update comment: ${error.message}`);
  await logActivity(supabase, { userId, action: "comment.status_changed", resourceType: "comment", resourceId: id, metadata: { status } });
}

export async function deleteComment(id: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete comment: ${error.message}`);
  await logActivity(supabase, { userId, action: "comment.deleted", resourceType: "comment", resourceId: id });
}

/** Public comment submission — RLS forces status to 'pending' for non-staff via a trigger, regardless of what's sent here. */
export async function submitComment(input: {
  postId: string;
  authorName: string;
  authorEmail?: string | null;
  content: string;
  parentId?: string | null;
  authorUserId?: string | null;
}) {
  const supabase = createPublicClient();
  const { error } = await supabase.from("comments").insert({
    post_id: input.postId,
    author_name: input.authorName,
    author_email: input.authorEmail ?? null,
    content: input.content,
    parent_id: input.parentId ?? null,
    author_user_id: input.authorUserId ?? null,
  });
  if (error) throw new Error(`Failed to submit comment: ${error.message}`);
}

export async function getApprovedCommentsForPost(postId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .eq("status", "approved")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load comments: ${error.message}`);
  return data ?? [];
}
