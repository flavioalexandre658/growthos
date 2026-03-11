import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import type { Locale } from "@/lib/email-templates/base-layout";
import type { OnboardingIncompleteEmailId } from "@/lib/email-templates/sequence-onboarding-incomplete";
import type { DashboardEmptyEmailId } from "@/lib/email-templates/sequence-dashboard-empty";
import type { GatewayOnlyEmailId } from "@/lib/email-templates/sequence-gateway-only";
import type { TrackerOnlyEmailId } from "@/lib/email-templates/sequence-tracker-only";
import type { InactiveEmailId } from "@/lib/email-templates/sequence-inactive";
import type { FreeActiveEmailId } from "@/lib/email-templates/sequence-free-active";
import { sequenceOnboardingIncompleteEmail, getOnboardingIncompleteSubject } from "@/lib/email-templates/sequence-onboarding-incomplete";
import { sequenceDashboardEmptyEmail, getDashboardEmptySubject } from "@/lib/email-templates/sequence-dashboard-empty";
import { sequenceGatewayOnlyEmail, getGatewayOnlySubject } from "@/lib/email-templates/sequence-gateway-only";
import { sequenceTrackerOnlyEmail, getTrackerOnlySubject } from "@/lib/email-templates/sequence-tracker-only";
import { sequenceInactiveEmail, getInactiveSubject } from "@/lib/email-templates/sequence-inactive";
import { sequenceFreeActiveEmail, getFreeActiveSubject } from "@/lib/email-templates/sequence-free-active";
import { weeklyDigestEmail, getWeeklyDigestSubject } from "@/lib/email-templates/weekly-digest";

const TEST_RECIPIENT = "alexandre.flavio658@gmail.com";
const TEST_SECRET = process.env.CRON_SECRET ?? process.env.TEST_EMAIL_SECRET;
const APP_URL = process.env.NEXTAUTH_URL ?? "https://app.groware.io";

const VALID_EMAIL_IDS = [
  "onboarding_incomplete_2h",
  "onboarding_incomplete_24h",
  "onboarding_incomplete_72h",
  "onboarding_incomplete_7d",
  "dashboard_empty_4h",
  "dashboard_empty_48h",
  "dashboard_empty_5d",
  "gateway_only_48h",
  "gateway_only_5d",
  "gateway_only_10d",
  "tracker_only_48h",
  "tracker_only_5d",
  "inactive_14d",
  "inactive_21d",
  "inactive_30d",
  "free_active_14d",
  "free_active_21d",
  "free_active_limit_reached",
  "free_active_30d",
  "digest_weekly",
] as const;

function buildUnsubscribeUrl(digestOnly = false): string {
  const token = Buffer.from("test-user:test-org").toString("base64");
  const base = `${APP_URL}/api/emails/unsubscribe?token=${token}`;
  return digestOnly ? `${base}&digest=1` : base;
}

