import type { EmailSegment } from "@/interfaces/email-sequence.interface";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type EmailAnchor =
  | "userCreatedAt"
  | "onboardingCompletedAt"
  | "firstIntegrationAt"
  | "firstPageviewAt";

export interface EmailSequenceItem {
  emailId: string;
  delayMs: number;
  anchor: EmailAnchor;
  requires?: string[];
}

export const EMAIL_SEQUENCES: Record<EmailSegment, EmailSequenceItem[]> = {
  onboarding_incomplete: [
    {
      emailId: "onboarding_incomplete_2h",
      delayMs: 2 * HOUR,
      anchor: "userCreatedAt",
    },
    {
      emailId: "onboarding_incomplete_24h",
      delayMs: 24 * HOUR,
      anchor: "userCreatedAt",
      requires: ["onboarding_incomplete_2h"],
    },
    {
      emailId: "onboarding_incomplete_72h",
      delayMs: 72 * HOUR,
      anchor: "userCreatedAt",
    },
    {
      emailId: "onboarding_incomplete_7d",
      delayMs: 7 * DAY,
      anchor: "userCreatedAt",
    },
  ],
  dashboard_empty: [
    {
      emailId: "dashboard_empty_4h",
      delayMs: 4 * HOUR,
      anchor: "onboardingCompletedAt",
    },
    {
      emailId: "dashboard_empty_48h",
      delayMs: 48 * HOUR,
      anchor: "onboardingCompletedAt",
    },
    {
      emailId: "dashboard_empty_5d",
      delayMs: 5 * DAY,
      anchor: "onboardingCompletedAt",
    },
  ],
  gateway_only: [
    {
      emailId: "gateway_only_48h",
      delayMs: 48 * HOUR,
      anchor: "firstIntegrationAt",
    },
    {
      emailId: "gateway_only_5d",
      delayMs: 5 * DAY,
      anchor: "firstIntegrationAt",
    },
    {
      emailId: "gateway_only_10d",
      delayMs: 10 * DAY,
      anchor: "firstIntegrationAt",
    },
  ],
  tracker_only: [
    {
      emailId: "tracker_only_48h",
      delayMs: 48 * HOUR,
      anchor: "firstPageviewAt",
    },
    {
      emailId: "tracker_only_5d",
      delayMs: 5 * DAY,
      anchor: "firstPageviewAt",
    },
  ],
  inactive: [
    {
      emailId: "inactive_14d",
      delayMs: 14 * DAY,
      anchor: "userCreatedAt",
    },
    {
      emailId: "inactive_21d",
      delayMs: 21 * DAY,
      anchor: "userCreatedAt",
    },
    {
      emailId: "inactive_30d",
      delayMs: 30 * DAY,
      anchor: "userCreatedAt",
    },
  ],
  free_active: [
    {
      emailId: "free_active_14d",
      delayMs: 14 * DAY,
      anchor: "userCreatedAt",
    },
    {
      emailId: "free_active_21d",
      delayMs: 21 * DAY,
      anchor: "userCreatedAt",
    },
    {
      emailId: "free_active_30d",
      delayMs: 30 * DAY,
      anchor: "userCreatedAt",
    },
  ],
  activated: [],
};

export const QUIET_HOUR_START = 22;
export const QUIET_HOUR_END = 8;
export const MAX_EMAILS_PER_DAY = 1;
