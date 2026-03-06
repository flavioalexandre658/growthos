"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events, payments } from "@/db/schema";

const schema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export async function deleteEvent(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const deleted = await db
    .delete(events)
    .where(and(eq(events.id, data.id), eq(events.organizationId, data.organizationId)))
    .returning({ eventHash: events.eventHash });

  const eventHash = deleted[0]?.eventHash;
  if (eventHash) {
    await db
      .delete(payments)
      .where(
        and(
          eq(payments.organizationId, data.organizationId),
          eq(payments.eventHash, eventHash)
        )
      );
  }

  return deleted;
}
