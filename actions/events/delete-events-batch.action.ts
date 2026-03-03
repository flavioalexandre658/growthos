"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  organizationId: z.string().uuid(),
});

export async function deleteEventsBatch(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  return db
    .delete(events)
    .where(
      and(
        eq(events.organizationId, data.organizationId),
        inArray(events.id, data.ids)
      )
    )
    .returning();
}
