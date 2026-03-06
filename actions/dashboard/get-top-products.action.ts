"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, isNotNull, inArray } from "drizzle-orm";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import { db } from "@/db";
import { payments, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IDateFilter, ITopProduct } from "@/interfaces/dashboard.interface";

export async function getTopProducts(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<ITopProduct[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) return [];

  const tz = org.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(filter, tz);

  const rows = await db
    .select({
      productName: payments.productName,
      purchases: sql<number>`COUNT(*)`,
      revenueInCents: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        inArray(payments.eventType, REVENUE_EVENT_TYPES),
        isNotNull(payments.productName),
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate)
      )
    )
    .groupBy(payments.productName)
    .orderBy(sql`SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})) DESC`)
    .limit(5);

  return rows.map((r) => ({
    productName: r.productName ?? "Sem nome",
    purchases: Number(r.purchases),
    revenueInCents: Number(r.revenueInCents),
  }));
}
