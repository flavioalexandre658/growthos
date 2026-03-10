import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgMembers, users, organizations, emailLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { classifyUserSegment } from "@/actions/emails/classify-user-segment.action";
import { getEmailDynamicData } from "@/actions/emails/get-email-data.action";
import { sendSequenceEmail } from "@/actions/emails/send-sequence-email.action";
import {
  EMAIL_SEQUENCES,
  QUIET_HOUR_START,
  QUIET_HOUR_END,
} from "@/lib/email-templates/sequence-constants";
import type { IEmailSequenceState } from "@/interfaces/email-sequence.interface";
import { createNotification } from "@/utils/create-notification";

dayjs.extend(utc);
dayjs.extend(timezone);

function isQuietHour(orgTimezone: string): boolean {
  const hour = dayjs().tz(orgTimezone).hour();
  return hour >= QUIET_HOUR_START || hour < QUIET_HOUR_END;
}

function hasEmailBeenSentToday(emailsSent: Record<string, string>): boolean {
  const today = dayjs().format("YYYY-MM-DD");
  return Object.values(emailsSent).some((sentAt) => sentAt.startsWith(today));
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const allMembers = await db
    .select({
      userId: orgMembers.userId,
      organizationId: orgMembers.organizationId,
      emailSequenceState: orgMembers.emailSequenceState,
      userEmail: users.email,
      userCreatedAt: users.createdAt,
      orgTimezone: organizations.timezone,
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id));

  let processed = 0;

  for (const member of allMembers) {
    const state = member.emailSequenceState as IEmailSequenceState | null;

    if (state?.unsubscribedAt) continue;

    if (isQuietHour(member.orgTimezone)) continue;

    const { segment, onboardingCompletedAt, firstIntegrationAt, firstPageviewAt } =
      await classifyUserSegment({
        userId: member.userId,
        organizationId: member.organizationId,
      });

    if (segment === "activated") continue;

    const sequenceItems = EMAIL_SEQUENCES[segment] ?? [];
    if (sequenceItems.length === 0) continue;

    const previousSegment = state?.segment;
    const emailsSent = state?.emailsSent ?? {};

    if (hasEmailBeenSentToday(emailsSent)) continue;

    const existingLogs = await db
      .select({ emailId: emailLogs.emailId })
      .from(emailLogs)
      .where(
        and(
          eq(emailLogs.userId, member.userId),
          eq(emailLogs.organizationId, member.organizationId),
        ),
      );

    const sentEmailIds = new Set(existingLogs.map((l) => l.emailId));

    for (const item of sequenceItems) {
      if (sentEmailIds.has(item.emailId)) continue;

      if (item.requires?.some((reqId) => !sentEmailIds.has(reqId))) continue;

      let anchorDate: Date;
      switch (item.anchor) {
        case "userCreatedAt":
          anchorDate = member.userCreatedAt;
          break;
        case "onboardingCompletedAt":
          anchorDate = onboardingCompletedAt ?? member.userCreatedAt;
          break;
        case "firstIntegrationAt":
          anchorDate = firstIntegrationAt ?? member.userCreatedAt;
          break;
        case "firstPageviewAt":
          anchorDate = firstPageviewAt ?? member.userCreatedAt;
          break;
        default:
          anchorDate = member.userCreatedAt;
      }

      const triggerAt = new Date(anchorDate.getTime() + item.delayMs);
      if (new Date() < triggerAt) continue;

      const emailData = await getEmailDynamicData(
        item.emailId,
        member.userId,
        member.organizationId,
      );

      if (!emailData) continue;

      const result = await sendSequenceEmail({
        emailId: item.emailId,
        segment,
        userId: member.userId,
        organizationId: member.organizationId,
        userEmail: member.userEmail,
        data: emailData,
      });

      if (result.success) {
        const updatedEmailsSent =
          previousSegment !== segment
            ? { [item.emailId]: dayjs().toISOString() }
            : { ...emailsSent, [item.emailId]: dayjs().toISOString() };

        await db
          .update(orgMembers)
          .set({
            emailSequenceState: {
              segment,
              emailsSent: updatedEmailsSent,
              lastActivityAt: state?.lastActivityAt ?? dayjs().toISOString(),
              digestEnabled: state?.digestEnabled ?? true,
              unsubscribedAt: state?.unsubscribedAt ?? null,
            },
          })
          .where(
            and(
              eq(orgMembers.userId, member.userId),
              eq(orgMembers.organizationId, member.organizationId),
            ),
          );

        createNotification({
          organizationId: member.organizationId,
          type: "email_sequence",
          title: result.subject ?? item.emailId,
          body: member.userEmail,
          metadata: {
            emailId: item.emailId,
            emailHtml: result.html ?? null,
          },
        }).catch(() => {});

        processed++;
        break;
      }
    }
  }

  return NextResponse.json({ ok: true, processed });
}
