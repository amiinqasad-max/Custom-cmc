create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  author_user_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_email text,
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'spam')),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.comments is 'Threaded (parent_id) article comments, moderated by editor+.';

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create index comments_post_id_idx on public.comments (post_id, created_at desc);
create index comments_status_idx on public.comments (status);

-- Non-staff can only ever create pending comments, regardless of what the
-- client sends — this is the DB-level backstop on top of the RLS WITH CHECK.
create or replace function public.force_pending_comment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role_at_least('editor') then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger comments_force_pending_status
  before insert on public.comments
  for each row execute function public.force_pending_comment_status();

create table public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,        -- e.g. 'post.published', 'settings.updated'
  resource_type text,          -- e.g. 'post', 'page', 'menu', 'settings'
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
comment on table public.activity_logs is 'Admin audit trail: who did what, to which resource, when.';

create index activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index activity_logs_user_id_idx on public.activity_logs (user_id);
create index activity_logs_resource_idx on public.activity_logs (resource_type, resource_id);
