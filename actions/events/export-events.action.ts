"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, inArray, or, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import dayjs from "@/utils/dayjs";
import type { IEventParams } from "@/interfaces/event.interface";

function escapeCSVField(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportEvents(
  organizationId: string,
  params: IEventParams = {}
): Promise<{ csv: string; filename: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { csv: "", filename: "eventos.csv" };

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(params, tz);

  const baseConditions = [
    eq(events.organizationId, organizationId),
    gte(events.createdAt, startDate),
    lte(events.createdAt, endDate),
  ];

  if (params.event_types && params.event_types.length > 0) {
    baseConditions.push(inArray(events.eventType, params.event_types));
  }
  if (params.source) baseConditions.push(eq(events.source, params.source));
  if (params.device) baseConditions.push(eq(events.device, params.device));
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
  if (params.min_value !== undefined) baseConditions.push(gte(events.grossValueInCents, params.min_value));
  if (params.max_value !== undefined) baseConditions.push(lte(events.grossValueInCents, params.max_value));

  const rows = await db
    .select({
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
    })
    .from(events)
    .where(and(...baseConditions))
    .orderBy(sql`${events.createdAt} DESC`)
    .limit(5000);

  const header = [
    "type",
    "value",
    "source",
    "medium",
    "campaign",
    "product",
    "product_id",
    "category",
    "device",
    "payment_method",
    "session_id",
    "customer_id",
    "landing_page",
    "created_at",
  ].join(",");

  const lines = rows.map((r) =>
    [
      escapeCSVField(r.eventType),
      r.grossValueInCents != null ? String(r.grossValueInCents / 100) : "",
      escapeCSVField(r.source),
      escapeCSVField(r.medium),
      escapeCSVField(r.campaign),
      escapeCSVField(r.productName),
      escapeCSVField(r.productId),
      escapeCSVField(r.category),
      escapeCSVField(r.device),
      escapeCSVField(r.paymentMethod),
      escapeCSVField(r.sessionId),
      escapeCSVField(r.customerId),
      escapeCSVField(r.landingPage),
      dayjs(r.createdAt).tz(tz).format("YYYY-MM-DD HH:mm:ss"),
    ].join(",")
  );

  const csv = [header, ...lines].join("\n");
  const filename = `eventos_${dayjs().format("YYYY-MM-DD")}.csv`;

  return { csv, filename };
}
