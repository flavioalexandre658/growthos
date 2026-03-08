import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./user.schema";
import { organizations } from "./organization.schema";

export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    emailId: text("email_id").notNull(),
    segment: text("segment").notNull(),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
    metadata: jsonb("metadata"),
  },
  (table) => [
    uniqueIndex("email_logs_user_org_email_idx").on(
      table.userId,
      table.organizationId,
      table.emailId,
    ),
  ],
);
