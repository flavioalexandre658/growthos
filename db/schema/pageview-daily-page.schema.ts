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

export const pageviewDailyPages = pgTable(
  "pageview_daily_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    landingPage: text("landing_page").notNull().default(""),
    sessions: integer("sessions").notNull().default(0),
    pageviews: integer("pageviews").notNull().default(0),
  },
  (table) => [
    uniqueIndex("pv_daily_pages_unique_idx").on(
      table.organizationId,
      table.date,
      table.landingPage
    ),
    index("pv_daily_pages_org_date_idx").on(table.organizationId, table.date),
  ]
);
