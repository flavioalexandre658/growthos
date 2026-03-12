import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  alertConfigs,
  organizations,
  orgMembers,
  users,
  events,
  payments,
  notifications,
} from "@/db/schema";
import { eq, and, desc, gte, lt, sql } from "drizzle-orm";
import dayjs from "@/utils/dayjs";
import { createNotification } from "@/utils/create-notification";
import { sendEmail } from "@/lib/email";
import { alertNotificationEmail } from "@/lib/email-templates/alert-notification";
import type { AlertType } from "@/db/schema/alert-config.schema";
import type { NotificationType } from "@/db/schema/notification.schema";

export const dynamic = "force-dynamic";

const ALERT_NOTIFICATION_TYPE: Record<AlertType, NotificationType> = {
  no_events: "alert_no_events",
  churn_rate: "alert_churn_rate",
  revenue_drop: "alert_revenue_drop",
};

async function hasRecentAlert(orgId: string, type: NotificationType): Promise<boolean> {
  const cutoff = dayjs().subtract(24, "hours").toDate();
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.organizationId, orgId),
        eq(notifications.type, type),
        gte(notifications.createdAt, cutoff),
      ),
    )
    .limit(1);
  return !!row;
}

async function getOrgOwnerEmails(orgId: string): Promise<{ email: string; locale: string }[]> {
  const rows = await db
    .select({ email: users.email, locale: users.locale })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(and(eq(orgMembers.organizationId, orgId), eq(orgMembers.role, "owner")));
  return rows.map((r) => ({ email: r.email, locale: r.locale ?? "pt" }));
}

async function evaluateNoEvents(
  orgId: string,
  thresholdMinutes: number,
): Promise<number | null> {
  const [latest] = await db
    .select({ createdAt: events.createdAt })
    .from(events)
    .where(eq(events.organizationId, orgId))
    .orderBy(desc(events.createdAt))
    .limit(1);

  if (!latest) return null;

  const minutesAgo = dayjs().diff(dayjs(latest.createdAt), "minute");
  return minutesAgo >= thresholdMinutes ? minutesAgo : null;
}

async function evaluateChurnRate(
  orgId: string,
  threshold: number,
): Promise<number | null> {
  const thirtyDaysAgo = dayjs().subtract(30, "days").toDate();
  const sixtyDaysAgo = dayjs().subtract(60, "days").toDate();

  const [activePrev] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, orgId),
        eq(payments.eventType, "renewal"),
        gte(payments.createdAt, sixtyDaysAgo),
        lt(payments.createdAt, thirtyDaysAgo),
      ),
    );

  const [canceled] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, orgId),
        eq(payments.eventType, "subscription_canceled"),
        gte(payments.createdAt, thirtyDaysAgo),
      ),
    );

  const prevCount = activePrev?.count ?? 0;
  if (prevCount === 0) return null;

  const churn = ((canceled?.count ?? 0) / prevCount) * 100;
  return churn >= threshold ? churn : null;
}

async function evaluateRevenueDrop(
  orgId: string,
  threshold: number,
): Promise<number | null> {
  const thirtyDaysAgo = dayjs().subtract(30, "days").toDate();
  const sixtyDaysAgo = dayjs().subtract(60, "days").toDate();

  const [current] = await db
    .select({ total: sql<number>`coalesce(sum(gross_value_in_cents), 0)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, orgId),
        sql`${payments.eventType} = ANY(ARRAY['purchase','renewal'])`,
        gte(payments.createdAt, thirtyDaysAgo),
      ),
    );

  const [previous] = await db
    .select({ total: sql<number>`coalesce(sum(gross_value_in_cents), 0)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, orgId),
        sql`${payments.eventType} = ANY(ARRAY['purchase','renewal'])`,
        gte(payments.createdAt, sixtyDaysAgo),
        lt(payments.createdAt, thirtyDaysAgo),
      ),
    );

  const currentTotal = current?.total ?? 0;
  const previousTotal = previous?.total ?? 0;

  if (previousTotal === 0) return null;

  const dropPct = ((previousTotal - currentTotal) / previousTotal) * 100;
  return dropPct >= threshold ? dropPct : null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const allActiveConfigs = await db
    .select({
      id: alertConfigs.id,
      organizationId: alertConfigs.organizationId,
      type: alertConfigs.type,
      threshold: alertConfigs.threshold,
      channelEmail: alertConfigs.channelEmail,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgLocale: organizations.locale,
    })
    .from(alertConfigs)
    .innerJoin(organizations, eq(alertConfigs.organizationId, organizations.id))
    .where(eq(alertConfigs.isActive, true));

  let triggered = 0;

  for (const config of allActiveConfigs) {
    const notifType = ALERT_NOTIFICATION_TYPE[config.type];

    if (await hasRecentAlert(config.organizationId, notifType)) continue;

    let currentValue: number | null = null;

    if (config.type === "no_events") {
      currentValue = await evaluateNoEvents(config.organizationId, config.threshold);
    } else if (config.type === "churn_rate") {
      currentValue = await evaluateChurnRate(config.organizationId, config.threshold);
    } else if (config.type === "revenue_drop") {
      currentValue = await evaluateRevenueDrop(config.organizationId, config.threshold);
    }

    if (currentValue === null) continue;

    const labelMap: Record<AlertType, string> = {
      no_events: `Sem eventos há ${currentValue.toFixed(0)} min`,
      churn_rate: `Churn: ${currentValue.toFixed(1)}%`,
      revenue_drop: `Queda de receita: ${currentValue.toFixed(1)}%`,
    };

    await createNotification({
      organizationId: config.organizationId,
      type: notifType,
      title: labelMap[config.type],
      body: `Limite: ${config.threshold}${config.type === "no_events" ? " min" : "%"}`,
      linkUrl: `/${config.orgSlug}/settings/notifications`,
      metadata: { threshold: config.threshold, currentValue },
    });

    if (config.channelEmail) {
      const owners = await getOrgOwnerEmails(config.organizationId);
      for (const owner of owners) {
        await sendEmail({
          to: owner.email,
          subject: `[Groware] Alerta: ${labelMap[config.type]}`,
          html: alertNotificationEmail({
            orgName: config.orgName,
            alertType: config.type,
            threshold: config.threshold,
            currentValue,
            dashboardUrl: `${baseUrl}/${config.orgSlug}`,
            locale: (owner.locale as "pt" | "en") ?? "pt",
          }),
        }).catch(() => {});
      }
    }

    triggered++;
  }

  return NextResponse.json({ ok: true, triggered });
}
