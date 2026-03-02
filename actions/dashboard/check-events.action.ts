"use server";

import { getServerSession } from "next-auth";
import { eq, and, gte, desc } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { events } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
});

export async function checkEvents(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { count: 0, latestEvent: null };

  const data = schema.parse(input);
  const since = new Date(Date.now() - 5 * 60 * 1000);

  const rows = await db
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
        gte(events.createdAt, since)
      )
    )
    .orderBy(desc(events.createdAt))
    .limit(10);

  return {
    count: rows.length,
    latestEvent: rows[0] ?? null,
  };
}
