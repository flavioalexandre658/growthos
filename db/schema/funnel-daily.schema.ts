import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const funnelDaily = pgTable(
  "funnel_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    eventType: text("event_type").notNull(),
    source: text("source").notNull().default(""),
    medium: text("medium").notNull().default(""),
    device: text("device").notNull().default(""),
    total: integer("total").notNull().default(0),
    uniqueSessions: integer("unique_sessions").notNull().default(0),
    valueInCents: integer("value_in_cents").notNull().default(0),
  },
  (table) => [
    uniqueIndex("funnel_daily_unique_idx").on(
      table.organizationId,
      table.date,
      table.eventType,
      table.source,
      table.medium,
      table.device
    ),
    index("funnel_daily_org_date_idx").on(table.organizationId, table.date),
  ]
);
