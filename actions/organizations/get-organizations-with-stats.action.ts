"use server";

import { getServerSession } from "next-auth";
import { eq, and, sql, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { organizations, orgMembers, payments, events } from "@/db/schema";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import { authOptions } from "@/lib/auth-options";
import dayjs from "@/utils/dayjs";
import { isPlatformAdmin } from "@/utils/is-platform-admin";

export interface IOrgStats {
  id: string;
  name: string;
  slug: string;
  revenueThisMonthInCents: number;
  purchasesThisMonth: number;
  pageviewsThisMonth: number;
  hasData: boolean;
}

export async function getOrganizationsWithStats(): Promise<IOrgStats[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  let orgs: (typeof organizations.$inferSelect)[];

  if (isPlatformAdmin(session.user.email)) {
    orgs = await db.select().from(organizations).orderBy(organizations.name);
  } else {
    const rows = await db
      .select({ org: organizations })
      .from(organizations)
      .innerJoin(orgMembers, eq(orgMembers.organizationId, organizations.id))
      .where(eq(orgMembers.userId, session.user.id))
      .orderBy(organizations.name);
    orgs = rows.map((r) => r.org);
  }

  if (orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.id);
  const monthStart = dayjs().startOf("month").toDate();

  const revenueRows = await db
    .select({
      organizationId: payments.organizationId,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
      purchases: sql<number>`COUNT(*)`,
    })
    .from(payments)
    .where(and(inArray(payments.organizationId, orgIds), inArray(payments.eventType, [...REVENUE_EVENT_TYPES]), gte(payments.createdAt, monthStart)))
    .groupBy(payments.organizationId);

  const pvRows = await db
    .select({
      organizationId: events.organizationId,
      count: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        inArray(events.organizationId, orgIds),
        eq(events.eventType, "pageview"),
        gte(events.createdAt, monthStart),
      ),
    )
    .groupBy(events.organizationId);

  const hasEventRows = await db
    .select({ organizationId: events.organizationId })
    .from(events)
    .where(inArray(events.organizationId, orgIds))
    .groupBy(events.organizationId);

  const revenueMap: Record<string, { revenue: number; purchases: number }> = {};
  for (const r of revenueRows) {
    revenueMap[r.organizationId] = { revenue: Number(r.revenue), purchases: Number(r.purchases) };
  }

  const pvMap: Record<string, number> = {};
  for (const r of pvRows) pvMap[r.organizationId] = Number(r.count);

  const hasDataSet = new Set(hasEventRows.map((r) => r.organizationId));

  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    revenueThisMonthInCents: revenueMap[org.id]?.revenue ?? 0,
    purchasesThisMonth: revenueMap[org.id]?.purchases ?? 0,
    pageviewsThisMonth: pvMap[org.id] ?? 0,
    hasData: hasDataSet.has(org.id),
  }));
}
