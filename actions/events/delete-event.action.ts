"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";

const schema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export async function deleteEvent(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  return db
    .delete(events)
    .where(and(eq(events.id, data.id), eq(events.organizationId, data.organizationId)))
    .returning();
}
