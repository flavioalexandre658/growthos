"use server";

import { db } from "@/db";
import { users, orgMembers, integrations, events, pageviewAggregates } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import type { EmailSegment } from "@/interfaces/email-sequence.interface";
import dayjs from "dayjs";

interface ClassifyUserSegmentInput {
  userId: string;
  organizationId: string;
}

interface ClassifyUserSegmentResult {
  segment: EmailSegment;
  onboardingCompletedAt?: Date;
  firstIntegrationAt?: Date;
  firstPageviewAt?: Date;
}

export async function classifyUserSegment(
  input: ClassifyUserSegmentInput,
): Promise<ClassifyUserSegmentResult> {
  const { userId, organizationId } = input;

  const [user] = await db
    .select({
      onboardingCompleted: users.onboardingCompleted,
      planSlug: users.planSlug,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { segment: "activated" };
  }

  if (!user.onboardingCompleted) {
    return { segment: "onboarding_incomplete" };
  }

  const [activeIntegration] = await db
    .select({ id: integrations.id, createdAt: integrations.createdAt })
    .from(integrations)
    .where(
      and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.status, "active"),
      ),
    )
    .limit(1);

  const [pageviewCount] = await db
    .select({ total: count() })
    .from(pageviewAggregates)
    .where(eq(pageviewAggregates.organizationId, organizationId))
    .limit(1);

  const hasActiveIntegration = !!activeIntegration;
  const hasPageviews = (pageviewCount?.total ?? 0) > 0;

  if (!hasActiveIntegration && !hasPageviews) {
    return {
      segment: "dashboard_empty",
      onboardingCompletedAt: user.createdAt,
    };
  }

  if (hasActiveIntegration && !hasPageviews) {
    return {
      segment: "gateway_only",
      firstIntegrationAt: activeIntegration.createdAt ?? undefined,
    };
  }

  if (!hasActiveIntegration && hasPageviews) {
    const [firstPageview] = await db
      .select({ date: pageviewAggregates.date })
      .from(pageviewAggregates)
      .where(eq(pageviewAggregates.organizationId, organizationId))
      .orderBy(pageviewAggregates.date)
      .limit(1);

    return {
      segment: "tracker_only",
      firstPageviewAt: firstPageview?.date
        ? new Date(firstPageview.date)
        : undefined,
    };
  }

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

  const lastActivityAt = member?.emailSequenceState?.lastActivityAt;

  if (lastActivityAt) {
    const daysSinceActivity = dayjs().diff(dayjs(lastActivityAt), "day");
    if (daysSinceActivity > 7) {
      return { segment: "inactive" };
    }
  }

  if (user.planSlug === "free") {
    return { segment: "free_active" };
  }

  return { segment: "activated" };
}

export async function hasPageviewsForOrg(organizationId: string): Promise<boolean> {
  const [result] = await db
    .select({ total: count() })
    .from(pageviewAggregates)
    .where(eq(pageviewAggregates.organizationId, organizationId))
    .limit(1);
  return (result?.total ?? 0) > 0;
}

export async function hasActiveIntegrationForOrg(organizationId: string): Promise<boolean> {
  const [result] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.status, "active"),
      ),
    )
    .limit(1);
  return !!result;
}
