"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations, subscriptions, payments } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { getUserPlan } from "@/utils/get-user-plan";
import { normalizeToMonthly } from "@/utils/billing";
import dayjs from "@/utils/dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IMrrMovementEntry } from "@/interfaces/mrr.interface";

function bucketDate(date: Date, totalDays: number, tz: string): string {
  const d = dayjs(date).tz(tz);
  if (totalDays <= 31) return d.format("YYYY-MM-DD");
  if (totalDays <= 90) return d.startOf("week").format("YYYY-MM-DD");
  return d.format("YYYY-MM");
}

export async function getMrrMovement(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IMrrMovementEntry[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const plan = await getUserPlan();
  const { startDate, endDate } = resolveDateRange(filter, tz, plan.maxHistoryDays);
  const totalDays = dayjs(endDate).diff(dayjs(startDate), "day") + 1;

  const relevantEvents = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate),
        inArray(payments.eventType, ["purchase", "renewal", "subscription_canceled", "subscription_changed"])
      )
    );

  const subscriptionIds = [
    ...new Set(
      relevantEvents
        .filter((e) => e.subscriptionId)
        .map((e) => e.subscriptionId as string)
    ),
  ];

  const subsMap = new Map<string, { startedAt: Date; billingInterval: string }>();
  if (subscriptionIds.length > 0) {
    const rows = await db
      .select({
        subscriptionId: subscriptions.subscriptionId,
        startedAt: subscriptions.startedAt,
        billingInterval: subscriptions.billingInterval,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.organizationId, organizationId),
          inArray(subscriptions.subscriptionId, subscriptionIds)
        )
      );
    for (const r of rows) subsMap.set(r.subscriptionId, { startedAt: r.startedAt, billingInterval: r.billingInterval });
  }

  const bucketMap = new Map<
    string,
    { newMrr: number; renewalMrr: number; expansionMrr: number; contractionMrr: number; churnedMrr: number }
  >();

  for (const event of relevantEvents) {
    const bucket = bucketDate(event.createdAt, totalDays, tz);
    if (!bucketMap.has(bucket)) {
      bucketMap.set(bucket, {
        newMrr: 0,
        renewalMrr: 0,
        expansionMrr: 0,
        contractionMrr: 0,
        churnedMrr: 0,
      });
    }
    const entry = bucketMap.get(bucket)!;
    const subInfo = event.subscriptionId ? subsMap.get(event.subscriptionId) : undefined;
    const resolvedInterval = event.billingInterval ?? subInfo?.billingInterval ?? "monthly";
    const rawValue = event.baseGrossValueInCents ?? event.grossValueInCents ?? 0;
    const monthly = normalizeToMonthly(rawValue, resolvedInterval);

    if (event.eventType === "renewal" && event.billingType === "recurring") {
      entry.renewalMrr += monthly;
    } else if (event.eventType === "purchase" && event.billingType === "recurring" && event.subscriptionId) {
      const startedAt = subInfo?.startedAt;
      const isNew = startedAt
        ? startedAt >= startDate && startedAt <= endDate
        : false;

      if (isNew) {
        entry.newMrr += monthly;
      } else {
        entry.renewalMrr += monthly;
      }
    } else if (event.eventType === "subscription_canceled") {
      entry.churnedMrr += monthly;
    } else if (event.eventType === "subscription_changed") {
      const meta = event.metadata as { previousValue?: number; newValue?: number } | null;
      if (meta) {
        const prev = normalizeToMonthly(meta.previousValue ?? 0, event.billingInterval ?? "monthly");
        const next = normalizeToMonthly(meta.newValue ?? 0, event.billingInterval ?? "monthly");
        const delta = next - prev;
        if (delta > 0) entry.expansionMrr += delta;
        else if (delta < 0) entry.contractionMrr += Math.abs(delta);
      }
    }
  }

  const sortedBuckets = Array.from(bucketMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return sortedBuckets.map(([date, data]) => ({
    date,
    newMrr: data.newMrr,
    renewalMrr: data.renewalMrr,
    expansionMrr: data.expansionMrr,
    contractionMrr: data.contractionMrr,
    churnedMrr: data.churnedMrr,
    netMrr: data.newMrr + data.renewalMrr + data.expansionMrr - data.contractionMrr - data.churnedMrr,
  }));
}
