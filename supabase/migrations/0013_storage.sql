-- ============================================================================
-- Supabase Storage bucket + policies for the media library.
-- One public bucket; write access gated by RBAC, matching the `media` table.
-- Actual file-type/size validation happens both client-side (schemas/media.ts)
-- and server-side before upload (services/media.service.ts) — Storage-level
-- policies are the last line of defense, not the primary control.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  524288000, -- 500MB hard ceiling; actual per-type limits enforced in app code
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy media_bucket_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy media_bucket_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.has_role_at_least('author'));

create policy media_bucket_owner_or_editor_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (owner = auth.uid() or public.has_role_at_least('editor'))
  );

create policy media_bucket_owner_or_editor_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (owner = auth.uid() or public.has_role_at_least('editor'))
  );
