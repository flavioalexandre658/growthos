export type IntegrationProvider =
  | "stripe"
  | "asaas"
  | "kiwify"
  | "hotmart"
  | "mercadopago"
  | "pagarme";

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

export interface IConnectKiwifyInput {
  organizationId: string;
  clientId: string;
  clientSecret: string;
  accountId: string;
}

export interface IConnectHotmartInput {
  organizationId: string;
  clientId: string;
  clientSecret: string;
}

export interface IConnectMercadoPagoInput {
  organizationId: string;
  accessToken: string;
}

export interface IConnectPagarmeInput {
  organizationId: string;
  secretKey: string;
}

export interface ISaveWebhookSecretInput {
  integrationId: string;
  webhookSecret: string;
}
