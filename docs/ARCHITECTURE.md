# Architecture

This document is the as-built reference for the Custom CMS: the schema, the design decisions
behind it, and how the signature article → 3 videos → completion → auto-next flow actually works.
It mirrors the plan approved before implementation, updated to match what was actually shipped.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · React 19 · Tailwind CSS v4 · a hand-written
shadcn/ui-style component kit (`components/ui`) · TipTap 3 (editor) · React Hook Form + Zod ·
TanStack Query (client-side admin data where needed) · Supabase (Postgres 15, Auth, Storage) · Row
Level Security + an app-layer permission matrix · Vitest.

## Key design decisions

1. **Business logic stays pure and server-authoritative.** `lib/tracking/completion.ts`,
   `lib/tracking/nextArticle.ts`, `lib/ads/resolvePlacements.ts`, and `lib/tracking/antiFraud.ts`
   are plain functions: plain data in, plain data out, no I/O. Thin wrappers in `services/` fetch
   data and call them. This is what makes the completion rule and ad-safety rules unit-testable
   without a database (see `tests/`), and it's what guarantees the client can never just POST
   `completed: true` — completion is recomputed from stored state after every write.
2. **Two-layer authorization.** RLS policies (`supabase/migrations/0012_rls_policies.sql`) enforce
   coarse role tiers (author/editor/admin/super_admin) and "own resource" rules directly in
   Postgres. A `role_permissions` table plus `lib/auth/permissions.ts` drives fine-grained
   UI-gating and server-action checks (`assertPermission`). Both layers are real enforcement, not
   just UI polish — a request that clears `assertPermission` but violates RLS still fails, and
   vice versa.
3. **Tracking never writes from the browser directly to Postgres.** `/api/track/article`,
   `/api/track/video`, `/api/track/ad` run server-side with the service-role client, validate with
   Zod, run anti-fraud clamps, then write. The tracking tables (`article_sessions`,
   `post_video_progress`, `engagement_events`, `ad_events`) have RLS enabled with **no**
   insert/update policy for `anon`/`authenticated` at all — the only way in is the service role.
4. **Session continuity without per-second writes.** A `session_token` (`crypto.randomUUID()`) is
   cached in `sessionStorage` per article (`lib/tracking/session-token.ts`), so a refresh or
   tab-return resumes the same DB rows instead of creating duplicates. Progress is batched:
   milestone crossings flush immediately, a heartbeat flushes every 15s (configurable), and
   `visibilitychange`/`pagehide` flush via `navigator.sendBeacon`. Nothing writes every second.
5. **Ads are never hard-coded in content.** TipTap content only ever contains the 3 tracked video
   blocks plus normal rich content. Ad placement is entirely config-driven:
   `lib/ads/resolvePlacements.ts` computes, at render time, which ads actually appear after
   applying every safety rule from Settings → Advertisements.
6. **Public pages don't depend on cookies, so they stay ISR-able.** `lib/supabase/public.ts` is a
   stateless anon-key client (no `cookies()`) used by every public route
   (`app/(public)/**`, `services/public-content.service.ts`, `services/menus.service.ts`'s public
   read). Only `/admin/**` and auth routes use the cookie-bound `lib/supabase/server.ts` client.
   This is why the public site can revalidate on an interval instead of rendering per-request.
7. **SEO is polymorphic.** One `seo_metadata` table (`entity_type`, `entity_id`) backs posts,
   pages, and categories — `lib/seo/metadata.ts` and `lib/seo/schema.ts` are written once and
   reused everywhere via `buildEntityMetadata()`.
