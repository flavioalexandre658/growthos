"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
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
      productName: events.productName,
      payments: sql<number>`COUNT(*)`,
      revenueInCents: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "payment"),
        isNotNull(events.productName),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate)
      )
    )
    .groupBy(events.productName)
    .orderBy(sql`SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) DESC`)
    .limit(5);

  return rows.map((r) => ({
    productName: r.productName ?? "Sem nome",
    payments: Number(r.payments),
    revenueInCents: Number(r.revenueInCents),
  }));
}
