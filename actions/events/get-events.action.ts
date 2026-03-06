"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, inArray, or, ilike, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, payments, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IEventParams, IEventsResult } from "@/interfaces/event.interface";

const PAYMENT_EVENT_TYPES = [
  "purchase",
  "renewal",
  "refund",
  "subscription_canceled",
  "subscription_changed",
];

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
      distinctProviders: [],
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

  if (params.billing_type) {
    baseConditions.push(eq(events.billingType, params.billing_type));
  }

  if (params.provider) {
    baseConditions.push(eq(events.provider, params.provider));
  }

  const whereClause = and(...baseConditions);

  const paymentsConditions = [
    eq(payments.organizationId, organizationId),
    gte(payments.createdAt, startDate),
    lte(payments.createdAt, endDate),
  ];

  if (params.event_types && params.event_types.length > 0) {
    paymentsConditions.push(inArray(payments.eventType, params.event_types));
  } else {
    paymentsConditions.push(inArray(payments.eventType, PAYMENT_EVENT_TYPES));
  }

  if (params.source) paymentsConditions.push(eq(payments.source, params.source));
  if (params.device) paymentsConditions.push(eq(payments.device, params.device));

  if (params.search) {
    const term = `%${params.search}%`;
    paymentsConditions.push(
      or(
        ilike(payments.customerId, term),
        ilike(payments.sessionId, term),
        ilike(payments.productId, term),
        ilike(payments.productName, term)
      )!
    );
  }

  if (params.min_value !== undefined) paymentsConditions.push(gte(payments.grossValueInCents, params.min_value));
  if (params.max_value !== undefined) paymentsConditions.push(lte(payments.grossValueInCents, params.max_value));
  if (params.billing_type) paymentsConditions.push(eq(payments.billingType, params.billing_type));
  if (params.provider) paymentsConditions.push(eq(payments.provider, params.provider));

  const paymentsWhereClause = and(...paymentsConditions);

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

  const [eventsRows, paymentsRows, eventsTotalRow, paymentsTotalRow] = await Promise.all([
    db
      .select({
        id: events.id,
        eventType: events.eventType,
        grossValueInCents: events.grossValueInCents,
        currency: events.currency,
        baseCurrency: events.baseCurrency,
        baseGrossValueInCents: events.baseGrossValueInCents,
        billingType: events.billingType,
        billingReason: events.billingReason,
        billingInterval: events.billingInterval,
        subscriptionId: events.subscriptionId,
        provider: events.provider,
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
        eventHash: events.eventHash,
        dupCount: dupWindowExpr,
        isRetry: sql<boolean>`COALESCE((${events.metadata}->>'retried')::boolean, false)`,
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

    db
      .select({
        id: payments.id,
        eventType: payments.eventType,
        grossValueInCents: payments.grossValueInCents,
        currency: payments.currency,
        baseCurrency: payments.baseCurrency,
        baseGrossValueInCents: payments.baseGrossValueInCents,
        billingType: payments.billingType,
        billingReason: payments.billingReason,
        billingInterval: payments.billingInterval,
        subscriptionId: payments.subscriptionId,
        provider: payments.provider,
        source: payments.source,
        medium: payments.medium,
        campaign: payments.campaign,
        productName: payments.productName,
        productId: payments.productId,
        category: payments.category,
        device: payments.device,
        customerId: payments.customerId,
        sessionId: payments.sessionId,
        landingPage: payments.landingPage,
        paymentMethod: payments.paymentMethod,
        createdAt: payments.createdAt,
        eventHash: payments.eventHash,
      })
      .from(payments)
      .where(paymentsWhereClause)
      .orderBy(
        params.order_dir === "ASC"
          ? payments.createdAt
          : sql`${payments.createdAt} DESC`
      )
      .limit(limit)
      .offset(offset),

    db.select({ count: sql<number>`COUNT(*)` }).from(events).where(whereClause),
    db.select({ count: sql<number>`COUNT(*)` }).from(payments).where(paymentsWhereClause),
  ]);

  const eventsHashes = new Set(eventsRows.map((r) => r.eventHash).filter(Boolean));

  const mergedRows = [
    ...eventsRows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      grossValueInCents: r.grossValueInCents,
      currency: r.currency,
      baseCurrency: r.baseCurrency,
      baseGrossValueInCents: r.baseGrossValueInCents,
      billingType: r.billingType,
      billingReason: r.billingReason,
      billingInterval: r.billingInterval,
      subscriptionId: r.subscriptionId,
      provider: r.provider,
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
      eventHash: r.eventHash ?? null,
      possibleDuplicate: Number(r.dupCount) > 1,
      isRetry: Boolean(r.isRetry),
    })),
    ...paymentsRows
      .filter((r) => !eventsHashes.has(r.eventHash))
      .map((r) => ({
        id: r.id,
        eventType: r.eventType,
        grossValueInCents: r.grossValueInCents,
        currency: r.currency,
        baseCurrency: r.baseCurrency,
        baseGrossValueInCents: r.baseGrossValueInCents,
        billingType: r.billingType,
        billingReason: r.billingReason,
        billingInterval: r.billingInterval,
        subscriptionId: r.subscriptionId,
        provider: r.provider,
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
        eventHash: r.eventHash ?? null,
        possibleDuplicate: false,
        isRetry: false,
      })),
  ]
    .sort((a, b) =>
      params.order_dir === "ASC"
        ? a.createdAt.getTime() - b.createdAt.getTime()
        : b.createdAt.getTime() - a.createdAt.getTime()
    )
    .slice(0, limit);

  const eventsTotal = Number(eventsTotalRow[0]?.count ?? 0);
  const paymentsTotal = Number(paymentsTotalRow[0]?.count ?? 0);
  const total = Math.max(eventsTotal, paymentsTotal);

  const [eventTypeRows, sourceRows, deviceRows, providerRows] = await Promise.all([
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
    db
      .selectDistinct({ val: events.provider })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.createdAt, startDate),
          lte(events.createdAt, endDate),
          isNotNull(events.provider)
        )
      ),
  ]);

  return {
    data: mergedRows,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    distinctEventTypes: eventTypeRows.map((r) => r.val).filter(Boolean) as string[],
    distinctSources: sourceRows.map((r) => r.val).filter(Boolean) as string[],
    distinctDevices: deviceRows.map((r) => r.val).filter(Boolean) as string[],
    distinctProviders: providerRows.map((r) => r.val).filter(Boolean) as string[],
  };
}

