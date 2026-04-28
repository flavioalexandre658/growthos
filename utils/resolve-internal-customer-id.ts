import { db } from "@/db";
import { customers, events } from "@/db/schema";
import { and, eq, sql, desc, isNotNull } from "drizzle-orm";

export interface ResolveCustomerHints {
  email?: string | null;
  sessionId?: string | null;
  fallbackId?: string | null;
}

export async function resolveInternalCustomerId(
  organizationId: string,
  hints: ResolveCustomerHints,
): Promise<string | null> {
  const email = hints.email?.trim().toLowerCase() || null;
  const sessionId = hints.sessionId?.trim() || null;
  const fallbackId = hints.fallbackId ?? null;

  if (email) {
    const [customer] = await db
      .select({ customerId: customers.customerId })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          sql`LOWER(${customers.email}) = ${email}`,
        ),
      )
      .orderBy(desc(customers.lastSeenAt))
      .limit(1);
    if (customer?.customerId) return customer.customerId;

    const [eventByEmail] = await db
      .select({ customerId: events.customerId })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          isNotNull(events.customerId),
          sql`LOWER(${events.metadata}->>'customer_email') = ${email}`,
          sql`${events.createdAt} > now() - interval '90 days'`,
        ),
      )
      .orderBy(desc(events.createdAt))
      .limit(1);
    if (eventByEmail?.customerId) return eventByEmail.customerId;
  }

  if (sessionId) {
    const [eventBySession] = await db
      .select({ customerId: events.customerId })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.sessionId, sessionId),
          isNotNull(events.customerId),
          sql`${events.createdAt} > now() - interval '90 days'`,
        ),
      )
      .orderBy(desc(events.createdAt))
      .limit(1);
    if (eventBySession?.customerId) return eventBySession.customerId;
  }

  return fallbackId;
}
