import "dotenv/config";
import { db } from "@/db";
import {
  events,
  payments,
  pageviewAggregates,
  funnelDaily,
  funnelDailyPages,
  pageviewDailySessions,
  pageviewDailyPages,
} from "@/db/schema";
import { sql, inArray, notInArray } from "drizzle-orm";

const PAYMENT_EVENT_TYPES = [
  "purchase",
  "renewal",
  "refund",
  "subscription_canceled",
  "subscription_changed",
];

const BATCH_SIZE = 1000;

async function backfillPayments() {
  console.log("\n[1/5] Backfilling payments from events...");

  let offset = 0;
  let total = 0;

  while (true) {
    const batch = await db
      .select()
      .from(events)
      .where(inArray(events.eventType, PAYMENT_EVENT_TYPES))
      .limit(BATCH_SIZE)
      .offset(offset);

    if (batch.length === 0) break;

    await db
      .insert(payments)
      .values(
        batch.map((e) => ({
          organizationId: e.organizationId,
          eventType: e.eventType,
          currency: e.currency ?? "BRL",
          baseCurrency: e.baseCurrency ?? "BRL",
          exchangeRate: e.exchangeRate ?? 1,
          grossValueInCents: e.grossValueInCents,
          baseGrossValueInCents: e.baseGrossValueInCents,
          baseNetValueInCents: e.baseNetValueInCents,
          discountInCents: e.discountInCents,
          installments: e.installments,
          paymentMethod: e.paymentMethod,
          productId: e.productId,
          productName: e.productName,
          category: e.category,
          source: e.source,
          medium: e.medium,
          campaign: e.campaign,
          content: e.content,
          landingPage: e.landingPage,
          entryPage: e.entryPage,
          referrer: e.referrer,
          device: e.device,
          customerType: e.customerType,
          customerId: e.customerId,
          sessionId: e.sessionId,
          billingType: e.billingType,
          billingReason: e.billingReason,
          billingInterval: e.billingInterval,
          subscriptionId: e.subscriptionId,
          planId: e.planId,
          planName: e.planName,
          provider: e.provider,
          metadata: e.metadata as Record<string, unknown> | null,
          eventHash: e.eventHash,
          createdAt: e.createdAt,
        }))
      )
      .onConflictDoNothing();

    total += batch.length;
    offset += batch.length;
    console.log(`  Processed ${total} events...`);

    if (batch.length < BATCH_SIZE) break;
  }

  const [paymentsCount] = await db.select({ count: sql`COUNT(*)` }).from(payments);
  const [eventsCount] = await db
    .select({ count: sql`COUNT(*)` })
    .from(events)
    .where(inArray(events.eventType, PAYMENT_EVENT_TYPES));

  console.log(`  Done. payments: ${paymentsCount?.count}, financial events: ${eventsCount?.count}`);
}

async function backfillFunnelDaily() {
  console.log("\n[2/5] Backfilling funnel_daily from events...");

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
    WHERE event_type NOT IN (${PAYMENT_EVENT_TYPES.map((t) => `'${t}'`).join(", ")})
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

  const [count] = await db.select({ count: sql`COUNT(*)` }).from(funnelDaily);
  console.log(`  Done. funnel_daily rows: ${count?.count}`);
}

async function backfillFunnelDailyPages() {
  console.log("\n[3/5] Backfilling funnel_daily_pages from events...");

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
    WHERE event_type NOT IN (${PAYMENT_EVENT_TYPES.map((t) => `'${t}'`).join(", ")})
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

  const [count] = await db.select({ count: sql`COUNT(*)` }).from(funnelDailyPages);
  console.log(`  Done. funnel_daily_pages rows: ${count?.count}`);
}

async function backfillPageviewDailySessions() {
  console.log("\n[4/5] Backfilling pageview_daily_sessions from pageview_aggregates...");

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

  const [count] = await db.select({ count: sql`COUNT(*)` }).from(pageviewDailySessions);
  console.log(`  Done. pageview_daily_sessions rows: ${count?.count}`);
}

async function backfillPageviewDailyPages() {
  console.log("\n[5/5] Backfilling pageview_daily_pages from pageview_aggregates...");

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
    GROUP BY
      organization_id,
      date,
      COALESCE(landing_page, '')
    ON CONFLICT (organization_id, date, landing_page)
    DO UPDATE SET
      sessions = EXCLUDED.sessions,
      pageviews = EXCLUDED.pageviews
  `));

  const [count] = await db.select({ count: sql`COUNT(*)` }).from(pageviewDailyPages);
  console.log(`  Done. pageview_daily_pages rows: ${count?.count}`);
}

async function verify() {
  console.log("\n[Verification]");

  const [eventsFinancialCount] = await db
    .select({ count: sql`COUNT(*)` })
    .from(events)
    .where(inArray(events.eventType, PAYMENT_EVENT_TYPES));

  const [paymentsCount] = await db.select({ count: sql`COUNT(*)` }).from(payments);
  const [funnelDailyCount] = await db.select({ count: sql`COUNT(*)` }).from(funnelDaily);
  const [funnelDailyPagesCount] = await db.select({ count: sql`COUNT(*)` }).from(funnelDailyPages);
  const [pvDailySessionsCount] = await db.select({ count: sql`COUNT(*)` }).from(pageviewDailySessions);
  const [pvDailyPagesCount] = await db.select({ count: sql`COUNT(*)` }).from(pageviewDailyPages);

  console.log(`  events (financial):      ${eventsFinancialCount?.count}`);
  console.log(`  payments:                ${paymentsCount?.count}`);
  console.log(`  funnel_daily:            ${funnelDailyCount?.count}`);
  console.log(`  funnel_daily_pages:      ${funnelDailyPagesCount?.count}`);
  console.log(`  pageview_daily_sessions: ${pvDailySessionsCount?.count}`);
  console.log(`  pageview_daily_pages:    ${pvDailyPagesCount?.count}`);

  const eventsN = Number(eventsFinancialCount?.count ?? 0);
  const paymentsN = Number(paymentsCount?.count ?? 0);

  if (paymentsN < eventsN) {
    console.warn(`  ⚠️  WARNING: payments (${paymentsN}) < financial events (${eventsN}). Check for issues.`);
  } else {
    console.log(`  ✅ payments count OK (${paymentsN} >= ${eventsN})`);
  }
}

async function main() {
  console.log("=== Backfill Summaries Script ===");
  console.log("CRITICAL: Run this BEFORE enabling the cron job delete step.\n");

  await backfillPayments();
  await backfillFunnelDaily();
  await backfillFunnelDailyPages();
  await backfillPageviewDailySessions();
  await backfillPageviewDailyPages();
  await verify();

  console.log("\n=== Backfill Complete ===");
  console.log("Next steps:");
  console.log("  1. Verify counts above look correct");
  console.log("  2. Deploy query migrations (swap events -> payments in financial queries)");
  console.log("  3. THEN enable cron job (it will start deleting data older than 37 days)");

  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
