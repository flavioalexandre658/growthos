import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const deadLetterEvents = pgTable(
  "dead_letter_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    errorMessage: text("error_message").notNull(),
    attempts: integer("attempts").notNull().default(0),
    firstFailedAt: timestamp("first_failed_at").notNull().defaultNow(),
    lastFailedAt: timestamp("last_failed_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("dead_letter_events_org_created_idx").on(table.organizationId, table.createdAt),
  ]
);
