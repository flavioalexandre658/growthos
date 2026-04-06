import type { IIntegration, IntegrationProvider } from "@/interfaces/integration.interface";

export interface IntegrationDrawerConfig {
  provider: IntegrationProvider;
  providerName: string;
  tagline: string;
  accentColor: string;
  logo: React.ReactNode;
  badge?: string;
  credentialLabel: string;
  credentialPlaceholder: string;
  connectVia: string;
  howToGetCredential: string;
  tutorialSteps: string[];
  dashboardUrl: string;
  openDashboardLabel: string;
  webhookEvents: string[];
  webhookStep1: string;
  webhookStep2: string;
  webhookStep3: string;
  webhookSecretPlaceholder: string;
  webhookWarning: string;
  toastId: string;
  disconnectConfirm: string;
  connectedToast: string;
  connectErrorToast: string;
  disconnectedToast: string;
  onConnect: (organizationId: string, credential: string) => Promise<IIntegration>;
  onSync: (organizationId: string, integrationId: string) => Promise<{ jobId: string }>;
}
