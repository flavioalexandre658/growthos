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
    campaign: text("campaign"),
    content: text("content"),
    landingPage: text("landing_page"),
    entryPage: text("entry_page"),
    referrer: text("referrer"),

    device: text("device"),
    customerType: text("customer_type"),
    customerId: text("customer_id"),
    sessionId: text("session_id"),

    billingType: text("billing_type"),
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
  ]
);
