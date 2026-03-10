"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { and, eq, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
});

export async function getUnreadNotificationCount(
  input: z.infer<typeof schema>,
): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [result] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, data.organizationId),
        eq(notifications.isRead, false),
      ),
    );

  return result?.value ?? 0;
}
