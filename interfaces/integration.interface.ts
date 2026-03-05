export type IntegrationProvider = "stripe";

export type IntegrationStatus = "active" | "error" | "disconnected";

export interface IIntegration {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  providerAccountId: string | null;
  lastSyncedAt: Date | null;
  historySyncedAt: Date | null;
  syncError: string | null;
  hasWebhookSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConnectStripeInput {
  organizationId: string;
  rawKey: string;
}

export interface ISaveWebhookSecretInput {
  integrationId: string;
  webhookSecret: string;
}
