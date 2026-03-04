import { pgTable, uuid, text, real, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rate: real("rate").notNull(),
    effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("exchange_rates_org_pair_date_idx").on(
      table.organizationId,
      table.fromCurrency,
      table.toCurrency,
      table.effectiveFrom,
    ),
  ],
);
