"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events, payments } from "@/db/schema";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  organizationId: z.string().uuid(),
});

export async function deleteEventsBatch(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const deletedEvents = await db
    .delete(events)
    .where(
      and(
        eq(events.organizationId, data.organizationId),
        inArray(events.id, data.ids)
      )
    )
    .returning({ id: events.id, eventHash: events.eventHash });

  const deletedEventIds = new Set(deletedEvents.map((r) => r.id));
  const eventHashes = deletedEvents.map((r) => r.eventHash).filter(Boolean) as string[];
  if (eventHashes.length > 0) {
    await db
      .delete(payments)
      .where(
        and(
          eq(payments.organizationId, data.organizationId),
          inArray(payments.eventHash, eventHashes)
        )
      );
  }

  const remainingIds = data.ids.filter((id) => !deletedEventIds.has(id));
  if (remainingIds.length > 0) {
    const deletedPayments = await db
      .delete(payments)
      .where(
        and(
          eq(payments.organizationId, data.organizationId),
          inArray(payments.id, remainingIds)
        )
      )
      .returning({ eventHash: payments.eventHash });

    const paymentHashes = deletedPayments.map((r) => r.eventHash).filter(Boolean) as string[];
    if (paymentHashes.length > 0) {
      await db
        .delete(events)
        .where(
          and(
            eq(events.organizationId, data.organizationId),
            inArray(events.eventHash, paymentHashes)
          )
        );
    }
  }

  return deletedEvents;
}
