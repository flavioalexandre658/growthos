import { db } from "@/db";
import { usageMonthly, orgMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import dayjs from "@/utils/dayjs";

export interface IOrgUsage {
  organizationId: string;
  eventsCount: number;
}

export interface IPlanUsage {
  total: number;
  byOrg: IOrgUsage[];
  yearMonth: string;
}

export async function getPlanUsage(userId: string): Promise<IPlanUsage> {
  const yearMonth = dayjs().format("YYYY-MM");

  const rows = await db
    .select({
      organizationId: usageMonthly.organizationId,
      eventsCount: usageMonthly.eventsCount,
    })
    .from(usageMonthly)
    .where(
      and(
        eq(usageMonthly.userId, userId),
        eq(usageMonthly.yearMonth, yearMonth),
      ),
    );

  const total = rows.reduce((sum, r) => sum + r.eventsCount, 0);

  return {
    total,
    byOrg: rows.map((r) => ({
      organizationId: r.organizationId,
      eventsCount: r.eventsCount,
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
