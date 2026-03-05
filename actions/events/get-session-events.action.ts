"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import type { ISessionEvent } from "@/interfaces/event.interface";

export async function getSessionEvents(
  organizationId: string,
  sessionId: string
): Promise<ISessionEvent[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const rows = await db
    .select({
      id: events.id,
      eventType: events.eventType,
      grossValueInCents: events.grossValueInCents,
      baseCurrency: events.baseCurrency,
      baseGrossValueInCents: events.baseGrossValueInCents,
      productName: events.productName,
      productId: events.productId,
      landingPage: events.landingPage,
      source: events.source,
      medium: events.medium,
      campaign: events.campaign,
      device: events.device,
      customerId: events.customerId,
      category: events.category,
      paymentMethod: events.paymentMethod,
      eventHash: events.eventHash,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.sessionId, sessionId)
      )
    )
    .orderBy(asc(events.createdAt))
    .limit(50);

  return rows;
}
