import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").notNull().unique(),
    customerId: text("customer_id").notNull(),
    planId: text("plan_id").notNull(),
    planName: text("plan_name").notNull(),
    status: text("status", {
      enum: ["active", "canceled", "past_due", "trialing"],
    })
      .notNull()
      .default("active"),
    valueInCents: integer("value_in_cents").notNull(),
    billingInterval: text("billing_interval", {
      enum: ["monthly", "yearly", "weekly"],
    }).notNull(),
    startedAt: timestamp("started_at").notNull(),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("subscriptions_org_status_idx").on(table.organizationId, table.status),
  ]
);
