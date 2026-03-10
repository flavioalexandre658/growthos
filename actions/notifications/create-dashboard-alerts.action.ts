"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import dayjs from "@/utils/dayjs";

const alertSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  linkUrl: z.string().optional(),
  metadata: z
    .object({
      alertId: z.string(),
      abandonedCount: z.number().optional(),
    })
    .optional(),
});

const schema = z.object({
  organizationId: z.string().uuid(),
  alerts: z.array(alertSchema),
});

type AlertInput = z.infer<typeof alertSchema>;

export async function createDashboardAlerts(
  input: z.infer<typeof schema>,
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);
  const cutoff = dayjs().subtract(24, "hours").toDate();

  const existingRows = await db
    .select({
      metadata: notifications.metadata,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, data.organizationId),
        eq(notifications.type, "recommendation"),
        gte(notifications.createdAt, cutoff),
      ),
    );

  const existingByAlertId = new Map<
    string,
    { abandonedCount?: number }
  >();

  for (const row of existingRows) {
    const meta = row.metadata as { alertId?: string; abandonedCount?: number } | null;
    if (meta?.alertId) {
      existingByAlertId.set(meta.alertId, {
        abandonedCount: meta.abandonedCount,
      });
    }
  }

  const toInsert: AlertInput[] = [];

  for (const alert of data.alerts) {
    const alertId = alert.metadata?.alertId ?? alert.id;
    const existing = existingByAlertId.get(alertId);

    if (!existing) {
      toInsert.push(alert);
      continue;
    }

    if (alertId === "abandoned") {
      const currentCount = alert.metadata?.abandonedCount ?? 0;
      const lastCount = existing.abandonedCount ?? 0;
      if (currentCount - lastCount >= 15) {
        toInsert.push(alert);
      }
      continue;
    }
  }

  if (toInsert.length === 0) return;

  await db.insert(notifications).values(
    toInsert.map((a) => ({
      organizationId: data.organizationId,
      type: "recommendation" as const,
      title: a.title,
      body: a.body,
      linkUrl: a.linkUrl,
      metadata: {
        alertId: a.metadata?.alertId ?? a.id,
        ...(a.metadata?.abandonedCount !== undefined
          ? { abandonedCount: a.metadata.abandonedCount }
          : {}),
      },
    })),
  );
}
