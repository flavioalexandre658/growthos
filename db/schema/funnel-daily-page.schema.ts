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

export const funnelDailyPages = pgTable(
  "funnel_daily_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    eventType: text("event_type").notNull(),
    entryPage: text("entry_page").notNull().default(""),
    total: integer("total").notNull().default(0),
    uniqueSessions: integer("unique_sessions").notNull().default(0),
    valueInCents: integer("value_in_cents").notNull().default(0),
  },
  (table) => [
    uniqueIndex("funnel_daily_pages_unique_idx").on(
      table.organizationId,
      table.date,
      table.eventType,
      table.entryPage
    ),
    index("funnel_daily_pages_org_date_idx").on(
      table.organizationId,
      table.date
    ),
  ]
);
