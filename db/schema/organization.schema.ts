import { pgTable, uuid, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export interface IFunnelStepConfig {
  eventType: string;
  label: string;
  countUnique?: boolean;
  hidden?: boolean;
}

export interface IAiProfileConfig {
  segment?: string;
  model?: string;
  taxRegime?: string;
  monthlyGoal?: number;
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
      { eventType: "purchase", label: "Compras" },
    ]),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  currency: text("currency").notNull().default("BRL"),
  locale: text("locale").notNull().default("pt-BR"),
  country: text("country").notNull().default("BR"),
  language: text("language").notNull().default("pt-BR"),
  hasRecurringRevenue: boolean("has_recurring_revenue").notNull().default(false),
  aiProfile: jsonb("ai_profile").$type<IAiProfileConfig>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
