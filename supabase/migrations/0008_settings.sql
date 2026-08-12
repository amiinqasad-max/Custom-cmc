-- Grouped key/value settings store. Every settings tab in the admin
-- (General, SEO, Reading, Advertisements, Analytics, Security, ...) reads and
-- writes exactly one row here. No secrets are ever stored in this table —
-- credentials (SMTP, OAuth) belong in server environment variables only.
create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
comment on table public.settings is
  'Grouped settings blobs, one row per group (general, reading, ads, seo_defaults, ...). See lib/settings/schema.ts for the shape of each group.';

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();
