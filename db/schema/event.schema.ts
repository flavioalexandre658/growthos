import { pgTable, uuid, text, integer, real, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),

    currency: text("currency").notNull().default("BRL"),
    baseCurrency: text("base_currency").notNull().default("BRL"),
    exchangeRate: real("exchange_rate").notNull().default(1),

    grossValueInCents: integer("gross_value_in_cents"),
    baseGrossValueInCents: integer("base_gross_value_in_cents"),
    baseNetValueInCents: integer("base_net_value_in_cents"),
    discountInCents: integer("discount_in_cents"),
    installments: integer("installments"),
    paymentMethod: text("payment_method"),

    productId: text("product_id"),
    productName: text("product_name"),
    category: text("category"),

    source: text("source"),
    medium: text("medium"),
    rawSource: text("raw_source"),
    rawMedium: text("raw_medium"),
    campaign: text("campaign"),
    content: text("content"),
    term: text("term"),
    clickId: text("click_id"),
    clickIdType: text("click_id_type"),
    landingPage: text("landing_page"),
    entryPage: text("entry_page"),
    referrer: text("referrer"),

    device: text("device"),
    customerType: text("customer_type"),
    customerId: text("customer_id"),
    sessionId: text("session_id"),

    billingType: text("billing_type"),
    billingReason: text("billing_reason"),
    billingInterval: text("billing_interval"),
    subscriptionId: text("subscription_id"),
    planId: text("plan_id"),
    planName: text("plan_name"),

    provider: text("provider"),

    metadata: jsonb("metadata"),
    eventHash: text("event_hash"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("events_org_type_created_idx").on(
      table.organizationId,
      table.eventType,
      table.createdAt
    ),
    index("events_org_created_idx").on(table.organizationId, table.createdAt),
    uniqueIndex("events_hash_unique_idx").on(table.organizationId, table.eventHash),
    index("events_org_source_created_idx").on(
      table.organizationId,
      table.source,
      table.createdAt
    ),
    index("events_org_session_idx").on(table.organizationId, table.sessionId),
    index("events_org_click_id_idx").on(table.organizationId, table.clickId),
  ]
);
