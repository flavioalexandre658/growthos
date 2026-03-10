import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgMembers, users, organizations, emailLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getEmailDynamicData } from "@/actions/emails/get-email-data.action";
import { sendSequenceEmail } from "@/actions/emails/send-sequence-email.action";
import type { IEmailSequenceState } from "@/interfaces/email-sequence.interface";
import { createNotification } from "@/utils/create-notification";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const members = await db
    .select({
      userId: orgMembers.userId,
      organizationId: orgMembers.organizationId,
      emailSequenceState: orgMembers.emailSequenceState,
      userEmail: users.email,
      onboardingCompleted: users.onboardingCompleted,
      orgName: organizations.name,
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
    .where(eq(users.onboardingCompleted, true));

  let processed = 0;

  for (const member of members) {
    const state = member.emailSequenceState as IEmailSequenceState | null;

    if (state?.digestEnabled === false) continue;
    if (state?.unsubscribedAt) continue;

    const alreadySentThisWeek = await db
      .select({ id: emailLogs.id })
      .from(emailLogs)
      .where(
        and(
          eq(emailLogs.userId, member.userId),
          eq(emailLogs.organizationId, member.organizationId),
          eq(emailLogs.emailId, "digest_weekly"),
        ),
      )
      .limit(1);

    const lastDigestLog = alreadySentThisWeek[0];

    if (lastDigestLog) {
      const lastSentRecord = await db
        .select({ sentAt: emailLogs.sentAt })
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.userId, member.userId),
            eq(emailLogs.organizationId, member.organizationId),
            eq(emailLogs.emailId, "digest_weekly"),
          ),
        )
        .orderBy(emailLogs.sentAt)
        .limit(1);

      if (lastSentRecord[0]) {
        const daysSinceLastSent = dayjs().diff(dayjs(lastSentRecord[0].sentAt), "day");
        if (daysSinceLastSent < 6) continue;
      }
    }

    const emailData = await getEmailDynamicData(
      "digest_weekly",
      member.userId,
      member.organizationId,
    );

    if (!emailData) continue;

    const result = await sendSequenceEmail({
      emailId: "digest_weekly",
      segment: "activated",
      userId: member.userId,
      organizationId: member.organizationId,
      userEmail: member.userEmail,
      data: emailData,
    });

    if (result.success) {
      createNotification({
        organizationId: member.organizationId,
        type: "weekly_digest",
        title: "Resumo semanal enviado",
        body: member.userEmail,
      }).catch(() => {});
      processed++;
    }
  }

  return NextResponse.json({ ok: true, processed });
}
