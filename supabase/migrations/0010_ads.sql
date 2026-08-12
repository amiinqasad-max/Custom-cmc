create table public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ad_client text not null, -- Google AdSense "ca-pub-..." client id
  ad_slot text not null,   -- AdSense ad unit slot id
  format text not null default 'auto' check (format in ('auto', 'horizontal', 'vertical', 'rectangle', 'in-article')),
  responsive boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.ad_slots is 'Reusable AdSense ad unit definitions. Never referenced directly from article content — see ad_placements.';

create trigger ad_slots_set_updated_at
  before update on public.ad_slots
  for each row execute function public.set_updated_at();

create table public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ad_slot_id uuid not null references public.ad_slots (id) on delete cascade,
  position_type text not null check (
    position_type in ('top', 'after_paragraph', 'before_video', 'after_video', 'middle', 'before_conclusion', 'bottom')
  ),
  paragraph_number int check (paragraph_number is null or paragraph_number > 0), -- for after_paragraph
  video_slot int check (video_slot is null or video_slot between 1 and 3),        -- for before_video / after_video
  priority int not null default 0, -- higher wins when max_ads_per_article caps the candidate list
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ad_placements_paragraph_requires_type
    check (position_type = 'after_paragraph' or paragraph_number is null),
  constraint ad_placements_video_slot_requires_type
    check (position_type in ('before_video', 'after_video') or video_slot is null)
);
comment on table public.ad_placements is
  'Global, reusable ad placement rules. Actual per-article rendering is computed by lib/ads/resolvePlacements.ts, which also enforces the safety caps in the "ads" settings group.';

create trigger ad_placements_set_updated_at
  before update on public.ad_placements
  for each row execute function public.set_updated_at();

create index ad_placements_enabled_idx on public.ad_placements (is_enabled);

-- Per-article override: disable (or, later, force-enable) a global placement
-- on one specific article without touching the global rule.
create table public.post_ad_placements (
  post_id uuid not null references public.posts (id) on delete cascade,
  ad_placement_id uuid not null references public.ad_placements (id) on delete cascade,
  is_enabled boolean not null default false,
  primary key (post_id, ad_placement_id)
);

alter table public.engagement_events
  add constraint engagement_events_ad_placement_fk
  foreign key (ad_placement_id) references public.ad_placements (id) on delete set null;

-- Internal ad *rendering* analytics — explicitly NOT official AdSense data.
create table public.ad_events (
  id bigint generated always as identity primary key,
  ad_placement_id uuid references public.ad_placements (id) on delete set null,
  post_id uuid references public.posts (id) on delete cascade,
  session_token uuid,
  event_type text not null check (event_type in ('request', 'load', 'render', 'impression_estimated', 'viewable')),
  created_at timestamptz not null default now()
);
comment on table public.ad_events is
  'Internal, best-effort ad rendering analytics (requested/loaded/rendered/estimated-viewable). Not official AdSense impression/revenue data — see adsense_reports for that.';

create index ad_events_placement_created_idx on public.ad_events (ad_placement_id, created_at desc);
create index ad_events_post_id_idx on public.ad_events (post_id);

-- Cache table for a future sync job against the official Google AdSense
-- Reporting API (requires the site owner's own OAuth client — out of scope
-- to wire up live without those credentials; this table + a documented sync
-- interface is the scaffold for it). Never populated from client-side data.
create table public.adsense_reports (
  id bigint generated always as identity primary key,
  report_date date not null,
  post_id uuid references public.posts (id) on delete set null,
  impressions bigint,
  clicks bigint,
  ctr numeric(6, 4),
  estimated_earnings numeric(12, 4),
  page_rpm numeric(12, 4),
  currency text default 'USD',
  synced_at timestamptz not null default now(),

  unique (report_date, post_id)
);
comment on table public.adsense_reports is
  'Cache of official AdSense Reporting API results (impressions/clicks/CTR/estimated earnings), populated by a server-side sync job you configure with your own Google OAuth client. Kept strictly separate from ad_events (internal rendering analytics).';
