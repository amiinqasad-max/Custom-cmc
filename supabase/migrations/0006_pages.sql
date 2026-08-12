create table public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  content_html text not null default '',
  featured_image_id uuid references public.media (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  ads_enabled boolean not null default false, -- pages default to no ads per §19 safeguards
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
comment on table public.pages is 'Static-ish site pages: Home, About, Contact, Privacy Policy, Terms, ...';

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

create index pages_status_idx on public.pages (status);
