"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import dayjs from "@/utils/dayjs";
import type { ISubscriptionParams } from "@/interfaces/subscription.interface";

function escapeCSVField(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportSubscriptions(
  organizationId: string,
  params: ISubscriptionParams = {}
): Promise<{ csv: string; filename: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { csv: "", filename: "assinaturas.csv" };

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(params, tz);

  const baseConditions = [
    eq(subscriptions.organizationId, organizationId),
    gte(subscriptions.startedAt, startDate),
    lte(subscriptions.startedAt, endDate),
  ];

  if (params.status && params.status !== "all") {
    baseConditions.push(
      eq(
        subscriptions.status,
        params.status as "active" | "canceled" | "past_due" | "trialing"
      )
    );
  }

  if (params.plan_id) {
    baseConditions.push(eq(subscriptions.planId, params.plan_id));
  }

  if (params.billing_interval && params.billing_interval !== "all") {
    baseConditions.push(
      eq(
        subscriptions.billingInterval,
        params.billing_interval as
          | "monthly"
          | "quarterly"
          | "semiannual"
          | "yearly"
          | "weekly"
      )
    );
  }

  if (params.search) {
    const term = `%${params.search}%`;
    baseConditions.push(
      or(
        ilike(subscriptions.customerId, term),
        ilike(subscriptions.subscriptionId, term),
        ilike(subscriptions.planName, term)
      )!
    );
  }

  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(...baseConditions))
    .orderBy(sql`${subscriptions.startedAt} DESC`)
    .limit(5000);

  const header = [
    "subscription_id",
    "customer_id",
    "plan_id",
    "plan_name",
    "status",
    "value",
    "currency",
    "billing_interval",
    "started_at",
    "canceled_at",
    "created_at",
  ].join(",");

  const lines = rows.map((r) =>
    [
      escapeCSVField(r.subscriptionId),
      escapeCSVField(r.customerId),
      escapeCSVField(r.planId),
      escapeCSVField(r.planName),
      escapeCSVField(r.status),
      r.valueInCents != null ? String(r.valueInCents / 100) : "",
      escapeCSVField(r.currency),
      escapeCSVField(r.billingInterval),
      dayjs(r.startedAt).tz(tz).format("YYYY-MM-DD HH:mm:ss"),
      r.canceledAt ? dayjs(r.canceledAt).tz(tz).format("YYYY-MM-DD HH:mm:ss") : "",
      dayjs(r.createdAt).tz(tz).format("YYYY-MM-DD HH:mm:ss"),
    ].join(",")
  );

  const csv = [header, ...lines].join("\n");
  const filename = `assinaturas_${dayjs().format("YYYY-MM-DD")}.csv`;

  return { csv, filename };
}
