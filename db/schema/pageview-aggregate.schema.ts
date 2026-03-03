import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
  date,
} from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const pageviewAggregates = pgTable(
  "pageview_aggregates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    sessionId: text("session_id").notNull(),
    landingPage: text("landing_page"),
    entryPage: text("entry_page"),
    source: text("source"),
    medium: text("medium"),
    campaign: text("campaign"),
    content: text("content"),
    device: text("device"),
    referrer: text("referrer"),
    pageviews: integer("pageviews").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("pv_agg_unique_idx").on(
      table.organizationId,
      table.date,
      table.sessionId,
      table.landingPage
    ),
    index("pv_agg_org_date_idx").on(table.organizationId, table.date),
  ]
);
