import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(),
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    avatarUrl: text("avatar_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customers_org_customer_idx").on(table.organizationId, table.customerId),
    index("customers_org_email_idx").on(table.organizationId, table.email),
    index("customers_org_last_seen_idx").on(table.organizationId, table.lastSeenAt),
  ]
);
