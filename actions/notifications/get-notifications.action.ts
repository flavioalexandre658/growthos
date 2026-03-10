"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import type { NotificationType } from "@/db/schema/notification.schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(30),
  onlyUnread: z.boolean().default(false),
});

export type NotificationRow = {
  id: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  linkUrl: string | null;
  metadata: unknown;
  isRead: boolean;
  createdAt: Date;
};

export async function getNotifications(
  input: z.infer<typeof schema>,
): Promise<NotificationRow[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const where = data.onlyUnread
    ? and(
        eq(notifications.organizationId, data.organizationId),
        eq(notifications.isRead, false),
      )
    : eq(notifications.organizationId, data.organizationId);

  return db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(data.limit) as Promise<NotificationRow[]>;
}
