"use server";

import { getServerSession } from "next-auth";
import { eq, and, gte, desc } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { events, pageviewAggregates } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
});

export async function checkEvents(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { count: 0, latestEvent: null };

  const data = schema.parse(input);
  const since = new Date(Date.now() - 5 * 60 * 1000);

  const [eventRows, pageviewRows] = await Promise.all([
    db
      .select({
        id: events.id,
        eventType: events.eventType,
        source: events.source,
        landingPage: events.landingPage,
        device: events.device,
        createdAt: events.createdAt,
      })
      .from(events)
      .where(
        and(
          eq(events.organizationId, data.organizationId),
          gte(events.createdAt, since),
        ),
      )
      .orderBy(desc(events.createdAt))
      .limit(10),

    db
      .select({
        id: pageviewAggregates.id,
        source: pageviewAggregates.source,
        landingPage: pageviewAggregates.landingPage,
        device: pageviewAggregates.device,
        createdAt: pageviewAggregates.createdAt,
      })
      .from(pageviewAggregates)
      .where(
        and(
          eq(pageviewAggregates.organizationId, data.organizationId),
          gte(pageviewAggregates.createdAt, since),
        ),
      )
      .orderBy(desc(pageviewAggregates.createdAt))
      .limit(10),
  ]);

  const pageviewsMapped = pageviewRows.map((r) => ({
    id: r.id,
    eventType: "pageview" as const,
    source: r.source,
    landingPage: r.landingPage,
    device: r.device,
    createdAt: r.createdAt,
  }));

  const all = [...eventRows, ...pageviewsMapped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    count: all.length,
    latestEvent: all[0] ?? null,
  };
}
