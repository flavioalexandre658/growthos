import { pgTable, uuid, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";
import { users } from "./user.schema";

export const usageMonthly = pgTable(
  "usage_monthly",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    eventsCount: integer("events_count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("usage_monthly_user_org_month_idx").on(
      table.userId,
      table.organizationId,
      table.yearMonth,
    ),
    index("usage_monthly_user_month_idx").on(table.userId, table.yearMonth),
  ],
);
