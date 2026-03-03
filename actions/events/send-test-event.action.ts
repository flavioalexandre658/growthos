"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys, events } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
});

export async function sendTestEvent(
  input: z.infer<typeof schema>
): Promise<{ success: boolean; eventId: string; receivedAt: Date }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [activeKey] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.organizationId, data.organizationId),
        eq(apiKeys.isActive, true)
      )
    )
    .limit(1);

  if (!activeKey) throw new Error("No active API key found for this organization");

  const receivedAt = new Date();

  const [inserted] = await db
    .insert(events)
    .values({
      organizationId: data.organizationId,
      eventType: "debug_test",
      source: "growthOS_debug",
      medium: "debug",
      device: "debug",
      metadata: { source: "growthOS_debug", sentAt: receivedAt.toISOString() },
    })
    .returning({ id: events.id });

  return { success: true, eventId: inserted.id, receivedAt };
}
