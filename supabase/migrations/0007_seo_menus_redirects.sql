-- ============================================================================
-- Polymorphic SEO metadata — one table backs posts, pages, and categories so
-- the SEO panel / sitemap generator / schema builders are written once.
-- ============================================================================
create table public.seo_metadata (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('post', 'page', 'category')),
  entity_id uuid not null,
  seo_title text,
  meta_description text,
  canonical_url text,
  robots_index boolean not null default true,
  robots_follow boolean not null default true,
  og_title text,
  og_description text,
  og_image_id uuid references public.media (id) on delete set null,
  twitter_card text not null default 'summary_large_image'
    check (twitter_card in ('summary', 'summary_large_image')),
  schema_type text, -- e.g. 'Article', 'WebPage' — overrides the type-derived default
  schema_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  unique (entity_type, entity_id)
);
comment on table public.seo_metadata is
  'Polymorphic per-entity SEO fields, keyed by (entity_type, entity_id). No FK to the entity tables since entity_type varies.';

create trigger seo_metadata_set_updated_at
  before update on public.seo_metadata
  for each row execute function public.set_updated_at();

create index seo_metadata_entity_idx on public.seo_metadata (entity_type, entity_id);

-- ============================================================================
-- Menus
-- ============================================================================
create table public.menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location text not null default 'custom' check (location in ('header', 'footer', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger menus_set_updated_at
  before update on public.menus
  for each row execute function public.set_updated_at();

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  parent_id uuid references public.menu_items (id) on delete cascade,
  label text not null,
  type text not null check (type in ('page', 'article', 'category', 'custom_url')),
  target_id uuid, -- resolved id when type in (page, article, category); NULL for custom_url
  url text,       -- resolved/custom URL; for page/article/category this is a cache of the computed path
  sort_order int not null default 0,
  is_enabled boolean not null default true,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint menu_items_target_or_url check (
    (type = 'custom_url' and url is not null) or
    (type <> 'custom_url' and target_id is not null)
  )
);
comment on table public.menu_items is
  'Nested (parent_id) menu items. type=custom_url uses url directly; other types resolve target_id to a path at render time.';

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create index menu_items_menu_id_idx on public.menu_items (menu_id, sort_order);
create index menu_items_parent_id_idx on public.menu_items (parent_id);

-- ============================================================================
-- Redirects + 404 monitoring
-- ============================================================================
create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code int not null default 301 check (status_code in (301, 302)),
  is_active boolean not null default true,
  hit_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger redirects_set_updated_at
  before update on public.redirects
  for each row execute function public.set_updated_at();

create index redirects_active_idx on public.redirects (is_active);

create table public.not_found_logs (
  id bigint generated always as identity primary key,
  path text not null,
  referrer text,
  hit_count bigint not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  unique (path)
);
comment on table public.not_found_logs is 'Aggregated 404 hits, one row per distinct path, incremented on repeat hits.';
