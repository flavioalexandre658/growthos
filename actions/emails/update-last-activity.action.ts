"use server";

import { db } from "@/db";
import { orgMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import dayjs from "dayjs";

export async function updateLastActivity(organizationId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const userId = session.user.id;

  const [member] = await db
    .select({ emailSequenceState: orgMembers.emailSequenceState })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.userId, userId),
        eq(orgMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!member) return;

  const existing = member.emailSequenceState ?? {
    segment: "onboarding_incomplete" as const,
    emailsSent: {},
    lastActivityAt: dayjs().toISOString(),
    digestEnabled: true,
    unsubscribedAt: null,
  };

  await db
    .update(orgMembers)
    .set({
      emailSequenceState: {
        ...existing,
        lastActivityAt: dayjs().toISOString(),
      },
    })
    .where(
      and(
        eq(orgMembers.userId, userId),
        eq(orgMembers.organizationId, organizationId),
      ),
    );
}
