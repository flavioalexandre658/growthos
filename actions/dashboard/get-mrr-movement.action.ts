"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import dayjs from "dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IMrrMovementEntry } from "@/interfaces/mrr.interface";

function normalizeToMonthly(valueInCents: number, interval: string): number {
  if (interval === "yearly") return Math.round(valueInCents / 12);
  if (interval === "weekly") return Math.round(valueInCents * 4.33);
  return valueInCents;
}

function bucketDate(date: Date, totalDays: number): string {
  if (totalDays <= 31) return dayjs(date).format("YYYY-MM-DD");
  if (totalDays <= 90) return dayjs(date).startOf("week").format("YYYY-MM-DD");
  return dayjs(date).format("YYYY-MM");
}

export async function getMrrMovement(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IMrrMovementEntry[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const { startDate, endDate } = resolveDateRange(filter);
  const totalDays = dayjs(endDate).diff(dayjs(startDate), "day") + 1;

  const relevantEvents = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate),
        inArray(events.eventType, ["payment", "subscription_canceled", "subscription_changed"])
      )
    );

  const bucketMap = new Map<
    string,
    { newMrr: number; expansionMrr: number; contractionMrr: number; churnedMrr: number }
  >();

  const seenSubscriptions = new Set<string>();

  for (const event of relevantEvents) {
    const bucket = bucketDate(event.createdAt, totalDays);
    if (!bucketMap.has(bucket)) {
      bucketMap.set(bucket, { newMrr: 0, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0 });
    }
    const entry = bucketMap.get(bucket)!;
    const monthly = normalizeToMonthly(
      event.grossValueInCents ?? 0,
      event.billingInterval ?? "monthly"
    );

    if (
      event.eventType === "payment" &&
      event.billingType === "recurring" &&
      event.subscriptionId
    ) {
      if (!seenSubscriptions.has(event.subscriptionId)) {
        seenSubscriptions.add(event.subscriptionId);
        entry.newMrr += monthly;
      } else {
        entry.expansionMrr += monthly;
      }
    } else if (event.eventType === "subscription_canceled" && event.subscriptionId) {
      entry.churnedMrr += monthly;
    } else if (event.eventType === "subscription_changed" && event.subscriptionId) {
      entry.expansionMrr += monthly;
    }
  }

  const sortedBuckets = Array.from(bucketMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return sortedBuckets.map(([date, data]) => ({
    date,
    newMrr: data.newMrr,
    expansionMrr: data.expansionMrr,
    contractionMrr: data.contractionMrr,
    churnedMrr: data.churnedMrr,
    netMrr: data.newMrr + data.expansionMrr - data.contractionMrr - data.churnedMrr,
  }));
}
