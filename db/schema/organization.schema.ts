import { pgTable, uuid, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export interface IFunnelStepConfig {
  eventType: string;
  label: string;
  countUnique?: boolean;
  hidden?: boolean;
}

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  funnelSteps: jsonb("funnel_steps")
    .$type<IFunnelStepConfig[]>()
    .notNull()
    .default([
      { eventType: "signup", label: "Cadastros" },
      { eventType: "payment", label: "Pagamentos" },
    ]),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  hasRecurringRevenue: boolean("has_recurring_revenue").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
