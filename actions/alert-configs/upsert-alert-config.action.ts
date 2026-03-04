"use server";

import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { alertConfigs } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  type: z.enum(["no_events", "churn_rate", "revenue_drop"]),
  threshold: z.number().positive(),
  isActive: z.boolean().default(true),
  channelEmail: z.boolean().default(true),
});

export async function upsertAlertConfig(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [result] = await db
    .insert(alertConfigs)
    .values({
      organizationId: data.organizationId,
      type: data.type,
      threshold: data.threshold,
      isActive: data.isActive,
      channelEmail: data.channelEmail,
    })
    .onConflictDoUpdate({
      target: [alertConfigs.organizationId, alertConfigs.type],
      set: {
        threshold: data.threshold,
        isActive: data.isActive,
        channelEmail: data.channelEmail,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}
