import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export interface IIntegrationMeta {
  webhookSecret?: string;
  oauthAccessToken?: string;
  oauthTokenExpiresAt?: number;
  [key: string]: unknown;
}

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    provider: text("provider", {
      enum: ["stripe", "asaas", "kiwify", "hotmart", "mercadopago", "pagarme"],
    }).notNull(),

    accessToken: text("access_token").notNull(),

    status: text("status", {
      enum: ["active", "error", "disconnected"],
    })
      .notNull()
      .default("active"),

    lastSyncedAt: timestamp("last_synced_at"),
    historySyncedAt: timestamp("history_synced_at"),
    syncError: text("sync_error"),
    syncJobId: text("sync_job_id"),

    providerAccountId: text("provider_account_id"),
    providerMeta: jsonb("provider_meta").$type<IIntegrationMeta>(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("integrations_org_provider_idx").on(
      table.organizationId,
      table.provider,
    ),
  ],
);
