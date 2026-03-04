import { pgTable, uuid, text, real, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export type AlertType = "no_events" | "churn_rate" | "revenue_drop";

export const alertConfigs = pgTable("alert_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["no_events", "churn_rate", "revenue_drop"],
  })
    .notNull()
    .$type<AlertType>(),
  threshold: real("threshold").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  channelEmail: boolean("channel_email").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
},
(table) => [
  uniqueIndex("alert_configs_org_type_idx").on(
    table.organizationId,
    table.type,
  ),
]);
