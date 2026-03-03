"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import dayjs from "@/utils/dayjs";
import type { IEventHealth } from "@/interfaces/event.interface";

export async function getEventHealth(organizationId: string): Promise<IEventHealth> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { status: "never", lastEventAt: null, todayCount: 0 };
  }

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const todayStart = dayjs().tz(tz).startOf("day").toDate();

  const [latestRow, countRow] = await Promise.all([
    db
      .select({ createdAt: events.createdAt })
      .from(events)
      .where(eq(events.organizationId, organizationId))
      .orderBy(desc(events.createdAt))
      .limit(1),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.createdAt, todayStart)
        )
      ),
  ]);

  const lastEventAt = latestRow[0]?.createdAt ?? null;
  const todayCount = Number(countRow[0]?.count ?? 0);

  if (!lastEventAt) {
    return { status: "never", lastEventAt: null, todayCount: 0 };
  }

  const hoursSinceLastEvent = dayjs().diff(dayjs(lastEventAt), "hour");

  if (hoursSinceLastEvent < 24 && todayCount > 0) {
    return { status: "receiving", lastEventAt, todayCount };
  }

  return { status: "idle", lastEventAt, todayCount };
}
