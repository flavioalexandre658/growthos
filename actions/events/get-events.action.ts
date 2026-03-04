"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, inArray, or, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IEventParams, IEventsResult } from "@/interfaces/event.interface";

export async function getEvents(
  organizationId: string,
  params: IEventParams = {}
): Promise<IEventsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
      distinctEventTypes: [],
      distinctSources: [],
      distinctDevices: [],
    };
  }

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(params, tz);

  const page = params.page ?? 1;
  const limit = params.limit ?? 25;
  const offset = (page - 1) * limit;

  const baseConditions = [
    eq(events.organizationId, organizationId),
    gte(events.createdAt, startDate),
    lte(events.createdAt, endDate),
  ];

  if (params.event_types && params.event_types.length > 0) {
    baseConditions.push(inArray(events.eventType, params.event_types));
  }

  if (params.source) {
    baseConditions.push(eq(events.source, params.source));
  }

  if (params.device) {
    baseConditions.push(eq(events.device, params.device));
  }

  if (params.search) {
    const term = `%${params.search}%`;
    baseConditions.push(
      or(
        ilike(events.customerId, term),
        ilike(events.sessionId, term),
        ilike(events.productId, term),
        ilike(events.productName, term)
      )!
    );
  }

  if (params.min_value !== undefined) {
    baseConditions.push(gte(events.grossValueInCents, params.min_value));
  }

  if (params.max_value !== undefined) {
    baseConditions.push(lte(events.grossValueInCents, params.max_value));
  }

  const whereClause = and(...baseConditions);

  const dupWindowExpr = sql<number>`CASE
    WHEN ${events.customerId} IS NULL THEN 1
    ELSE COUNT(*) OVER (
      PARTITION BY
        ${events.organizationId},
        ${events.eventType},
        ${events.customerId},
        ${events.grossValueInCents},
        ${events.productId}
      ORDER BY ${events.createdAt}
      RANGE BETWEEN INTERVAL '10 minutes' PRECEDING AND INTERVAL '10 minutes' FOLLOWING
    )
  END`;

  const [totalRow, rows] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(events)
      .where(whereClause),
    db
      .select({
        id: events.id,
        eventType: events.eventType,
        grossValueInCents: events.grossValueInCents,
        source: events.source,
        medium: events.medium,
        campaign: events.campaign,
        productName: events.productName,
        productId: events.productId,
        category: events.category,
        device: events.device,
        customerId: events.customerId,
        sessionId: events.sessionId,
        landingPage: events.landingPage,
        paymentMethod: events.paymentMethod,
        createdAt: events.createdAt,
        dupCount: dupWindowExpr,
      })
      .from(events)
      .where(whereClause)
      .orderBy(
        params.order_dir === "ASC"
          ? events.createdAt
          : sql`${events.createdAt} DESC`
      )
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalRow[0]?.count ?? 0);

  const [eventTypeRows, sourceRows, deviceRows] = await Promise.all([
    db
      .selectDistinct({ val: events.eventType })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.createdAt, startDate),
          lte(events.createdAt, endDate)
        )
      )
      .orderBy(events.eventType),
    db
      .selectDistinct({ val: events.source })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.createdAt, startDate),
          lte(events.createdAt, endDate)
        )
      ),
    db
      .selectDistinct({ val: events.device })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.createdAt, startDate),
          lte(events.createdAt, endDate)
        )
      ),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      grossValueInCents: r.grossValueInCents,
      source: r.source,
      medium: r.medium,
      campaign: r.campaign,
      productName: r.productName,
      productId: r.productId,
      category: r.category,
      device: r.device,
      customerId: r.customerId,
      sessionId: r.sessionId,
      landingPage: r.landingPage,
      paymentMethod: r.paymentMethod,
      createdAt: r.createdAt,
      possibleDuplicate: Number(r.dupCount) > 1,
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    distinctEventTypes: eventTypeRows.map((r) => r.val).filter(Boolean) as string[],
    distinctSources: sourceRows.map((r) => r.val).filter(Boolean) as string[],
    distinctDevices: deviceRows.map((r) => r.val).filter(Boolean) as string[],
  };
}
