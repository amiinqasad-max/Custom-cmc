-- ============================================================================
-- Rolls out two new Reading settings onto whatever `reading` settings row
-- already exists (from seed.sql on prior installs), without clobbering any
-- other field an admin may have customized since:
--
--   * next_article_strategy -> 'random': the infinite-random-next-article
--     feature is meant to be live immediately, not just an option nobody
--     has picked yet, so this is a deliberate override, not a coalesce.
--   * video_placement_percentages -> [30, 60, 90] if not already present
--     (it never existed before this migration, so this is effectively
--     always an add, but coalesce keeps it idempotent/safe to re-run).
-- ============================================================================

update public.settings
set value = value
  || jsonb_build_object('next_article_strategy', 'random')
  || jsonb_build_object(
       'video_placement_percentages',
       coalesce(value->'video_placement_percentages', jsonb_build_array(30, 60, 90))
     )
where key = 'reading';

-- Fresh projects that haven't run seed.sql yet still get a correct default row.
insert into public.settings (key, value)
select 'reading', jsonb_build_object(
  'completion_threshold_percent', 90,
  'video_completion_threshold_percent', 90,
  'auto_next_enabled', true,
  'auto_next_delay_ms', 1500,
  'next_article_strategy', 'random',
  'video_placement_percentages', jsonb_build_array(30, 60, 90)
)
where not exists (select 1 from public.settings where key = 'reading');
