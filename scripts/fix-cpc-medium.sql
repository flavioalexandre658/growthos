-- =============================================================
-- Dry-run: count records that will be affected
-- Run this SELECT block first to verify before applying the fix.
-- =============================================================

SELECT 'events' AS table_name, COUNT(*) AS affected
FROM events
WHERE medium = 'cpc'
  AND campaign IS NULL
  AND (source IS NULL OR source NOT IN ('google', 'bing'))
UNION ALL
SELECT 'payments', COUNT(*)
FROM payments
WHERE medium = 'cpc'
  AND campaign IS NULL
  AND (source IS NULL OR source NOT IN ('google', 'bing'))
UNION ALL
SELECT 'customers', COUNT(*)
FROM customers
WHERE first_medium = 'cpc'
  AND first_campaign IS NULL
  AND (first_source IS NULL OR first_source NOT IN ('google', 'bing'))
UNION ALL
SELECT 'pageview_aggregates', COUNT(*)
FROM pageview_aggregates
WHERE medium = 'cpc'
  AND campaign IS NULL
  AND (source IS NULL OR source NOT IN ('google', 'bing'))
UNION ALL
SELECT 'pageview_daily_sessions', COUNT(*)
FROM pageview_daily_sessions
WHERE medium = 'cpc'
  AND campaign IS NULL
  AND (source IS NULL OR source NOT IN ('google', 'bing'))
UNION ALL
SELECT 'funnel_daily', COUNT(*)
FROM funnel_daily
WHERE medium = 'cpc'
  AND (source IS NULL OR source NOT IN ('google', 'bing'));

-- =============================================================
-- Fix: change incorrect medium='cpc' to 'referral'
-- =============================================================

BEGIN;

-- events
UPDATE events
SET medium = 'referral'
WHERE medium = 'cpc'
  AND campaign IS NULL
  AND (source IS NULL OR source NOT IN ('google', 'bing'));

-- payments
UPDATE payments
SET medium = 'referral'
WHERE medium = 'cpc'
  AND campaign IS NULL
  AND (source IS NULL OR source NOT IN ('google', 'bing'));

-- customers (first_medium)
UPDATE customers
SET first_medium = 'referral'
WHERE first_medium = 'cpc'
  AND first_campaign IS NULL
  AND (first_source IS NULL OR first_source NOT IN ('google', 'bing'));

-- pageview_aggregates
UPDATE pageview_aggregates
SET medium = 'referral'
WHERE medium = 'cpc'
  AND campaign IS NULL
  AND (source IS NULL OR source NOT IN ('google', 'bing'));

-- pageview_daily_sessions
UPDATE pageview_daily_sessions
SET medium = 'referral'
WHERE medium = 'cpc'
  AND campaign IS NULL
  AND (source IS NULL OR source NOT IN ('google', 'bing'));

-- funnel_daily (no campaign column, filter by source only)
UPDATE funnel_daily
SET medium = 'referral'
WHERE medium = 'cpc'
  AND (source IS NULL OR source NOT IN ('google', 'bing'));

COMMIT;
