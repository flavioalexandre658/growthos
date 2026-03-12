import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export type NotificationType =
  | "purchase"
  | "renewal"
  | "refund"
  | "alert_no_events"
  | "alert_churn_rate"
  | "alert_revenue_drop"
  | "milestone"
  | "email_sequence"
  | "weekly_digest"
  | "recommendation"
  | "sync";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "purchase",
        "renewal",
        "refund",
        "alert_no_events",
        "alert_churn_rate",
        "alert_revenue_drop",
        "milestone",
        "email_sequence",
        "weekly_digest",
        "recommendation",
        "sync",
      ],
    })
      .notNull()
      .$type<NotificationType>(),
    title: text("title").notNull(),
    body: text("body"),
    linkUrl: text("link_url"),
    metadata: jsonb("metadata"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("notifications_org_read_created_idx").on(
      table.organizationId,
      table.isRead,
      table.createdAt,
    ),
    index("notifications_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);