8. **No Supabase embedded/nested selects.** The hand-written `types/database.types.ts` (this
   environment couldn't reach the live Supabase project to run `supabase gen types`) doesn't carry
   foreign-key relationship metadata, so nested selects like `.select("*, profiles(name)")` don't
   type-check reliably. Every service instead does `fetch parent → collect FK ids → fetch related →
   join in JS` (see `services/dashboard.service.ts` for the simplest example). Regenerate this file
   with the real CLI once you can reach your project, and this convention becomes optional (but
   still fine to keep).

## Folder structure

```
app/
  (public)/            Public site — home, /articles/[slug], /category/[slug], /tag/[slug],
                        /page/[slug]; layout.tsx renders SiteHeader/SiteFooter from Menus
  admin/                One folder per nav section; each has page.tsx (+ [id]/, new/) and
                        actions.ts (server actions: auth guard -> permission check -> service call)
  api/track/            article/, video/, ad/ route handlers (service-role writes)
  api/log-404/          Best-effort 404 aggregation
  auth/                 login, callback (Supabase Auth email links)
  sitemap.ts, robots.ts Dynamic, ISR'd
  not-found.tsx         Fires the 404 tracking beacon
proxy.ts                Next 16's middleware file: redirect lookup, Supabase session refresh,
                        anon-id cookie
components/
  ui/                   Hand-written shadcn/ui-style primitives (button, dialog, table, chart, ...)
  admin/                Admin screens, organized to mirror app/admin/*
  editor/                RichTextEditor (TipTap) + the ArticleVideoBlock node + toolbar
  public/                Article rendering, tracking providers, ad slot, comments, site chrome
lib/
  supabase/              client.ts (browser), server.ts (cookie-bound), admin.ts (service-role,
                        server-only guarded), public.ts (stateless anon), middleware.ts
  auth/                  permissions.ts (RBAC matrix), guards.ts (requireUser/requireRole/
                        assertPermission)
  tracking/               completion.ts, nextArticle.ts, antiFraud.ts (all pure), plus the
                        session-token/rate-limit/origin-check glue for the track routes
  ads/                   resolvePlacements.ts (pure)
  content/                TipTap JSON analysis (analyze.ts), dependency-free HTML render
                        (render-html.ts — no DOM/jsdom needed), slug.ts
  seo/                    metadata.ts, schema.ts (JSON-LD), redirects-edge.ts (proxy.ts cache)
services/                 One file per domain; every DB query in the app lives here
schemas/                  Zod schemas (no `.default()` on any schema paired with react-hook-form's
                        zodResolver — see the comment in schemas/post.ts for why)
supabase/
  migrations/             0001 - 0013, applied in order (see README for how)
  seed.sql                Permissions matrix, default settings, starter categories/pages/menus
types/database.types.ts   Hand-written Database type (regenerate with the CLI once reachable)
tests/                    Vitest, mirrors lib/tracking, lib/ads, lib/content, lib/auth
```

## Database schema

### Core CMS
- `profiles` — extends `auth.users`; `role` is one of `author`/`editor`/`admin`/`super_admin`. The
  first row ever created becomes `super_admin` automatically (bootstrap, see
  `handle_new_user()`).
- `permissions`, `role_permissions` — the configurable permission matrix (Admin → Users → Roles).
- `media` — Storage-backed catalog; `duration_seconds`/`width`/`height` are filled by a
  client-side probe at upload time, never hard-coded.
- `categories` (self-referencing `parent_id` for hierarchy, `ads_enabled`), `tags`.
- `posts` — `content` is the canonical TipTap JSON; `content_html` is a cached render (fallback
  path only — the live public page renders the JSON straight to React, see
  `components/public/article-body.tsx`); `next_article_id` is the manual next-article override;
  `completion_threshold_percent` is a per-article override of the global default.
- `post_tags`, `post_videos` (the 3 tracked video slots — `slot_index` 1-3, `video_key` like
  `article_<id>_video_1`, `duration_seconds` re-synced from `media` on every save, `required`,
  `completion_threshold_percent`).
- `pages`, `seo_metadata` (polymorphic), `menus`/`menu_items` (nested one level, drag-orderable),
  `redirects`, `not_found_logs`, `settings` (grouped JSON blobs — see `services/settings.service.ts`
  for every group's shape and defaults).

### Engagement tracking (high write volume, service-role only)
- `article_sessions` — one row per article "visit" (per `session_token`); `progress_percent`,
  `reached_25/50/75/90`, `bottom_reached`, `time_spent_seconds`, `completed`/`completed_at`.
- `post_video_progress` — per (session, video); `max_watched_seconds` is the monotonic high-water
  mark completion is computed from.
- `engagement_events` — append-only raw log (`article_open`, `article_25`, `video_complete`,
  `next_article_opened`, ...), indexed for `(post_id, created_at)`; a partitioning candidate at
  real scale.

### Ads
- `ad_slots`, `ad_placements` (global rules), `post_ad_placements` (per-article override),
  `ad_events` (internal rendering analytics only — see the explicit split from official AdSense
  data in `app/admin/advertisements/page.tsx`), `adsense_reports` (scaffolded cache table for a
  future official-API sync job).

### Ops
- `comments` (threaded, forced to `pending` for non-staff by a DB trigger regardless of client
  input), `activity_logs` (every mutating service call logs here via
  `services/activity.service.ts`).

Every table has indexes on its FKs and the columns admin lists filter/sort by; see the migration
files themselves for exact DDL — they're the source of truth, this doc is a map, not a copy.

## Row Level Security

- **Public** (`anon` + `authenticated`): read-only, and only published posts/pages, all
  categories/tags/menus, active ad_slots/enabled placements, public settings groups (no secrets
  live in `settings` by design), approved comments. No read access to tracking tables at all.
- **Staff tiers** via a `get_my_role()` + `has_role_at_least()` SQL function pair: `editor+` can
  write posts/pages/media/categories/tags/comments; `author` can write only rows where
  `author_id = auth.uid()`; `admin+` gets menus/SEO/redirects/ads/users/settings; role changes are
  further guarded by a trigger so only a `super_admin` can grant `super_admin`.
- **Tracking tables**: zero `anon`/`authenticated` policies — service role only, staff get
  `SELECT` for analytics.

## The signature flow: article → 3 videos → completion → next article

1. `components/public/article-tracking-provider.tsx` mounts on the article page, gets/creates a
   `session_token`, and POSTs `open` to `/api/track/article`.
2. Scroll progress is sampled via `requestAnimationFrame`-throttled scroll listener; milestone
   crossings (25/50/75/90) and reaching the bottom flush immediately, everything else waits for the
   15s heartbeat or a visibility/pagehide event (`sendBeacon`).
3. Each `TrackedVideoPlayer` reports `play`/`pause`/`progress`/`ended` to
   `/api/track/video`, throttled to milestone crossings + a 5s cap on the rest.
4. Every write to either route calls `services/tracking.service.ts#evaluateAndPersistCompletion`,
   which re-derives `article_sessions.completed` from the *current* DB state via the pure
   `lib/tracking/completion.ts#isArticleComplete` — never from anything the client asserted.
5. The moment `completed` flips true, the API response carries the resolved next article
   (`resolveNextArticleForPost` → `lib/tracking/nextArticle.ts#resolveNextArticle`: manual
   override → same-category chronological-next (wraps) → algorithmic). The client's
   `AutoNextOverlay` shows the "Article completed" banner, waits the configured delay
   (Settings → Reading), logs `next_article_opened`, and navigates.

This survives refreshes (session_token persists), tab backgrounding (heartbeat + visibility flush),
and seeking backward in a video (max-watched high-water mark never decreases).

## What needs your own credentials to go fully live

- **Google AdSense Reporting API** (official earnings/impressions/CTR) — needs your own Google
  OAuth client; the schema and UI split are ready, the sync job isn't wired to a live account.
- **Outbound email** (Supabase Auth invites, etc.) — configure SMTP in your Supabase project's Auth
  settings; this app never stores email credentials in its own database.
- **Live Supabase migrations** — this was built in a sandbox without network access to the
  Supabase Management API or the project's own REST API, so migrations were authored and verified
  for correctness but not applied by the agent. See the README for how to apply them.

## Known follow-ups (honest scope notes)

- Media library, comments, and activity-log admin lists fetch a bounded page (e.g. first 50-60
  rows) without a full pager UI yet — the services already accept `page`/`perPage`, wiring a
  pager control is mechanical.
- `types/database.types.ts` is hand-written to match the migrations exactly; regenerate it with
  `supabase gen types typescript` once you can reach your project, which also unlocks Supabase's
  native embedded-select typing if you want to move off the fetch-and-join-in-JS convention.
- Menu nesting supports one level (parent → children) via a dropdown, not full drag-to-nest;
  ordering itself is real drag-and-drop (dnd-kit).
