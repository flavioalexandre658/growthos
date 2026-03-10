import { pgTable, uuid, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const marketingSpends = pgTable("marketing_spends", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  sourceLabel: text("source_label").notNull(),
  amountInCents: integer("amount_in_cents").notNull(),
  spentAt: date("spent_at").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