function renderTestHtml(emailId: string, locale: Locale): string | null {
  const unsubscribeUrl = buildUnsubscribeUrl();
  const digestUnsubscribeUrl = buildUnsubscribeUrl(true);
  const settingsUrl = `${APP_URL}/settings/integrations`;
  const dashboardUrl = `${APP_URL}/dashboard`;

  if (emailId.startsWith("onboarding_incomplete")) {
    return sequenceOnboardingIncompleteEmail({
      emailId: emailId as OnboardingIncompleteEmailId,
      userName: "Flavio",
      orgName: "Groware Demo",
      currentStep: "2",
      onboardingUrl: `${APP_URL}/onboarding/groware-demo?step=funnel`,
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("dashboard_empty")) {
    return sequenceDashboardEmptyEmail({
      emailId: emailId as DashboardEmptyEmailId,
      userName: "Flavio",
      orgName: "Groware Demo",
      stripeUrl: settingsUrl,
      asaasUrl: settingsUrl,
      trackerUrl: settingsUrl,
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("gateway_only")) {
    return sequenceGatewayOnlyEmail({
      emailId: emailId as GatewayOnlyEmailId,
      userName: "Flavio",
      orgName: "Groware Demo",
      revenueFormatted: "R$ 4.230,00",
      trackerUrl: settingsUrl,
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("tracker_only")) {
    return sequenceTrackerOnlyEmail({
      emailId: emailId as TrackerOnlyEmailId,
      userName: "Flavio",
      orgName: "Groware Demo",
      totalPageviews: 1847,
      totalSignups: 63,
      gatewayUrl: settingsUrl,
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("inactive")) {
    return sequenceInactiveEmail({
      emailId: emailId as InactiveEmailId,
      userName: "Flavio",
      orgName: "Groware Demo",
      dashboardUrl,
      comparativeUrl: `${APP_URL}/dashboard/comparative`,
      significantChange: "Seu MRR cresceu 12% nas últimas duas semanas",
      periodRevenue: "R$ 8.640,00",
      newSubscribers: 14,
      churnRate: "2,3%",
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId.startsWith("free_active")) {
    return sequenceFreeActiveEmail({
      emailId: emailId as FreeActiveEmailId,
      userName: "Flavio",
      orgName: "Groware Demo",
      plansUrl: `${APP_URL}/settings/billing`,
      upgradeUrl: `${APP_URL}/settings/billing`,
      accessCount: 22,
      limitedResource: "análises de IA",
      unsubscribeUrl,
      locale,
    });
  }

  if (emailId === "digest_weekly") {
    return weeklyDigestEmail({
      orgName: "Groware Demo",
      userName: "Flavio",
      dashboardUrl,
      digestUnsubscribeUrl,
      mrr: "R$ 12.480,00",
      mrrDelta: "8,3%",
      mrrDeltaPositive: true,
      weekRevenue: "R$ 3.120,00",
      newSubscribers: 9,
      churnRate: "1,8%",
      churnDelta: "0,4%",
      churnDeltaPositive: false,
      topChannel: "Google Orgânico",
      aiInsight:
        "Seu crescimento de MRR foi impulsionado principalmente por upgrades de plano. O canal Google Orgânico gerou 4 dos 9 novos assinantes desta semana.",
      locale,
    });
  }

  return null;
}

function getTestSubject(emailId: string, locale: Locale): string {
  if (emailId.startsWith("onboarding_incomplete")) {
    return getOnboardingIncompleteSubject(emailId as OnboardingIncompleteEmailId, locale, "2");
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
    return getFreeActiveSubject(emailId as FreeActiveEmailId, locale, 22, "análises de IA");
  }
  if (emailId === "digest_weekly") {
    return getWeeklyDigestSubject("Groware Demo", locale);
  }
  return "Groware — Test Email";
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!TEST_SECRET || authHeader !== `Bearer ${TEST_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const emailId = searchParams.get("emailId");
  const locale = (searchParams.get("locale") ?? "pt") as Locale;

  if (!emailId) {
    return NextResponse.json({
      error: "Missing emailId query param",
      validEmailIds: VALID_EMAIL_IDS,
    }, { status: 400 });
  }

  if (!VALID_EMAIL_IDS.includes(emailId as typeof VALID_EMAIL_IDS[number])) {
    return NextResponse.json({
      error: `Invalid emailId: "${emailId}"`,
      validEmailIds: VALID_EMAIL_IDS,
    }, { status: 400 });
  }

  const html = renderTestHtml(emailId, locale);
  if (!html) {
    return NextResponse.json({ error: `Failed to render template for: ${emailId}` }, { status: 500 });
  }

  const subject = `[TEST] ${getTestSubject(emailId, locale)}`;

  await sendEmail({
    to: TEST_RECIPIENT,
    subject,
    html,
    from: "Flavio from Groware <flavio@groware.io>",
    replyTo: "support@groware.io",
  });

  return NextResponse.json({
    success: true,
    emailId,
    locale,
    subject,
    sentTo: TEST_RECIPIENT,
  });
}
