import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";

export const dynamic = "force-dynamic";
import { sql, lt } from "drizzle-orm";
import dayjs from "@/utils/dayjs";

const AGGREGATE_AFTER_DAYS = 30;
const DELETE_AFTER_DAYS = 37;

const PAYMENT_EVENT_TYPES = [
  "purchase",
  "renewal",
  "refund",
  "subscription_canceled",
  "subscription_changed",
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const aggregateBefore = dayjs()
    .subtract(AGGREGATE_AFTER_DAYS, "days")
    .startOf("day")
    .toDate();

  const deleteBefore = dayjs()
    .subtract(DELETE_AFTER_DAYS, "days")
    .startOf("day")
    .toDate();

  const aggregateBeforeStr = dayjs(aggregateBefore).format("YYYY-MM-DD");
  const deleteBeforeStr = dayjs(deleteBefore).format("YYYY-MM-DD");

  const paymentTypesLiteral = PAYMENT_EVENT_TYPES.map((t) => `'${t}'`).join(", ");

  await db.execute(sql.raw(`
    INSERT INTO funnel_daily
      (id, organization_id, date, event_type, source, medium, device, total, unique_sessions, value_in_cents)
    SELECT
      gen_random_uuid(),
      organization_id,
      DATE(created_at AT TIME ZONE 'UTC'),
      event_type,
      COALESCE(source, ''),
      COALESCE(medium, ''),
      COALESCE(device, ''),
      COUNT(*),
      COUNT(DISTINCT session_id),
      COALESCE(SUM(base_gross_value_in_cents), 0)
    FROM events
    WHERE event_type NOT IN (${paymentTypesLiteral})
      AND created_at < '${aggregateBefore.toISOString()}'
    GROUP BY
      organization_id,
      DATE(created_at AT TIME ZONE 'UTC'),
      event_type,
      COALESCE(source, ''),
      COALESCE(medium, ''),
      COALESCE(device, '')
    ON CONFLICT (organization_id, date, event_type, source, medium, device)
    DO UPDATE SET
      total = EXCLUDED.total,
      unique_sessions = EXCLUDED.unique_sessions,
      value_in_cents = EXCLUDED.value_in_cents
  `));

  await db.execute(sql.raw(`
    INSERT INTO funnel_daily_pages
      (id, organization_id, date, event_type, entry_page, total, unique_sessions, value_in_cents)
    SELECT
      gen_random_uuid(),
      organization_id,
      DATE(created_at AT TIME ZONE 'UTC'),
      event_type,
      COALESCE(entry_page, ''),
      COUNT(*),
      COUNT(DISTINCT session_id),
      COALESCE(SUM(base_gross_value_in_cents), 0)
    FROM events
    WHERE event_type NOT IN (${paymentTypesLiteral})
      AND created_at < '${aggregateBefore.toISOString()}'
    GROUP BY
      organization_id,
      DATE(created_at AT TIME ZONE 'UTC'),
      event_type,
      COALESCE(entry_page, '')
    ON CONFLICT (organization_id, date, event_type, entry_page)
    DO UPDATE SET
      total = EXCLUDED.total,
      unique_sessions = EXCLUDED.unique_sessions,
      value_in_cents = EXCLUDED.value_in_cents
  `));

  await db.execute(sql.raw(`
    INSERT INTO pageview_daily_sessions
      (id, organization_id, date, source, medium, campaign, content, device, entry_page, referrer, sessions, pageviews)
    SELECT
      gen_random_uuid(),
      organization_id,
      date,
      COALESCE(source, ''),
      COALESCE(medium, ''),
      COALESCE(campaign, ''),
      COALESCE(content, ''),
      COALESCE(device, ''),
      COALESCE(entry_page, ''),
      COALESCE(referrer, ''),
      COUNT(DISTINCT session_id),
      SUM(pageviews)
    FROM pageview_aggregates
    WHERE date < '${aggregateBeforeStr}'
    GROUP BY
      organization_id,
      date,
      COALESCE(source, ''),
      COALESCE(medium, ''),
      COALESCE(campaign, ''),
      COALESCE(content, ''),
      COALESCE(device, ''),
      COALESCE(entry_page, ''),
      COALESCE(referrer, '')
    ON CONFLICT (organization_id, date, source, medium, campaign, content, device, entry_page, referrer)
    DO UPDATE SET
      sessions = EXCLUDED.sessions,
      pageviews = EXCLUDED.pageviews
  `));

  await db.execute(sql.raw(`
    INSERT INTO pageview_daily_pages
      (id, organization_id, date, landing_page, sessions, pageviews)
    SELECT
      gen_random_uuid(),
      organization_id,
      date,
      COALESCE(landing_page, ''),
      COUNT(DISTINCT session_id),
      SUM(pageviews)
    FROM pageview_aggregates
    WHERE date < '${aggregateBeforeStr}'
    GROUP BY
      organization_id,
      date,
      COALESCE(landing_page, '')
    ON CONFLICT (organization_id, date, landing_page)
    DO UPDATE SET
      sessions = EXCLUDED.sessions,
      pageviews = EXCLUDED.pageviews
  `));

  await db
    .delete(events)
    .where(lt(events.createdAt, deleteBefore));

  await db.execute(sql.raw(`
    DELETE FROM pageview_aggregates
    WHERE date < '${deleteBeforeStr}'
  `));

  return NextResponse.json({
    ok: true,
    aggregatedBefore: aggregateBefore.toISOString(),
    deletedBefore: deleteBefore.toISOString(),
  });
}
