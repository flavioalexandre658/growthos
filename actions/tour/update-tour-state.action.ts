"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { orgMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { ITourState } from "@/interfaces/tour.interface";

export async function updateTourState(
  organizationId: string,
  patch: Partial<ITourState>,
): Promise<{ data: true } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const existing = await db
    .select({ tourState: orgMembers.tourState })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.organizationId, organizationId),
        eq(orgMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!existing[0]) return { error: "Member not found" };

  const current = existing[0].tourState ?? {
    checklistDismissedAt: null,
    aiPageVisited: false,
    tourStartedAt: new Date().toISOString(),
    tourCompletedAt: null,
  };

  const updated: ITourState = { ...current, ...patch };

  await db
    .update(orgMembers)
    .set({ tourState: updated })
    .where(
      and(
        eq(orgMembers.organizationId, organizationId),
        eq(orgMembers.userId, session.user.id),
      ),
    );

  return { data: true };
}
