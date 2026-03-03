"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import dayjs from "@/utils/dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IMrrMovementEntry } from "@/interfaces/mrr.interface";

function normalizeToMonthly(valueInCents: number, interval: string): number {
  if (interval === "yearly") return Math.round(valueInCents / 12);
  if (interval === "weekly") return Math.round(valueInCents * 4.33);
  return valueInCents;
}

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
  const { startDate, endDate } = resolveDateRange(filter, tz);
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
    const bucket = bucketDate(event.createdAt, totalDays, tz);
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
