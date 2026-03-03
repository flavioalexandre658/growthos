import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const fixedCosts = pgTable("fixed_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amountInCents: integer("amount_in_cents").notNull(),
  type: text("type", { enum: ["VALUE", "PERCENTAGE"] })
    .notNull()
    .default("VALUE"),
  frequency: text("frequency", {
    enum: ["monthly", "quarterly", "semiannual", "annual"],
  })
    .notNull()
    .default("monthly"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const variableCosts = pgTable("variable_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amountInCents: integer("amount_in_cents").notNull(),
  type: text("type", { enum: ["VALUE", "PERCENTAGE"] })
    .notNull()
    .default("PERCENTAGE"),
  applyTo: text("apply_to", {
    enum: ["all", "payment_method", "billing_type", "category"],
  })
    .notNull()
    .default("all"),
  applyToValue: text("apply_to_value"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
