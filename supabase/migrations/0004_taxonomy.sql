create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_id uuid references public.media (id) on delete set null,
  parent_id uuid references public.categories (id) on delete set null,
  sort_order int not null default 0,
  ads_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.categories is 'Optionally hierarchical (parent_id) article categories.';

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create index categories_parent_id_idx on public.categories (parent_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();
