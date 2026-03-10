"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";

const schema = z.object({
  id: z.string().uuid(),
});

export async function markNotificationRead(
  input: z.infer<typeof schema>,
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, data.id));
}
