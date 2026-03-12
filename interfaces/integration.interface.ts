export type IntegrationProvider = "stripe" | "asaas";

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
  syncJobId: string | null;
  hasWebhookSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConnectStripeInput {
  organizationId: string;
  rawKey: string;
}

export interface IConnectAsaasInput {
  organizationId: string;
  apiKey: string;
}

export interface ISaveWebhookSecretInput {
  integrationId: string;
  webhookSecret: string;
}
