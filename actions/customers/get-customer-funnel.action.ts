"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations, payments } from "@/db/schema";
import { buildFunnelSteps, getAllQueryEventTypes, injectCheckoutSteps } from "@/utils/build-funnel-steps";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import type { IGenericFunnelData } from "@/interfaces/dashboard.interface";

export async function getCustomerFunnel(
  organizationId: string,
  customerId: string,
  urlLocale?: string
): Promise<IGenericFunnelData | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const locale = urlLocale ?? session.user.locale ?? "pt";

  const [org] = await db
    .select({ funnelSteps: organizations.funnelSteps, timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) return null;

  const baseFunnelSteps = buildFunnelSteps(org.funnelSteps, locale);
  const allEventTypes = getAllQueryEventTypes(baseFunnelSteps).filter(
    (t) => t !== "pageview"
  );

  const eventRows = await db
    .select({
      eventType: events.eventType,
      total: sql<number>`COUNT(*)`,
      uniqueTotal: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.customerId, customerId),
        inArray(events.eventType, allEventTypes)
      )
    )
    .groupBy(events.eventType);

  const countMap = new Map(
    eventRows.map((r) => [
      r.eventType,
      { total: Number(r.total), uniqueTotal: Number(r.uniqueTotal) },
    ])
  );

  const funnelSteps = injectCheckoutSteps(baseFunnelSteps, countMap, locale).filter(
    (s) => s.eventType !== "pageview"
  );

  const revenueResult = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
      purchases: sql<number>`COUNT(*)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.customerId, customerId),
        inArray(payments.eventType, REVENUE_EVENT_TYPES)
      )
    );

  const revenue = revenueResult[0] ?? { grossRevenue: 0, purchases: 0 };
  const grossRevenue = Number(revenue.grossRevenue);
  const purchaseCount = Number(revenue.purchases);

  const steps = funnelSteps.map((step) => {
    const counts = countMap.get(step.eventType);
    const value = step.countUnique
      ? (counts?.uniqueTotal ?? 0)
      : (counts?.total ?? 0);
    return {
      key: step.eventType,
      label: step.label,
      value,
    };
  });

  const rates: IGenericFunnelData["rates"] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i];
    const to = steps[i + 1];
    const rate = from.value > 0 ? ((to.value / from.value) * 100).toFixed(1) + "%" : "0%";
    rates.push({ key: `${from.key}_to_${to.key}`, label: `${from.label} → ${to.label}`, value: rate });
  }

  if (steps.length >= 3) {
    const first = steps[0];
    const last = steps[steps.length - 1];
    const totalRate = first.value > 0 ? ((last.value / first.value) * 100).toFixed(1) + "%" : "0%";
    rates.push({ key: "total_conversion", label: "Conversão Total", value: totalRate });
  }

  const ticketMedio = purchaseCount > 0
    ? `R$ ${(grossRevenue / 100 / purchaseCount).toFixed(2).replace(".", ",")}`
    : "R$ 0,00";

  const checkoutAbandoned = countMap.get("checkout_abandoned")?.total ?? 0;

  return {
    steps,
    rates,
    revenue: grossRevenue,
    ticketMedio,
    checkoutAbandoned: checkoutAbandoned > 0 ? checkoutAbandoned : undefined,
  };
}
