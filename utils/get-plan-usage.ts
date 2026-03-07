import { db } from "@/db";
import { orgMembers, payments, organizations } from "@/db/schema";
import { eq, and, sql, gte, inArray } from "drizzle-orm";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import dayjs from "@/utils/dayjs";

export interface IOrgRevenueUsage {
  organizationId: string;
  organizationName: string;
  revenueInCents: number;
}

export interface IPlanUsage {
  totalRevenueInCents: number;
  byOrg: IOrgRevenueUsage[];
  yearMonth: string;
}

export async function getPlanUsage(userId: string): Promise<IPlanUsage> {
  const yearMonth = dayjs().format("YYYY-MM");
  const monthStart = dayjs().startOf("month").toDate();

  const memberOrgs = await db
    .select({ organizationId: orgMembers.organizationId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId));

  const orgIds = memberOrgs.map((m) => m.organizationId);

  if (orgIds.length === 0) {
    return { totalRevenueInCents: 0, byOrg: [], yearMonth };
  }

  const revenueRows = await db
    .select({
      organizationId: payments.organizationId,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
    })
    .from(payments)
    .where(and(inArray(payments.organizationId, orgIds), inArray(payments.eventType, [...REVENUE_EVENT_TYPES]), gte(payments.createdAt, monthStart)))
    .groupBy(payments.organizationId);

  const orgNameRows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(inArray(organizations.id, orgIds));

  const nameMap: Record<string, string> = {};
  for (const o of orgNameRows) nameMap[o.id] = o.name;

  const total = revenueRows.reduce((sum, r) => sum + Number(r.revenue), 0);

  return {
    totalRevenueInCents: Math.max(0, total),
    byOrg: revenueRows.map((r) => ({
      organizationId: r.organizationId,
      organizationName: nameMap[r.organizationId] ?? r.organizationId,
      revenueInCents: Number(r.revenue),
    })),
    yearMonth,
  };
}

export async function getOrgOwnerId(organizationId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: orgMembers.userId })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organizationId, organizationId),
        eq(orgMembers.role, "owner"),
      ),
    )
    .limit(1);

  return row?.userId ?? null;
}
