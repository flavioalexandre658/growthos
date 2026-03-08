export type EmailSegment =
  | "onboarding_incomplete"
  | "dashboard_empty"
  | "gateway_only"
  | "tracker_only"
  | "inactive"
  | "free_active"
  | "activated";

export interface IEmailSequenceState {
  segment: EmailSegment;
  emailsSent: Record<string, string>;
  lastActivityAt: string;
  digestEnabled: boolean;
  unsubscribedAt: string | null;
}
