import { db } from "@/db";
import { events, payments } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";

export async function reconcilePayments(organizationId: string): Promise<number> {
  const [eventCountRow, paymentCountRow] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          inArray(events.eventType, [...REVENUE_EVENT_TYPES])
        )
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          inArray(payments.eventType, [...REVENUE_EVENT_TYPES])
        )
      ),
  ]);

  const eventCount = Number(eventCountRow[0]?.count ?? 0);
  const paymentCount = Number(paymentCountRow[0]?.count ?? 0);

  if (eventCount === paymentCount) return 0;

  const result = await db.execute(sql`
    INSERT INTO payments (
      organization_id, event_type, currency, base_currency, exchange_rate,
      gross_value_in_cents, base_gross_value_in_cents, base_net_value_in_cents,
      discount_in_cents, payment_method, billing_type, billing_reason,
      billing_interval, subscription_id, customer_id, source, medium,
      campaign, content, landing_page, entry_page, referrer, device,
      session_id, product_id, product_name, category, metadata,
      event_hash, created_at
    )
    SELECT
      e.organization_id, e.event_type, e.currency, e.base_currency, e.exchange_rate,
      e.gross_value_in_cents, e.base_gross_value_in_cents, e.base_net_value_in_cents,
      e.discount_in_cents, e.payment_method, e.billing_type, e.billing_reason,
      e.billing_interval, e.subscription_id, e.customer_id, e.source, e.medium,
      e.campaign, e.content, e.landing_page, e.entry_page, e.referrer, e.device,
      e.session_id, e.product_id, e.product_name, e.category, e.metadata,
      e.event_hash, e.created_at
    FROM events e
    WHERE e.organization_id = ${organizationId}
      AND e.event_type IN ('purchase', 'renewal')
      AND e.event_hash IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM payments p
        WHERE p.organization_id = e.organization_id
          AND p.event_hash = e.event_hash
      )
    ON CONFLICT (organization_id, event_hash) DO NOTHING
  `);

  return Number(result.rowCount ?? 0);
}
