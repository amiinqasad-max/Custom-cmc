-- ============================================================================
-- Security hardening (Supabase security advisor)
--
--   1. function_search_path_mutable: pin `search_path = public` on functions
--      that didn't already have it, so they can't be tricked by a caller-set
--      search_path into resolving an unqualified name to an attacker-created
--      object in another schema.
--   2. anon/authenticated_security_definer_function_executable: three
--      trigger-only functions (return type `trigger`) were unnecessarily
--      exposed as directly callable PostgREST RPCs. Revoking EXECUTE from
--      public/anon/authenticated does not affect trigger firing — that's
--      gated by TRIGGER privilege on the table, not EXECUTE on the function —
--      it only removes a meaningless (and confusing) direct RPC call.
--
-- get_my_role(), has_role_at_least(), and has_permission() are deliberately
-- left EXECUTE-able by anon/authenticated: they're SECURITY DEFINER by
-- design (RLS policies call them, and switching to SECURITY INVOKER would
-- break RLS's read of profiles.role for the calling user due to recursion),
-- and being callable directly as RPCs is intentional — the admin UI uses
-- them to check "what can I do" without a wider profiles read.
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.role_rank(r text)
returns int
language sql
immutable
set search_path = public
as $$
  select case r
    when 'super_admin' then 4
    when 'admin' then 3
    when 'editor' then 2
    when 'author' then 1
    else 0
  end;
$$;

create or replace function public.set_post_video_key()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.video_key is null then
    new.video_key := 'article_' || new.post_id::text || '_video_' || new.slot_index::text;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role_changes() from public, anon, authenticated;
revoke execute on function public.force_pending_comment_status() from public, anon, authenticated;
