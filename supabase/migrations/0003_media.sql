create table public.media (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique, -- path inside the Supabase Storage bucket
  url text not null,                 -- public (or signed base) URL
  mime_type text not null,
  file_type text not null check (file_type in ('image', 'video', 'document')),
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  width int,
  height int,
  duration_seconds numeric(10, 3),   -- videos only; filled by a client-side metadata probe on upload
  alt_text text,
  caption text,
  description text,
  title text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.media is 'Supabase Storage-backed media library (images, videos, documents).';

create trigger media_set_updated_at
  before update on public.media
  for each row execute function public.set_updated_at();

create index media_file_type_idx on public.media (file_type);
create index media_uploaded_by_idx on public.media (uploaded_by);
create index media_created_at_idx on public.media (created_at desc);
