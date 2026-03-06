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

export const pageviewDailySessions = pgTable(
  "pageview_daily_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    source: text("source").notNull().default(""),
    medium: text("medium").notNull().default(""),
    campaign: text("campaign").notNull().default(""),
    content: text("content").notNull().default(""),
    device: text("device").notNull().default(""),
    entryPage: text("entry_page").notNull().default(""),
    referrer: text("referrer").notNull().default(""),
    sessions: integer("sessions").notNull().default(0),
    pageviews: integer("pageviews").notNull().default(0),
  },
  (table) => [
    uniqueIndex("pv_daily_sess_unique_idx").on(
      table.organizationId,
      table.date,
      table.source,
      table.medium,
      table.campaign,
      table.content,
      table.device,
      table.entryPage,
      table.referrer
    ),
    index("pv_daily_sess_org_date_idx").on(table.organizationId, table.date),
  ]
);
