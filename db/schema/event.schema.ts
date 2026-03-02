import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),

    grossValueInCents: integer("gross_value_in_cents"),
    netValueInCents: integer("net_value_in_cents"),
    discountInCents: integer("discount_in_cents"),
    gatewayFeeInCents: integer("gateway_fee_in_cents"),
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
    referrer: text("referrer"),

    device: text("device"),
    customerType: text("customer_type"),
    customerId: text("customer_id"),
    sessionId: text("session_id"),

    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("events_org_type_created_idx").on(
      table.organizationId,
      table.eventType,
      table.createdAt
    ),
    index("events_org_created_idx").on(table.organizationId, table.createdAt),
  ]
);
