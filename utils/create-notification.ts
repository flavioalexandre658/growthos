import { db } from "@/db";
import { notifications } from "@/db/schema";
import type { NotificationType } from "@/db/schema/notification.schema";

interface CreateNotificationInput {
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  await db.insert(notifications).values({
    organizationId: input.organizationId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    linkUrl: input.linkUrl ?? null,
    metadata: input.metadata ?? null,
  });
}
