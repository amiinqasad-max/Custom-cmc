# Custom CMS

A production-ready, fully custom content management system — **not WordPress** — purpose-built
for an article/content site with tracked in-article video, an article → 3-videos → completion →
auto-next reading flow, a real SEO system, an AdSense ad-placement manager with safety rules,
first-party analytics, and role-based admin.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full architecture, database schema,
and design-decision rationale.

## Stack

Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS v4 · a hand-built shadcn/ui-style
component kit · TipTap editor · React Hook Form + Zod · TanStack Query · Supabase (Postgres, Auth,
Storage) · Row Level Security + app-layer RBAC · Vitest.

## Getting started

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) (or use an existing one). You'll need,
from **Project Settings → API**:

- Project URL
- The `anon`/`publishable` key
- The `service_role`/secret key (keep this one server-side only)

### 2. Apply the database migrations

All schema is in `supabase/migrations/`, applied in filename order, followed by `supabase/seed.sql`
for permissions/default settings/starter content. Two ways to apply them:

**Supabase CLI** (recommended if you have it installed and linked to your project):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase db execute -f supabase/seed.sql
```

**SQL editor** (no CLI needed): open your project's SQL Editor in the Supabase dashboard, and run
each file in `supabase/migrations/` in order (`0001_...sql` through `0013_...sql`), then run
`supabase/seed.sql`.

Either way, this also creates the `media` Storage bucket and its policies (in
`0013_storage.sql`) — no separate Storage setup needed.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from step 1. See `.env.example` for the full list (site URL,
revalidation secret, optional AdSense client ID).

### 4. Install and run

```bash
pnpm install
pnpm dev
```

Visit `/auth/login`. **The very first account you create becomes `super_admin` automatically**
(see the `handle_new_user()` trigger in `0002_profiles_and_rbac.sql`) — sign up once via Supabase
Auth (e.g. temporarily enable email/password sign-up in your Supabase Auth settings, or use the
dashboard's "Add user" to create the first account), then everyone after that is invited from
**Admin → Users** and defaults to `author`.

### 5. Verify

```bash
pnpm lint    # ESLint
pnpm test    # Vitest — pure business-logic unit tests
pnpm build   # Full production build + typecheck
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local dev server |
| `pnpm build` | Production build (also runs TypeScript checking) |
| `pnpm start` | Serve a production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (unit tests for `lib/tracking`, `lib/ads`, `lib/content`, `lib/auth`) |

## Deploying

Built for **Vercel + Supabase**:

1. Push this repo to GitHub (already done if you're reading this from the repo) and import it into
   Vercel.
2. Set the same environment variables from `.env.local` in the Vercel project (Production +
   Preview). Set `NEXT_PUBLIC_SITE_URL` to your real domain.
3. Deploy. The public site (home, articles, categories, tags, pages) uses ISR — publishing an
   article revalidates its page immediately via `revalidatePath`, everything else refreshes on the
   interval set in **Admin → Settings → Performance**.
4. Optional: point a cron (Vercel Cron, GitHub Actions, etc.) at a route calling
   `publishDuePosts()` from `services/posts.service.ts` to auto-publish scheduled articles — wire
   it into a `/api/cron/publish-scheduled` route handler if you use scheduled publishing.

## Project layout

```
app/(public)/     Public site: home, /articles/[slug], /category/[slug], /tag/[slug], /page/[slug]
app/admin/        Admin dashboard (every section from the left nav has its own folder + actions.ts)
app/api/track/    Server-role tracking endpoints (article, video, ad) — see docs/ARCHITECTURE.md
components/       admin/, editor/, public/, ui/ (the hand-built shadcn-style kit)
lib/              Pure business logic (tracking, ads, content, seo) + Supabase client factories
services/         Data-access layer — every DB query lives here, called from server actions
schemas/          Zod schemas, shared client/server
supabase/         migrations/ + seed.sql
tests/            Vitest — mirrors lib/tracking, lib/ads, lib/content, lib/auth
```

## What's fully built vs. scaffolded

Everything in the 45-section spec has real, working code behind it — schema, RLS, services, admin
UI, and public rendering — with two exceptions that need credentials only you can provide:

- **Official Google AdSense Reporting API** (estimated earnings/impressions/CTR from Google
  itself, as opposed to this app's own internal ad-rendering analytics): the `adsense_reports`
  table and the internal/official split in the UI are in place; connect your own Google OAuth
  client and wire a sync job to populate it (see the notice on **Admin → Advertisements**).
- **Outbound email** (Supabase Auth invite emails, any future transactional email): configure an
  SMTP provider in your Supabase project's Auth settings. The **Settings → Email** tab only holds
  non-secret display fields (from name/address) — credentials always stay in provider config or
  server env vars, never in the database.
