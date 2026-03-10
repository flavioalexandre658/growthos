"use server";

import { db } from "@/db";
import { emailLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import type { IEmailDynamicData } from "./get-email-data.action";
import type { Locale } from "@/lib/email-templates/base-layout";

import {
  sequenceOnboardingIncompleteEmail,
  getOnboardingIncompleteSubject,
  type OnboardingIncompleteEmailId,
} from "@/lib/email-templates/sequence-onboarding-incomplete";
import {
  sequenceDashboardEmptyEmail,
  getDashboardEmptySubject,
  type DashboardEmptyEmailId,
} from "@/lib/email-templates/sequence-dashboard-empty";
import {
  sequenceGatewayOnlyEmail,
  getGatewayOnlySubject,
  type GatewayOnlyEmailId,
} from "@/lib/email-templates/sequence-gateway-only";
import {
  sequenceTrackerOnlyEmail,
  getTrackerOnlySubject,
  type TrackerOnlyEmailId,
} from "@/lib/email-templates/sequence-tracker-only";
import {
  sequenceInactiveEmail,
  getInactiveSubject,
  type InactiveEmailId,
} from "@/lib/email-templates/sequence-inactive";
import {
  sequenceFreeActiveEmail,
  getFreeActiveSubject,
  type FreeActiveEmailId,
} from "@/lib/email-templates/sequence-free-active";
import {
  weeklyDigestEmail,
  getWeeklyDigestSubject,
} from "@/lib/email-templates/weekly-digest";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://app.groware.io";

function buildUnsubscribeUrl(userId: string, organizationId: string, digestOnly = false): string {
  const token = Buffer.from(`${userId}:${organizationId}`).toString("base64");
  const base = `${APP_URL}/api/emails/unsubscribe?token=${token}`;
  return digestOnly ? `${base}&digest=1` : base;
}

function buildDashboardUrl(orgSlug: string): string {
  return `${APP_URL}/dashboard`;
}

function buildOnboardingUrl(step?: string): string {
  return step ? `${APP_URL}/onboarding?step=${step}` : `${APP_URL}/onboarding`;
}

function buildSettingsUrl(): string {
  return `${APP_URL}/settings/integrations`;
}

function buildComparativeUrl(): string {
  return `${APP_URL}/dashboard/comparative`;
}

function buildPlansUrl(): string {
  return `${APP_URL}/settings/billing`;
}

function renderEmailHtml(emailId: string, data: IEmailDynamicData, userId: string, organizationId: string): string | null {
  const locale = (data.locale ?? "pt") as Locale;
  const unsubscribeUrl = buildUnsubscribeUrl(userId, organizationId);
  const digestUnsubscribeUrl = buildUnsubscribeUrl(userId, organizationId, true);
  const dashboardUrl = buildDashboardUrl("");

  if (emailId.startsWith("onboarding_incomplete")) {
    return sequenceOnboardingIncompleteEmail({
      emailId: emailId as OnboardingIncompleteEmailId,
      userName: data.userName,
      orgName: data.orgName,
      currentStep: data.onboardingStep,
      onboardingUrl: buildOnboardingUrl(data.onboardingStep),
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("dashboard_empty")) {
    return sequenceDashboardEmptyEmail({
      emailId: emailId as DashboardEmptyEmailId,
      userName: data.userName,
      orgName: data.orgName,
      stripeUrl: buildSettingsUrl(),
      asaasUrl: buildSettingsUrl(),
      trackerUrl: buildSettingsUrl(),
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("gateway_only")) {
    return sequenceGatewayOnlyEmail({
      emailId: emailId as GatewayOnlyEmailId,
      userName: data.userName,
      orgName: data.orgName,
      revenueFormatted: data.revenueFormatted,
      trackerUrl: buildSettingsUrl(),
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("tracker_only")) {
    return sequenceTrackerOnlyEmail({
      emailId: emailId as TrackerOnlyEmailId,
      userName: data.userName,
      orgName: data.orgName,
      totalPageviews: data.totalPageviews,
      totalSignups: data.totalSignups,
      gatewayUrl: buildSettingsUrl(),
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("inactive")) {
    return sequenceInactiveEmail({
      emailId: emailId as InactiveEmailId,
      userName: data.userName,
      orgName: data.orgName,
      dashboardUrl,
      comparativeUrl: buildComparativeUrl(),
      significantChange: data.significantChange,
      periodRevenue: data.periodRevenue,
      newSubscribers: data.newSubscribers,
      churnRate: data.churnRate,
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("free_active")) {
    return sequenceFreeActiveEmail({
      emailId: emailId as FreeActiveEmailId,
      userName: data.userName,
      orgName: data.orgName,
      plansUrl: buildPlansUrl(),
      upgradeUrl: buildPlansUrl(),
      accessCount: data.accessCount,
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId === "digest_weekly") {
    return weeklyDigestEmail({
      orgName: data.orgName,
      userName: data.userName,
      dashboardUrl,
      digestUnsubscribeUrl,
      mrr: data.mrr ?? "—",
      mrrDelta: data.mrrDelta ?? "0%",
      mrrDeltaPositive: data.mrrDeltaPositive ?? true,
      weekRevenue: data.weekRevenue ?? "—",
      newSubscribers: data.newSubscribers ?? 0,
      churnRate: data.churnRate ?? "—",
      topChannel: data.topChannel,
      aiInsight: data.aiInsight,
      locale,
    });
  }

  return null;
}

function getEmailSubject(emailId: string, data: IEmailDynamicData): string {
  const locale = (data.locale ?? "pt") as Locale;

  if (emailId.startsWith("onboarding_incomplete")) {
    return getOnboardingIncompleteSubject(
      emailId as OnboardingIncompleteEmailId,
      locale,
      data.onboardingStep,
    );
  }
  if (emailId.startsWith("dashboard_empty")) {
    return getDashboardEmptySubject(emailId as DashboardEmptyEmailId, locale);
  }
  if (emailId.startsWith("gateway_only")) {
    return getGatewayOnlySubject(emailId as GatewayOnlyEmailId, locale);
  }
  if (emailId.startsWith("tracker_only")) {
    return getTrackerOnlySubject(emailId as TrackerOnlyEmailId, locale);
  }
  if (emailId.startsWith("inactive")) {
    return getInactiveSubject(emailId as InactiveEmailId, locale);
  }
  if (emailId.startsWith("free_active")) {
    return getFreeActiveSubject(
      emailId as FreeActiveEmailId,
      locale,
      data.accessCount,
    );
  }
  if (emailId === "digest_weekly") {
    return getWeeklyDigestSubject(data.orgName, locale);
  }
  return "Groware";
}

interface SendSequenceEmailInput {
  emailId: string;
  segment: string;
  userId: string;
  organizationId: string;
  userEmail: string;
  data: IEmailDynamicData;
}

export async function sendSequenceEmail(
  input: SendSequenceEmailInput,
): Promise<{ success: boolean; error?: string; subject?: string; html?: string }> {
  const { emailId, segment, userId, organizationId, userEmail, data } = input;

  const html = renderEmailHtml(emailId, data, userId, organizationId);
  if (!html) {
    return { success: false, error: `No template found for emailId: ${emailId}` };
  }

  const subject = getEmailSubject(emailId, data);

  await sendEmail({
    to: userEmail,
    subject,
    html,
    from: "Flavio from Groware <flavio@groware.io>",
    replyTo: "support@groware.io",
  });

  await db.insert(emailLogs).values({
    userId,
    organizationId,
    emailId,
    segment,
    sentAt: new Date(),
  });

  return { success: true, subject, html };
}
