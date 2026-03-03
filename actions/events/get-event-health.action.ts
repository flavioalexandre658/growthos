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
    return { status: "never", lastEventAt: null, todayCount: 0, hourlyVolume: [] };
  }

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const todayStart = dayjs().tz(tz).startOf("day").toDate();
  const last24hStart = dayjs().subtract(24, "hour").toDate();

  const [latestRow, countRow, hourlyRows] = await Promise.all([
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
    db
      .select({
        hour: sql<string>`to_char(date_trunc('hour', ${events.createdAt}), 'YYYY-MM-DD"T"HH24:00:00')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.createdAt, last24hStart)
        )
      )
      .groupBy(sql`date_trunc('hour', ${events.createdAt})`)
      .orderBy(sql`date_trunc('hour', ${events.createdAt})`),
  ]);

  const lastEventAt = latestRow[0]?.createdAt ?? null;
  const todayCount = Number(countRow[0]?.count ?? 0);

  const hourlyMap = new Map<string, number>();
  for (const row of hourlyRows) {
    hourlyMap.set(row.hour, Number(row.count));
  }

  const hourlyVolume: { hour: string; count: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const hour = dayjs().subtract(i, "hour").startOf("hour").format("YYYY-MM-DDTHH:00:00");
    hourlyVolume.push({ hour, count: hourlyMap.get(hour) ?? 0 });
  }

  if (!lastEventAt) {
    return { status: "never", lastEventAt: null, todayCount: 0, hourlyVolume };
  }

  const minutesSinceLastEvent = dayjs().diff(dayjs(lastEventAt), "minute");
  const hoursSinceLastEvent = minutesSinceLastEvent / 60;

  if (hoursSinceLastEvent < 24 && todayCount > 0) {
    if (minutesSinceLastEvent >= 45) {
      return { status: "stale", lastEventAt, todayCount, minutesSinceLastEvent, hourlyVolume };
    }
    return { status: "receiving", lastEventAt, todayCount, hourlyVolume };
  }

  return { status: "idle", lastEventAt, todayCount, hourlyVolume };
}
